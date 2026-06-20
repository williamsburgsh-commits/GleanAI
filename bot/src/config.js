import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in bot/.env (see .env.example).`
    );
  }
  return value.trim();
}

function optional(name, fallback = '') {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : fallback;
}

export const config = {
  telegramBotToken: required('TELEGRAM_BOT_TOKEN'),
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  webAppUrl: optional('WEB_APP_URL', 'http://localhost:3000'),
  adminTelegramIds: optional('ADMIN_TELEGRAM_IDS')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};

export const LEADERBOARD_SIZE = 10;
export const REFERRAL_BONUS_POINTS = 100;
