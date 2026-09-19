import { Bot, InlineKeyboard, type Context } from 'grammy';
import {
  addDays, effectiveNightDate, formatFull, isIsoDate, normalizeText, parseTypeToken, parseUserDate,
  todayKyiv, type WishType,
} from '@nebo/shared';
import type { Config } from './config.ts';
import type { WishStore } from './store.ts';
import type { KeyStore } from './auth.ts';

const ICON: Record<WishType, string> = { night: '🌙', morning: '☀️' };
const NAME: Record<WishType, string> = { night: 'Добраніч', morning: 'Добрий ранок' };
const defaultDate = (t: WishType) => (t === 'night' ? effectiveNightDate() : todayKyiv());

/** Що бот зараз чекає від адміна. Один адмін → один стан, in-memory. */
type State =
  | { kind: 'draft'; text: string }                                  // прийшов текст, чекаємо вибору категорії
  | { kind: 'pickType'; text: string }                               // «інша дата» → яка категорія
  | { kind: 'askDate'; text: string; type: WishType }                // чекаємо дату текстом
  | { kind: 'target'; type: WishType; date: string }                 // /gn, /gm, «Змінити»: наступний текст піде сюди
  | { kind: 'confirm'; type: WishType; date: string; text: string }  // чекаємо підтвердження перезапису
  | null;

const HELP = `Просто надішли текст побажання — я запитаю, ніч це чи ранок.

/gn [дата] — наступний текст піде як добраніч
/gm [дата] — наступний текст піде як добрий ранок
/get gn|gm дата — показати, змінити або видалити
/del gn|gm дата — видалити
/gaps — дні без побажань
/stats — статистика
/link [підпис] — нове посилання для Ксюші
/links — усі посилання
/revoke id — відкликати посилання
/cancel — скасувати поточну дію

Дата: 2026-09-19, 19.09, 19.09.2026, сьогодні, вчора.
Для ночі до 05:00 «сьогодні» = попередній день.`;

const trunc = (s: string, n = 3500) => (s.length > n ? s.slice(0, n) + '…' : s);

