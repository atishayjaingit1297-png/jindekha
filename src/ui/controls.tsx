import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { useT } from '../i18n';
import type { IconName } from './Icon';

export function TopBar({ title, onBack, backLabel, children }: { title: string; onBack?: () => void; backLabel?: string; children?: ReactNode }) {
  const t = useT();
  return (
    <header className="topbar">
      {onBack && (
        <button type="button" className="icon-btn" onClick={onBack} aria-label={backLabel ?? t.common.back}>
          <Icon name="back" />
        </button>
      )}
      <h1>{title}</h1>
      {children}
    </header>
  );
}

export function IconButton({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button type="button" className="icon-btn" onClick={onClick} aria-label={label} title={label}>
      <Icon name={icon} />
    </button>
  );
}

export function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  format = (v) => String(v),
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label: string;
  format?: (v: number) => string;
}) {
  const t = useT();
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} aria-label={t.controls.decrease(label)}>
        −
      </button>
      <output aria-live="polite">{format(value)}</output>
      <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} aria-label={t.controls.increase(label)}>
        +
      </button>
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span className="switch">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span className="track" />
    </span>
  );
}

export function SettingRow({ label, children, htmlFor }: { label: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="setting-row">
      {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <span>{label}</span>}
      {children}
    </div>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; icon?: IconName; lang?: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button type="button" key={String(o.value)} aria-pressed={o.value === value} onClick={() => onChange(o.value)} lang={o.lang}>
          {o.icon && <Icon name={o.icon} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Modal sheet with focus moved inside and Escape to close. */
export function Sheet({ title, onClose, children, className = '' }: { title: string; onClose?: () => void; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      // Only the topmost sheet reacts, so Escape on the scoreboard never reaches the pause sheet underneath.
      const sheets = document.querySelectorAll('.sheet');
      if (e.key === 'Escape' && !e.repeat && sheets[sheets.length - 1] === ref.current) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`sheet ${className}`} role="dialog" aria-modal="true" aria-labelledby={id} ref={ref} tabIndex={-1}>
        <h2 id={id}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  danger,
}: {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  return (
    <Sheet title={message} onClose={onCancel}>
      <div className="stack" style={{ marginTop: 16 }}>
        <button type="button" className={`btn block ${danger ? 'maroon' : 'primary'}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button type="button" className="btn block secondary" onClick={onCancel}>
          {cancelLabel}
        </button>
      </div>
    </Sheet>
  );
}

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
}

/**
 * False for a moment after a screen appears. Screens that replace each other put their main button
 * in the same spot, so a double-tap on one must not land on the next. The button is disabled
 * (not silently ignored) during that window.
 */
export function useArmed(delayMs = 400): boolean {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setArmed(true), delayMs);
    return () => window.clearTimeout(t);
  }, [delayMs]);
  return armed;
}
