use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hashv;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("GmTBUan8sodfqKot1e266kAeVEcWyhGKDPNRfXCuW9ax");

/// Leaf: sha256(index_u64_le || claimant_32 || amount_u64_le)
fn leaf_hash(index: u64, claimant: &Pubkey, amount: u64) -> [u8; 32] {
    let mut buf = [0u8; 8 + 32 + 8];
    buf[0..8].copy_from_slice(&index.to_le_bytes());
    buf[8..40].copy_from_slice(claimant.as_ref());
    buf[40..48].copy_from_slice(&amount.to_le_bytes());
    hashv(&[&buf]).to_bytes()
}

/// Sorted-pair Merkle proof verification (matches merkletreejs sortPairs: true).
fn verify_proof(leaf: [u8; 32], proof: &[[u8; 32]], root: [u8; 32]) -> bool {
    let mut node = leaf;
    for sibling in proof.iter() {
        let (a, b) = if node <= *sibling {
            (node, *sibling)
        } else {
            (*sibling, node)
        };
        node = hashv(&[&a, &b]).to_bytes();
    }
    node == root
}

#[program]
pub mod glean_distributor {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let d = &mut ctx.accounts.distributor;
        d.authority = ctx.accounts.authority.key();
        d.mint = ctx.accounts.mint.key();
        d.vault = ctx.accounts.vault.key();
        d.merkle_root = [0u8; 32];
        d.bump = ctx.bumps.distributor;
        d.vault_bump = ctx.bumps.vault;
        Ok(())
    }

    pub fn set_root(ctx: Context<SetRoot>, root: [u8; 32]) -> Result<()> {
        ctx.accounts.distributor.merkle_root = root;
        Ok(())
    }

    pub fn claim(
        ctx: Context<Claim>,
        index: u64,
        amount: u64,
        proof: Vec<[u8; 32]>,
    ) -> Result<()> {
        require!(amount > 0, DistributorError::ZeroAmount);

        let leaf = leaf_hash(index, &ctx.accounts.claimant.key(), amount);
        require!(
            verify_proof(leaf, &proof, ctx.accounts.distributor.merkle_root),
            DistributorError::InvalidProof
        );

        let claim_status = &mut ctx.accounts.claim_status;
        require!(!claim_status.claimed, DistributorError::AlreadyClaimed);
        claim_status.claimed = true;
        claim_status.index = index;
        claim_status.claimant = ctx.accounts.claimant.key();

        let mint_key = ctx.accounts.distributor.mint;
        let seeds: &[&[u8]] = &[
            b"distributor",
            mint_key.as_ref(),
            &[ctx.accounts.distributor.bump],
        ];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.claimant_ata.to_account_info(),
                    authority: ctx.accounts.distributor.to_account_info(),
                },
                &[seeds],
            ),
            amount,
        )?;

        Ok(())
    }
}

#[account]
pub struct Distributor {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub merkle_root: [u8; 32],
    pub bump: u8,
    pub vault_bump: u8,
}

impl Distributor {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 32 + 1 + 1;
}

#[account]
pub struct ClaimStatus {
    pub claimed: bool,
    pub index: u64,
    pub claimant: Pubkey,
}

impl ClaimStatus {
    pub const LEN: usize = 8 + 1 + 8 + 32;
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        space = Distributor::LEN,
        seeds = [b"distributor", mint.key().as_ref()],
        bump
    )]
    pub distributor: Account<'info, Distributor>,

    #[account(
        init,
        payer = authority,
        token::mint = mint,
        token::authority = distributor,
        seeds = [b"vault", mint.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SetRoot<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"distributor", distributor.mint.as_ref()],
        bump = distributor.bump,
        has_one = authority
    )]
    pub distributor: Account<'info, Distributor>,
}

#[derive(Accounts)]
#[instruction(index: u64)]
pub struct Claim<'info> {
    #[account(mut)]
    pub claimant: Signer<'info>,

    #[account(
        seeds = [b"distributor", distributor.mint.as_ref()],
        bump = distributor.bump,
        has_one = mint,
        has_one = vault
    )]
    pub distributor: Account<'info, Distributor>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"vault", mint.key().as_ref()],
        bump = distributor.vault_bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = claimant,
        associated_token::mint = mint,
        associated_token::authority = claimant
    )]
    pub claimant_ata: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = claimant,
        space = ClaimStatus::LEN,
        seeds = [b"claimed", distributor.key().as_ref(), &index.to_le_bytes()],
        bump
    )]
    pub claim_status: Account<'info, ClaimStatus>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum DistributorError {
    #[msg("Claim amount must be > 0")]
    ZeroAmount,
    #[msg("Invalid Merkle proof")]
    InvalidProof,
    #[msg("Already claimed")]
    AlreadyClaimed,
}
