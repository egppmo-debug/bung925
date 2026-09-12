import React, { useState, useEffect, useRef } from 'react';

export interface CurrencyInputProps {
  id?: string;
  value: number | '' | null | undefined;
  onChange: (val: number | '') => void;
  allowNegative?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
  className?: string;
  suffix?: string;
  suffixClassName?: string;
}

export function CurrencyInput({
  id,
  value,
  onChange,
  allowNegative = false,
  min,
  max,
  placeholder = '0',
  className = '',
  suffix,
  suffixClassName = 'text-slate-400 font-medium',
}: CurrencyInputProps) {
  const [textValue, setTextValue] = useState<string>(() => {
    if (value === '' || value === undefined || value === null || isNaN(value as number)) {
      return '';
    }
    return (value as number).toLocaleString('ko-KR');
  });
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value updates (resets, preset loads, external calculations)
  useEffect(() => {
    if (value === '' || value === undefined || value === null) {
      if (textValue !== '') {
        setTextValue('');
      }
      return;
    }
    const currentNum = parseInt(textValue.replace(/,/g, ''), 10);
    if (isNaN(currentNum) || currentNum !== value) {
      setTextValue(typeof value === 'number' && !isNaN(value) ? value.toLocaleString('ko-KR') : '');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const raw = inputEl.value;
    const oldCursor = inputEl.selectionStart || 0;

    // Track how many digits were before the cursor to preserve cursor position
    const rawBeforeCursor = raw.slice(0, oldCursor);
    const digitsBeforeCursor = rawBeforeCursor.replace(/[^0-9]/g, '').length;
    const hadMinusBefore = allowNegative && rawBeforeCursor.includes('-');

    const isNegative = allowNegative && raw.trim().startsWith('-');
    const digits = raw.replace(/[^0-9]/g, '');

    if (!digits) {
      const nextText = isNegative ? '-' : '';
      setTextValue(nextText);
      onChange('');
      return;
    }

    let num = parseInt(digits, 10);
    if (isNegative) num = -num;
    if (max !== undefined && num > max) num = max;

    const formatted = num.toLocaleString('ko-KR');
    setTextValue(formatted);
    onChange(num);

    // Accurately restore cursor position
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      let targetCursor = 0;
      let countedDigits = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (/[0-9]/.test(formatted[i])) {
          countedDigits++;
        }
        if (countedDigits === digitsBeforeCursor) {
          targetCursor = i + 1;
          break;
        }
      }
      if (digitsBeforeCursor === 0) {
        targetCursor = hadMinusBefore ? 1 : 0;
      }
      inputRef.current.setSelectionRange(targetCursor, targetCursor);
    });
  };

  const handleBlur = () => {
    if (textValue.trim() === '' || textValue.trim() === '-') {
      setTextValue('');
      onChange('');
      return;
    }
    let num = parseInt(textValue.replace(/,/g, ''), 10);
    if (isNaN(num)) {
      setTextValue('');
      onChange('');
      return;
    }
    if (min !== undefined && num < min) {
      num = min;
    }
    if (max !== undefined && num > max) {
      num = max;
    }
    setTextValue(num.toLocaleString('ko-KR'));
    onChange(num);
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        value={textValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
      />
      {suffix && (
        <span
          className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${suffixClassName}`}
        >
          {suffix}
        </span>
      )}
    </div>
  );
}
