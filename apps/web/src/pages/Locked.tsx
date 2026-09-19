import { CenterMessage } from '../components/CenterMessage.tsx';

/** Показується без сесії: сайт не відкриваємо без особистого посилання. */
export const Locked = () => {
  const bad = typeof location !== 'undefined' && new URLSearchParams(location.search).has('bad');
  return bad ? (
    <CenterMessage title="Це посилання більше не діє" text="Напиши мені — я надішлю нове, і воно відкриється одним дотиком." />
  ) : (
    <CenterMessage title="Це небо — лише для тебе" text="Відкрий його за особистим посиланням, яке я тобі надіслав." />
  );
};
