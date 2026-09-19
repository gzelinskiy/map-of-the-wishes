import { useMemo } from 'react';
import { NightSky } from './skies.tsx';
import { useTheme } from '../lib/hooks.ts';
import { HeroStar } from './glyphs.tsx';

export const CenterMessage = ({ title, text, loading, action }: {
  title?: string; text?: string; loading?: boolean; action?: { label: string; onClick: () => void };
}) => {
  useTheme('night');
  const sky = useMemo(() => <NightSky seed={3} stars={60} shoots={2} />, []);
  return (
    <div className="stage theme-night">
      <div className="sky-fixed">{sky}</div>
      <main className="center-screen" aria-live="polite" aria-busy={loading || undefined}>
        <HeroStar size={loading ? 64 : 80} />
        {title && <h1>{title}</h1>}
        {text && <p>{text}</p>}
        {action && (
          <button type="button" className="pill-btn press" onClick={action.onClick}>{action.label}</button>
        )}
        {loading && <span className="sr-only">Завантаження…</span>}
      </main>
    </div>
  );
};
