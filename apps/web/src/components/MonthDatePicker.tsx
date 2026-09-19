import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { countLabel, formatDate, formatShort, monthKey as getMonthKey, monthName, type WishType } from '@nebo/shared';
import { useIndex } from '../lib/IndexContext.tsx';
import { IconClose } from './glyphs.tsx';

interface MonthDatePickerProps {
  type: WishType;
  monthKey: string;
  currentDate?: string;
  isOpen: boolean;
  onClose: () => void;
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

export const MonthDatePicker = ({ type, monthKey, currentDate, isOpen, onClose }: MonthDatePickerProps) => {
  const idx = useIndex();
  const nav = useNavigate();

  const allDates = idx[type];
  const monthDates = useMemo(
    () => allDates.filter((d) => getMonthKey(d) === monthKey),
    [allDates, monthKey],
  );

  const datesSet = useMemo(() => new Set(monthDates), [monthDates]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !monthKey || !monthDates.length) return null;

  const firstDate = monthDates[0];
  const lastDate = monthDates[monthDates.length - 1];
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startDay = (new Date(year, monthIndex, 1).getDay() + 6) % 7;

  const selectDate = (date: string) => {
    onClose();
    nav(`/${type}/${date}`, { viewTransition: true });
  };

  return (
    <div className={`date-picker-backdrop theme-${type}`} onClick={onClose}>
      <div
        className="date-picker-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Вибір дати: ${monthName(firstDate)} ${year}`}
      >
        <div className="date-picker-handle" />

        <div className="date-picker-header">
          <div className="date-picker-title-group">
            <h2 className="date-picker-title">{monthName(firstDate)} {year}</h2>
            <div className="date-picker-sub">{countLabel(type, monthDates.length)}</div>
          </div>
          <button type="button" className="circle-btn date-picker-close press" onClick={onClose} aria-label="Закрити">
            <IconClose size={18} />
          </button>
        </div>

        <div className="date-quick-row">
          <button
            type="button"
            className={`date-quick-btn press ${currentDate === firstDate ? 'active' : ''}`}
            onClick={() => selectDate(firstDate)}
          >
            <span>Початок</span>
            <span className="date-quick-sub">{formatShort(firstDate)}</span>
          </button>
          {firstDate !== lastDate && (
            <button
              type="button"
              className={`date-quick-btn press ${currentDate === lastDate ? 'active' : ''}`}
              onClick={() => selectDate(lastDate)}
            >
              <span>Кінець</span>
              <span className="date-quick-sub">{formatShort(lastDate)}</span>
            </button>
          )}
        </div>

        <div className="date-grid-weekdays" aria-hidden="true">
          {WEEKDAYS.map((wd) => (
            <span key={wd} className="date-weekday">{wd}</span>
          ))}
        </div>

        <div className="date-grid" role="grid">
          {Array.from({ length: startDay }).map((_, i) => (
            <span key={`blank-${i}`} className="date-cell blank" aria-hidden="true" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const iso = `${monthKey}-${String(day).padStart(2, '0')}`;
            const hasWish = datesSet.has(iso);
            const isCurrent = iso === currentDate;
            return (
              <button
                key={iso}
                type="button"
                disabled={!hasWish}
                onClick={() => selectDate(iso)}
                className={`date-cell ${hasWish ? 'has-wish' : ''} ${isCurrent ? 'current' : ''}`}
                aria-label={hasWish ? formatDate(iso) : undefined}
                aria-current={isCurrent ? 'date' : undefined}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
