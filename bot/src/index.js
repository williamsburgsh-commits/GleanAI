import { buildBot, COMMAND_DESCRIPTIONS } from './bot.js';
import { buildMiniAppUrl, isWebAppCapable } from './lib/links.js';

async function main() {
  const bot = buildBot();

  await bot.telegram.setMyCommands(COMMAND_DESCRIPTIONS);

  // Set the persistent menu button to launch the Mini App (HTTPS only).
  if (isWebAppCapable()) {
    try {
      await bot.telegram.setChatMenuButton({
        menuButton: {
          type: 'web_app',
          text: 'Play GleanAI',
          web_app: { url: buildMiniAppUrl() },
        },
      });
      console.log('Mini App menu button set:', buildMiniAppUrl());
    } catch (err) {
      console.warn('Could not set Mini App menu button:', err.message);
    }
  } else {
    console.warn(
      'WEB_APP_URL is not HTTPS; skipping Mini App menu button. ' +
        'Use an ngrok/Vercel HTTPS URL to enable the in-app experience.'
    );
  }

  // Graceful shutdown.
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  await bot.launch();
  console.log('GleanAI bot is running.');
}

main().catch((err) => {
  console.error('Failed to start GleanAI bot:', err);
  process.exit(1);
});
