import { useEffect, useRef } from 'react';

/**
 * Custom hook for accessible modal focus trapping and keyboard navigation:
 * - Traps Tab and Shift+Tab within modal focusables
 * - Listens for Escape key and calls onClose
 * - Focuses first interactive element or initialFocusSelector on open
 * - Restores focus to previous active element on close
 */
export function useModalFocusTrap(
  isOpen: boolean,
  onClose: () => void,
  initialFocusSelector?: string
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Capture the element that triggered the modal
    previousFocusRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    // Shift focus to the first focusable or designated element
    const timer = setTimeout(() => {
      if (!container) return;
      if (initialFocusSelector) {
        const target = container.querySelector<HTMLElement>(initialFocusSelector);
        if (target) {
          target.focus();
          return;
        }
      }
      const focusables: HTMLElement[] = Array.from(
        container.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ) as HTMLElement[];
      const activeFocusables = focusables.filter((el) => el.offsetParent !== null);

      if (activeFocusables.length > 0) {
        activeFocusables[0].focus();
      } else {
        container.focus();
      }
    }, 40);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusables: HTMLElement[] = (Array.from(
          container.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ) as HTMLElement[]).filter((el) => el.offsetParent !== null);

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        try {
          previousFocusRef.current.focus();
        } catch (err) {
          // In case element is unmounted
        }
      }
    };
  }, [isOpen, onClose, initialFocusSelector]);

  return containerRef;
}
