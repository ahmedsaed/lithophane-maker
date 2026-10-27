'use client';

/** Sidebar form controls, shared by the settings panel and the image Edit dialog. */

export function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="param-group">
      <p className="param-group-title">{title}</p>
      {children}
    </div>
  );
}

export function Slider({
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
  description,
}: {
  label: string;
  unit?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  description?: string;
}) {
  const handleNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
  };

  return (
    <div className="field">
      <div className="field-row">
        <span className="field-label">{label}</span>
        <div className="field-value">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={handleNumber}
          />
          {unit && <span className="field-unit">{unit}</span>}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      {description && <p className="field-desc">{description}</p>}
    </div>
  );
}

export function Toggle({
  label,
  options,
  value,
  onChange,
  description,
}: {
  label: string;
  options: { label: string; value: string | boolean }[];
  value: string | boolean;
  onChange: (v: string | boolean) => void;
  description?: string;
}) {
  return (
    <div className="field">
      <div className="field-row">
        <span className="field-label">{label}</span>
        <div className="toggle">
          {options.map((opt) => (
            <button
              key={String(opt.value)}
              className={value === opt.value ? 'active' : ''}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {description && <p className="field-desc">{description}</p>}
    </div>
  );
}
