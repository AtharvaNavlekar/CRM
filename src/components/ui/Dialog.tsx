import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useModalFocusTrap } from '../../utils/useModalFocusTrap';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
  className = ''
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  useModalFocusTrap(modalRef, isOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  }[maxWidth];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div
        ref={modalRef}
        className={`w-full ${maxWidthClass} bg-[#FFFFFF] dark:bg-[#161A19] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden font-body ${className}`}
      >
        {/* Dialog Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-[#F1F5F4] dark:border-[#202726] shrink-0">
          <div>
            <h2
              id="dialog-title"
              className="text-lg font-bold font-heading text-[#0F172A] dark:text-[#F1F5F9] tracking-tight"
            >
              {title}
            </h2>
            {description && (
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748B] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#F1F5F9] hover:bg-[#F1F5F4] dark:hover:bg-[#1F2423] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00695C]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dialog Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>

        {/* Dialog Footer */}
        {footer && (
          <div className="px-6 py-3.5 border-t border-[#F1F5F4] dark:border-[#202726] bg-[#F8FAF9]/80 dark:bg-[#111514]/80 flex items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
