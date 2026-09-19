import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { WishIndex } from '@nebo/shared';
import { fetchIndex, LockedError } from './api.ts';
import { Locked } from '../pages/Locked.tsx';
import { CenterMessage } from '../components/CenterMessage.tsx';

const Ctx = createContext<WishIndex | null>(null);
export const useIndex = (): WishIndex => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useIndex outside gate');
  return v;
};

type State = { s: 'loading' } | { s: 'locked' } | { s: 'error' } | { s: 'ready'; index: WishIndex };

/** Перевіряє сесію й вантажить індекс дат одним запитом; без сесії показує екран «замкнено». */
export const Gate = ({ children }: { children: ReactNode }) => {
  const [st, setSt] = useState<State>({ s: 'loading' });
  const last = useRef(0);

  const load = useCallback(async () => {
    try {
      const index = await fetchIndex();
      last.current = Date.now();
      setSt({ s: 'ready', index });
    } catch (e) {
      setSt((cur) => (cur.s === 'ready' && !(e instanceof LockedError) ? cur : e instanceof LockedError ? { s: 'locked' } : { s: 'error' }));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // підтягуємо нові побажання, коли сторінку знову відкривають після паузи
  useEffect(() => {
    const h = () => { if (document.visibilityState === 'visible' && Date.now() - last.current > 5 * 60_000) void load(); };
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }, [load]);

  if (st.s === 'loading') return <CenterMessage loading />;
  if (st.s === 'locked') return <Locked />;
  if (st.s === 'error') return <CenterMessage title="Небо тимчасово сховалося" text="Не вдалося завантажити. Спробуй ще раз трохи згодом." action={{ label: 'Спробувати ще раз', onClick: () => { setSt({ s: 'loading' }); void load(); } }} />;
  return <Ctx.Provider value={st.index}>{children}</Ctx.Provider>;
};
