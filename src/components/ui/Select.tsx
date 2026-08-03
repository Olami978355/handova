import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  value, onChange, options, placeholder = 'Select an option', disabled = false, hasError = false,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full flex items-center justify-between px-4 py-3.5 bg-ink border rounded-xl text-[14px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          hasError ? 'border-danger/40' : 'border-white/10 hover:border-white/20'
        } ${open ? 'border-gold/50' : ''}`}
      >
        <span className={selected ? 'text-paper' : 'text-paper/25'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-paper/30 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-20 top-full mt-1.5 w-full max-h-64 overflow-y-auto bg-ink border border-white/10 rounded-xl shadow-2xl py-1.5"
        >
          {options.map(opt => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-[13px] text-left transition-colors ${
                  isSelected ? 'text-gold bg-gold/8' : 'text-paper/70 hover:bg-white/5 hover:text-paper'
                }`}
              >
                {opt.label}
                {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
