#!/usr/bin/env tsx
/** Запасний спосіб створити magic-link без бота: tsx scripts/make-key.ts "Ксюша, iPhone" */
import { KeyStore } from '../apps/server/src/auth.ts';
import { loadConfig } from '../apps/server/src/config.ts';

const cfg = loadConfig();
const keys = new KeyStore(cfg.dataDir);
await keys.load();
const { id, key } = await keys.create(process.argv[2] ?? 'cli');
console.log(`id: ${id}\n${cfg.publicUrl}/unlock?k=${key}`);
