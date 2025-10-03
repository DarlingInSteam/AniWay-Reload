import React, { useRef, useEffect } from 'react';

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export const VerificationCodeInput: React.FC<Props> = ({ value, onChange, length = 6, disabled, autoFocus, className }) => {
  const inputsRef = useRef<Array<HTMLInputElement|null>>([]);

  useEffect(()=>{
    if (autoFocus && inputsRef.current[0]) inputsRef.current[0].focus();
  },[autoFocus]);

  const handleChange = (idx: number, val: string) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...value];
    next[idx] = val;
    onChange(next);
    if (val && idx < length - 1) inputsRef.current[idx+1]?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,length);
    if (!text) return;
    e.preventDefault();
    const next = [...value];
    for (let i=0;i<length;i++) next[i] = text[i]||'';
    onChange(next);
    const focusIndex = Math.min(text.length, length-1);
    inputsRef.current[focusIndex]?.focus();
  };
  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) inputsRef.current[idx-1]?.focus();
  };

  return (
  <div className={`flex justify-center gap-2 ${className||''}`} onPaste={handlePaste}>
      {Array.from({ length }).map((_,i)=>(
        <input
          key={i}
          ref={el=>inputsRef.current[i]=el}
          value={value[i]||''}
          inputMode="numeric"
          onChange={e=>handleChange(i,e.target.value)}
          onKeyDown={e=>handleKeyDown(i,e)}
          maxLength={1}
          disabled={disabled}
          className="w-12 h-14 text-center text-xl bg-white/5 border border-border/30 rounded-md text-white focus:outline-none focus:ring-primary/50 focus:border-primary/50 disabled:opacity-40"
        />
      ))}
    </div>
  );
};

export default VerificationCodeInput;
