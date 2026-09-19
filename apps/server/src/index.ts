import { loadConfig } from './config.ts';
import { WishStore } from './store.ts';
import { KeyStore } from './auth.ts';
import { buildApp } from './app.ts';
import { startBot } from './bot.ts';

const cfg = loadConfig();
const store = new WishStore(cfg.dataDir);
const keys = new KeyStore(cfg.dataDir);
await Promise.all([store.load(), keys.load()]);

const app = await buildApp(cfg, store, keys);
await app.listen({ port: cfg.port, host: '0.0.0.0' });

if (cfg.botToken && cfg.adminId) {
  await startBot(cfg, store, keys, app.log);
} else {
  app.log.warn('BOT_TOKEN / ADMIN_TELEGRAM_ID не задано — бот вимкнено');
}

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => { void app.close().then(() => process.exit(0)); });
}
