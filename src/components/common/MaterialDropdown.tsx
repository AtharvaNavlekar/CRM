import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, Check } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DropdownOption {
  value: string;
  label: string;
  /** Optional leading icon/emoji node rendered before the label */
  icon?: React.ReactNode;
}

export interface MaterialDropdownProps {
  /** HTML id forwarded to the trigger button for label association */
  id?: string;
  /** List of selectable options */
  options: DropdownOption[];
  /** Currently selected value */
  value: string;
  /** Callback fired when an option is selected */
  onChange: (value: string) => void;
  /**
   * Visual variant:
   * - `"chip"` — compact, transparent trigger for use inside filter chip rows
   * - `"form"` — full-width bordered trigger for modals / forms
   */
  variant?: 'chip' | 'form';
  /** Optional visible label prefix rendered before the selected value text */
  label?: string;
  /** Fallback text when no option matches the current value */
  placeholder?: string;
  /** Extra classes on the outermost wrapper `<div>` */
  className?: string;
  /** Override / extend classes on the trigger button */
  triggerClassName?: string;
  /** Override / extend classes on the floating menu panel */
  menuClassName?: string;
  /** Accessible label for the trigger button */
  ariaLabel?: string;
  /** Disable interaction */
  disabled?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const MaterialDropdown: React.FC<MaterialDropdownProps> = ({
  id,
  options,
  value,
  onChange,
  variant = 'chip',
  label,
  placeholder = 'Select…',
  className = '',
  triggerClassName = '',
  menuClassName = '',
  ariaLabel,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Derived: find the selected option object
  const selectedOption = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );

  // ── Click-outside ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // ── Reset highlight when menu opens ───────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex((o) => o.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, options, value]);

  // ── Scroll highlighted item into view ─────────────────────────────────────
  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) return;
    const menu = menuRef.current;
    if (!menu) return;
    const item = menu.children[highlightedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, isOpen]);

  // ── Select handler ────────────────────────────────────────────────────────
  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setIsOpen(false);
      triggerRef.current?.focus();
    },
    [onChange],
  );

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else if (highlightedIndex >= 0 && highlightedIndex < options.length) {
            handleSelect(options[highlightedIndex].value);
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setHighlightedIndex((prev) =>
              prev < options.length - 1 ? prev + 1 : 0,
            );
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setHighlightedIndex((prev) =>
              prev > 0 ? prev - 1 : options.length - 1,
            );
          }
          break;

        case 'Tab':
          if (isOpen) {
            setIsOpen(false);
          }
          break;

        default:
          break;
      }
    },
    [disabled, isOpen, highlightedIndex, options, handleSelect],
  );

  // ── Style tokens ──────────────────────────────────────────────────────────

  const isChip = variant === 'chip';

  const triggerBase = isChip
    ? // Chip variant: bare inline trigger, no bg/border — parent chip provides those
      'inline-flex items-center gap-1.5 bg-transparent text-xs font-medium text-[#191C1B] dark:text-[#E1E3E0] cursor-pointer outline-none transition-colors'
    : // Form variant: full-width bordered container
      'w-full flex items-center justify-between gap-2 min-h-[44px] px-4 py-2.5 text-xs font-medium bg-[#ECEFEC] dark:bg-[#272B2A] text-[#191C1B] dark:text-[#E1E3E0] border border-[#BEC9C5]/40 dark:border-[#3F4946]/40 rounded-xl hover:border-[#BEC9C5] dark:hover:border-[#3F4946] focus-visible:ring-2 focus-visible:ring-[#00695C] cursor-pointer outline-none transition-all';

  const menuBase =
    'absolute z-50 mt-1.5 min-w-[180px] max-h-[240px] overflow-y-auto rounded-2xl bg-white dark:bg-[#1D201F] border border-[#BEC9C5]/30 dark:border-[#3F4946]/50 shadow-lg py-1.5 focus:outline-none';

  const menuPosition = isChip ? 'left-0' : 'left-0 right-0';

  return (
    <div
      ref={containerRef}
      className={`relative ${isChip ? 'inline-flex' : 'w-full'} ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* ── Trigger Button ─────────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((o) => !o)}
        className={`${triggerBase} ${triggerClassName} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {/* Label prefix */}
        {label && (
          <span className="text-[11px] text-[#6F7976] dark:text-[#89938F] font-medium shrink-0">
            {label}
          </span>
        )}

        {/* Selected value display */}
        <span className="truncate">
          {selectedOption ? (
            <span className="inline-flex items-center gap-1.5">
              {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-[#6F7976] dark:text-[#89938F]">{placeholder}</span>
          )}
        </span>

        {/* Chevron */}
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-[#6F7976] dark:text-[#89938F] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* ── Dropdown Menu ──────────────────────────────────────────────── */}
      {isOpen && (
        <ul
          ref={menuRef}
          role="listbox"
          aria-activedescendant={
            highlightedIndex >= 0 ? `${id || 'md'}-opt-${highlightedIndex}` : undefined
          }
          className={`${menuBase} ${menuPosition} ${menuClassName}`}
        >
          {options.map((option, idx) => {
            const isSelected = option.value === value;
            const isHighlighted = idx === highlightedIndex;

            return (
              <li
                key={option.value}
                id={`${id || 'md'}-opt-${idx}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option.value)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`
                  flex items-center gap-2.5 px-3.5 py-2.5 mx-1.5 rounded-xl cursor-pointer text-xs font-medium
                  transition-colors duration-100 select-none
                  ${
                    isSelected
                      ? 'bg-[#CCE8E1] dark:bg-[#004F46] text-[#00201B] dark:text-[#A3F2E4]'
                      : isHighlighted
                        ? 'bg-[#E8F5E9] dark:bg-[#1D3A33] text-[#191C1B] dark:text-[#E1E3E0]'
                        : 'text-[#191C1B] dark:text-[#E1E3E0] hover:bg-[#E8F5E9] dark:hover:bg-[#1D3A33]'
                  }
                `}
              >
                {/* Option icon */}
                {option.icon && <span className="shrink-0 w-4 flex items-center justify-center">{option.icon}</span>}

                {/* Option label */}
                <span className="flex-1 truncate">{option.label}</span>

                {/* Selected checkmark */}
                {isSelected && (
                  <Check className="w-3.5 h-3.5 shrink-0 text-[#00695C] dark:text-[#80D5C4]" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
