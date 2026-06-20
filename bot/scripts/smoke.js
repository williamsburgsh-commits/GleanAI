// Smoke test: validates that the bot wires up without needing a live Telegram
// connection or a real Supabase service key. It stubs the required env vars,
// imports every module, builds the bot, and asserts the expected commands are
// registered. Run with: npm run smoke --workspace bot
process.env.TELEGRAM_BOT_TOKEN ||= '123456:TEST_TOKEN_FOR_SMOKE';
process.env.SUPABASE_URL ||= 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key';

const { buildBot, COMMAND_DESCRIPTIONS } = await import('../src/bot.js');

const bot = buildBot();

if (!bot) {
  console.error('SMOKE FAIL: buildBot() returned nothing');
  process.exit(1);
}

const expected = ['start', 'quests', 'points', 'leaderboard', 'referral'];
const got = COMMAND_DESCRIPTIONS.map((c) => c.command);
const missing = expected.filter((c) => !got.includes(c));

if (missing.length > 0) {
  console.error('SMOKE FAIL: missing commands:', missing.join(', '));
  process.exit(1);
}

console.log('SMOKE OK: bot built; commands =', got.join(', '));
process.exit(0);
