import React, { useState, useEffect } from 'react';

export interface NumericInputProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  placeholder?: string;
  title?: string;
  disabled?: boolean;
}

/**
 * Robust numeric input that allows users to erase characters freely without prematurely
 * resetting to minimum while typing. Commits clamped value on blur or Enter.
 */
export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  min,
  max,
  className = '',
  placeholder,
  title,
  disabled,
}) => {
  const [localStr, setLocalStr] = useState<string>(String(value ?? ''));

  useEffect(() => {
    setLocalStr(String(value ?? ''));
  }, [value]);

  const commit = () => {
    const trimmed = localStr.trim();
    if (trimmed === '' || isNaN(Number(trimmed))) {
      const fallback = value ?? (min ?? 0);
      setLocalStr(String(fallback));
      return;
    }
    let parsed = Number(trimmed);
    if (min !== undefined) parsed = Math.max(min, parsed);
    if (max !== undefined) parsed = Math.min(max, parsed);
    setLocalStr(String(parsed));
    if (parsed !== value) {
      onChange(parsed);
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={localStr}
      disabled={disabled}
      placeholder={placeholder}
      title={title}
      onChange={(e) => setLocalStr(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit();
          (e.target as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
          setLocalStr(String(value ?? ''));
        }
      }}
      className={className}
    />
  );
};
