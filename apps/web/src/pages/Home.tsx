import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatFull, plural, type WishType } from '@nebo/shared';
import { useIndex } from '../lib/IndexContext.tsx';
import { useTheme } from '../lib/hooks.ts';
import { Birds, Clouds, genClouds, Motes, NightSky, RisingSun, useDensity } from '../components/skies.tsx';
import { useSkyWidth } from '../lib/viewport.ts';
import { IconForward, IconMoon, IconShuffle, IconSun } from '../components/glyphs.tsx';

const wishes = (n: number) => `${n} ${plural(n, 'побажання', 'побажання', 'побажань')}`;

const DawnScene = () => {
  const d = useDensity();
  const W = useSkyWidth();
  const clouds = useMemo(() => genClouds(21, 270, 6, 60, W), [W]);
  return (
    <svg viewBox={`0 0 ${W} 386`} preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <Clouds items={clouds} W={W} />
      <RisingSun cx={Math.round(W * 0.769)} cy={346} r={64} glow={150} ray="#FFD89A" core="#FFE2A6" halo="#FFE8B8" ringK={0.94} />
      <Birds seed={4} n={Math.round(4 * d) || 1} y0={96} y1={128} color="#5E3550" W={W} />
      <Motes seed={9} n={Math.round(12 * d)} y0={120} y1={360} W={W} />
    </svg>
  );
};

export const Home = () => {
  const idx = useIndex();
  const navigate = useNavigate();
  useTheme('night');

  const random = () => {
    const pool: [WishType, string][] = [
      ...idx.night.map((d) => ['night', d] as [WishType, string]),
      ...idx.morning.map((d) => ['morning', d] as [WishType, string]),
    ];
    if (!pool.length) return;
    const [t, d] = pool[Math.floor(Math.random() * pool.length)];
    navigate(`/${t}/${d}`, { viewTransition: true });
  };

  return (
    <div className="home-root theme-night">
      <div className="home-night" aria-hidden="true">
        <NightSky seed={17} stars={80} moon shoots={4} align="xMidYMin" />
      </div>
      <div className="home-dawn" aria-hidden="true">
        <svg className="home-wave" viewBox="0 0 390 48" preserveAspectRatio="none" focusable="false">
          <path d="M0 0H390V22C340 2 310 0 230 20C150 40 70 0 0 24Z" fill="#2E2658" />
          <path d="M0 24C70 0 150 40 230 20C310 0 340 2 390 22" fill="none" stroke="#FFE3B0" strokeWidth="1.5" opacity="0.7" />
        </svg>
        <DawnScene />
      </div>

      <div className="stage home">
      <header className="home-title up" style={{ animationDelay: '0.2s' }}>
        {idx.start && <div className="eyebrow">з {formatFull(idx.start)}</div>}
        <h1>Небо наших<br />побажань</h1>
      </header>

      <Link to="/night" viewTransition className="home-card home-card-night up press" style={{ animationDelay: '0.5s' }}>
        <div className="card-kicker"><IconMoon size={14} filled />Ночі</div>
        <div className="card-title">Добраніч</div>
        <div className="card-row">
          <div className="card-count">{wishes(idx.night.length)} під зорями</div>
          <span className="card-go"><IconForward /></span>
        </div>
      </Link>

      <div className="home-random">
        <button type="button" className="pill-btn press up" style={{ animationDelay: '1s' }} onClick={random} disabled={!idx.night.length && !idx.morning.length}>
          <IconShuffle />Згадати навмання
        </button>
      </div>

      <Link to="/morning" viewTransition className="home-card home-card-morning up press" style={{ animationDelay: '0.75s' }}>
        <div className="card-kicker"><IconSun size={14} />Ранки</div>
        <div className="card-title">Добрий ранок</div>
        <div className="card-row">
          <div className="card-count">{wishes(idx.morning.length)} на світанку</div>
          <span className="card-go"><IconForward /></span>
        </div>
      </Link>
      </div>
    </div>
  );
};
