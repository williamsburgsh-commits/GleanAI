-- Track which Solana cluster a receipt was scanned on (cooldown is per wallet + cluster).

alter table public.wallet_receipts
  add column if not exists scanned_cluster text not null default 'devnet';

create index if not exists idx_receipts_wallet_cluster
  on public.wallet_receipts(wallet_address, scanned_cluster);