export const startBot = async (
  cfg: Config, store: WishStore, keys: KeyStore, log: { info: (m: string) => void; error: (e: unknown) => void },
): Promise<Bot> => {
  const bot = new Bot(cfg.botToken!);
  let state: State = null;

  // Лише адмін; усім іншим — тиша.
  bot.use(async (ctx, next) => {
    if (ctx.from?.id !== cfg.adminId) return;
    await next();
  });

  const save = async (ctx: Context, type: WishType, date: string, text: string, force = false) => {
    if (!force && store.has(type, date)) {
      const old = await store.get(type, date);
      state = { kind: 'confirm', type, date, text };
      await ctx.reply(
        `${ICON[type]} ${formatFull(date)} вже є:\n\n${trunc(old?.text ?? '', 1500)}\n\nПерезаписати новим?`,
        { reply_markup: new InlineKeyboard().text('✅ Перезаписати', 'ow:yes').text('✖️ Скасувати', 'ow:no') },
      );
      return;
    }
    const existed = await store.set(type, date, text);
    state = null;
    await ctx.reply(`${existed ? '✏️ Оновлено' : '✅ Збережено'}: ${ICON[type]} ${NAME[type]}, ${formatFull(date)}`);
  };

  bot.command(['start', 'help'], (ctx) => ctx.reply(HELP));
  bot.command('cancel', async (ctx) => { state = null; await ctx.reply('Скасовано.'); });

  for (const [cmd, type] of [['gn', 'night'], ['gm', 'morning']] as const) {
    bot.command(cmd, async (ctx) => {
      const arg = ctx.match.trim();
      const date = arg ? parseUserDate(arg, defaultDate(type)) : defaultDate(type);
      if (!date) return void ctx.reply('Не розумію дату. Приклад: 2026-09-19, 19.09, вчора.');
      state = { kind: 'target', type, date };
      await ctx.reply(`${ICON[type]} Чекаю текст: ${NAME[type]}, ${formatFull(date)}. (/cancel — скасувати)`);
    });
  }

  const parseKey = (match: string): { type: WishType; date: string } | string => {
    const [t, d] = match.trim().split(/\s+/);
    const type = parseTypeToken(t);
    if (!type) return 'Вкажи категорію: gn або gm.';
    const date = parseUserDate(d ?? 'сьогодні', defaultDate(type));
    return date ? { type, date } : 'Не розумію дату.';
  };

  bot.command('get', async (ctx) => {
    const k = parseKey(ctx.match);
    if (typeof k === 'string') return void ctx.reply(`${k}\nПриклад: /get gn 2026-09-19`);
    const w = await store.get(k.type, k.date);
    if (!w) return void ctx.reply(`${ICON[k.type]} ${formatFull(k.date)}: побажання немає.`);
    await ctx.reply(`${ICON[k.type]} ${NAME[k.type]}, ${formatFull(k.date)}\n\n${trunc(w.text)}`, {
      reply_markup: new InlineKeyboard().text('✏️ Змінити', `ed:${k.type}:${k.date}`).text('🗑 Видалити', `dl:${k.type}:${k.date}`),
    });
  });

  bot.command('del', async (ctx) => {
    const k = parseKey(ctx.match);
    if (typeof k === 'string') return void ctx.reply(`${k}\nПриклад: /del gn 2026-09-19`);
    if (!store.has(k.type, k.date)) return void ctx.reply('Такого побажання немає.');
    await ctx.reply(`Видалити ${ICON[k.type]} ${formatFull(k.date)}?`, {
      reply_markup: new InlineKeyboard().text('🗑 Так, видалити', `dly:${k.type}:${k.date}`).text('✖️ Ні', 'ow:no'),
    });
  });

  bot.command('gaps', async (ctx) => {
    const idx = store.index();
    if (!idx.start) return void ctx.reply('Ще немає жодного побажання.');
    const lines: string[] = [];
    for (const t of ['morning', 'night'] as const) {
      const have = new Set(idx[t]);
      const end = defaultDate(t);
      const miss: string[] = [];
      for (let d = idx.start; d <= end; d = addDays(d, 1)) if (!have.has(d)) miss.push(d);
      lines.push(`${ICON[t]} ${NAME[t]} — пропущено ${miss.length}${miss.length ? ':\n' + miss.slice(-30).join(', ') : ''}`);
      if (miss.length > 30) lines.push(`(показано останні 30)`);
    }
    await ctx.reply(lines.join('\n\n'));
  });

  bot.command('stats', async (ctx) => {
    const i = store.index();
    await ctx.reply(`🌙 ночей: ${i.night.length}\n☀️ ранків: ${i.morning.length}\nз ${i.start ? formatFull(i.start) : '—'}`);
  });

  bot.command('link', async (ctx) => {
    const { id, key } = await keys.create(ctx.match.trim());
    await ctx.reply(`Нове посилання (id ${id}). Надішли його Ксюші — воно працює на одному пристрої й запамʼятовується на рік:\n\n${cfg.publicUrl}/unlock?k=${key}\n\nВідкликати: /revoke ${id}`, {
      link_preview_options: { is_disabled: true },
    });
  });

  bot.command('links', async (ctx) => {
    const list = keys.list();
    if (!list.length) return void ctx.reply('Посилань ще немає. /link');
    await ctx.reply(list.map((k) =>
      `${k.revokedAt ? '⛔️' : '🟢'} ${k.id} — ${k.label}\n   створено ${k.createdAt.slice(0, 10)}, востаннє ${k.lastUsedAt?.slice(0, 10) ?? 'ніколи'}`).join('\n'));
  });

  bot.command('revoke', async (ctx) => {
    const id = ctx.match.trim();
    await ctx.reply((await keys.revoke(id)) ? `⛔️ ${id} відкликано. Пристрої з цим ключем більше не мають доступу.` : 'Такого активного посилання немає.');
  });

  // Кнопки
  bot.callbackQuery('ow:no', async (ctx) => { state = null; await ctx.answerCallbackQuery('Скасовано'); await ctx.editMessageReplyMarkup(); });

  bot.callbackQuery('ow:yes', async (ctx) => {
    await ctx.answerCallbackQuery();
    if (state?.kind !== 'confirm') return void ctx.editMessageReplyMarkup();
    const s = state;
    await ctx.editMessageReplyMarkup();
    await save(ctx, s.type, s.date, s.text, true);
  });

  bot.callbackQuery(/^d:(night|morning)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    if (state?.kind !== 'draft') return void ctx.reply('Надішли текст ще раз.');
    const type = ctx.match[1] as WishType;
    const { text } = state;
    await ctx.editMessageReplyMarkup();
    await save(ctx, type, defaultDate(type), text);
  });

  bot.callbackQuery('d:other', async (ctx) => {
    await ctx.answerCallbackQuery();
    if (state?.kind !== 'draft') return void ctx.reply('Надішли текст ще раз.');
    state = { kind: 'pickType', text: state.text };
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard().text('🌙 Ніч', 't:night').text('☀️ Ранок', 't:morning') });
  });

  bot.callbackQuery(/^t:(night|morning)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    if (state?.kind !== 'pickType') return void ctx.reply('Надішли текст ще раз.');
    const type = ctx.match[1] as WishType;
    state = { kind: 'askDate', text: state.text, type };
    await ctx.editMessageReplyMarkup();
    await ctx.reply(`${ICON[type]} На яку дату? (2026-09-19, 19.09, вчора)`);
  });

  bot.callbackQuery(/^ed:(night|morning):(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    state = { kind: 'target', type: ctx.match[1] as WishType, date: ctx.match[2] };
    await ctx.reply('Надішли новий текст — він замінить поточний. (/cancel — скасувати)');
  });

  bot.callbackQuery(/^dl:(night|morning):(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(`Видалити ${ICON[ctx.match[1] as WishType]} ${formatFull(ctx.match[2])}?`, {
      reply_markup: new InlineKeyboard().text('🗑 Так, видалити', `dly:${ctx.match[1]}:${ctx.match[2]}`).text('✖️ Ні', 'ow:no'),
    });
  });

  bot.callbackQuery(/^dly:(night|morning):(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
    const [, type, date] = ctx.match as unknown as [string, WishType, string];
    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup();
    await ctx.reply((await store.delete(type, date)) ? `🗑 Видалено: ${ICON[type]} ${formatFull(date)}` : 'Вже видалено.');
  });

  // Текст
  bot.on('message:text', async (ctx) => {
    const text = normalizeText(ctx.message.text);
    if (!text) return;

    if (state?.kind === 'askDate') {
      const date = parseUserDate(text, defaultDate(state.type));
      if (!date) return void ctx.reply('Не розумію дату. Приклад: 2026-09-19, 19.09, вчора. (/cancel)');
      const s = state;
      return save(ctx, s.type, date, s.text);
    }
    if (state?.kind === 'target') {
      const s = state;
      // «Змінити» і /gnДата — явний намір, але якщо це /gn на існуючу дату, все одно питаємо
      return save(ctx, s.type, s.date, text, false);
    }

    state = { kind: 'draft', text };
    const nd = defaultDate('night');
    const md = defaultDate('morning');
    await ctx.reply(`Куди зберегти?\n(ніч → ${formatFull(nd)}, ранок → ${formatFull(md)})`, {
      reply_markup: new InlineKeyboard().text('🌙 Ніч', 'd:night').text('☀️ Ранок', 'd:morning').row().text('📅 Інша дата', 'd:other'),
    });
  });

  bot.catch((e) => log.error(e.error));
  // long polling; не блокуємо запуск сервера
  void bot.start({ onStart: (me) => log.info(`бот @${me.username} запущено`), drop_pending_updates: false });
  return bot;
};
