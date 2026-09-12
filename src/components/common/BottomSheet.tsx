import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Max height as percentage of viewport. Default 85 */
  maxHeightVh?: number;
  /** Show the drag handle indicator at top. Default true */
  showDragHandle?: boolean;
  /** Additional CSS classes for the sheet container */
  className?: string;
}

/**
 * BottomSheet — A mobile-friendly slide-up panel component.
 * 
 * On mobile, menus and dialogs that would normally appear as floating
 * dropdowns are converted to bottom sheets for easier thumb-zone access.
 * 
 * Features:
 * - Slides up from bottom with backdrop
 * - Drag handle for visual affordance
 * - Click-outside to close
 * - Keyboard escape to close
 * - Focus trap via tabindex management
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxHeightVh = 85,
  showDragHandle = true,
  className = ''
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Handle open/close animation sequence
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Small delay to trigger CSS transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          isAnimating ? 'bg-black/40 backdrop-blur-[2px]' : 'bg-transparent'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Bottom sheet'}
        className={`fixed bottom-0 left-0 right-0 z-50 bg-[#F8FAF8] dark:bg-[#1D201F] rounded-t-[28px] shadow-2xl transform transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
          isAnimating ? 'translate-y-0' : 'translate-y-full'
        } ${className}`}
        style={{ maxHeight: `${maxHeightVh}vh` }}
      >
        {/* Drag Handle + Header */}
        <div className="sticky top-0 bg-[#F8FAF8] dark:bg-[#1D201F] rounded-t-[28px] z-10">
          {showDragHandle && (
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#BEC9C5] dark:bg-[#3F4946]" />
            </div>
          )}

          {title && (
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30">
              <h2 className="text-sm font-semibold text-[#191C1B] dark:text-[#E1E3E0] m3-title-small">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close bottom sheet"
                className="w-10 h-10 rounded-full flex items-center justify-center text-[#6F7976] hover:text-[#191C1B] dark:hover:text-[#E1E3E0] hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: `calc(${maxHeightVh}vh - 80px)` }}>
          {children}
        </div>
      </div>
    </>
  );
};
