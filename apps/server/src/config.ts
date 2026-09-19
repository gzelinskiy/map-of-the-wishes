import path from 'node:path';

export interface Config {
  port: number;
  dataDir: string;
  cookieSecret: string;
  publicUrl: string;
  botToken?: string;
  adminId?: number;
  secureCookie: boolean;
}

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => {
  const cookieSecret = env.COOKIE_SECRET ?? '';
  if (cookieSecret.length < 16) throw new Error('COOKIE_SECRET має бути щонайменше 16 символів');
  const publicUrl = (env.PUBLIC_URL ?? 'http://localhost:5173').replace(/\/$/, '');
  return {
    port: Number(env.PORT ?? 3000),
    dataDir: path.resolve(env.DATA_DIR ?? './data'),
    cookieSecret,
    publicUrl,
    botToken: env.BOT_TOKEN || undefined,
    adminId: env.ADMIN_TELEGRAM_ID ? Number(env.ADMIN_TELEGRAM_ID) : undefined,
    secureCookie: publicUrl.startsWith('https://'),
  };
};
