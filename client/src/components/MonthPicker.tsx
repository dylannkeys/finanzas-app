import { currentMonth, monthLabel, shiftMonth } from "../format";

interface MonthPickerProps {
  value: string;
  onChange: (month: string) => void;
}

export default function MonthPicker({ value, onChange }: MonthPickerProps) {
  const isCurrent = value >= currentMonth();
  return (
    <div className="month-picker" role="group" aria-label="Mes">
      <button className="icon-button" onClick={() => onChange(shiftMonth(value, -1))} aria-label="Mes anterior">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="month-label">{monthLabel(value)}</span>
      <button
        className="icon-button"
        onClick={() => onChange(shiftMonth(value, 1))}
        disabled={isCurrent}
        aria-label="Mes siguiente"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}
