import React, { useState, useEffect, useRef } from 'react';

interface CommaSeparatedInputProps {
  valueArray: string[];
  onChangeArray: (newArray: string[]) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export const CommaSeparatedInput: React.FC<CommaSeparatedInputProps> = ({
  valueArray = [],
  onChangeArray,
  placeholder,
  className,
  id
}) => {
  const [text, setText] = useState<string>(() => (valueArray || []).join(', '));
  const isFocusedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setText((valueArray || []).join(', '));
    }
  }, [valueArray]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setText(rawVal);

    const parsed = rawVal
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    onChangeArray(parsed);
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    const cleaned = text
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    onChangeArray(cleaned);
    setText(cleaned.join(', '));
  };

  return (
    <input
      id={id}
      type="text"
      value={text}
      onFocus={() => { isFocusedRef.current = true; }}
      onBlur={handleBlur}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
};
