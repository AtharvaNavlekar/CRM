/* This is a UX deterrent only, not a security control. It does not prevent access to page source or client-side code by a determined user. Never rely on this to protect secrets, API keys, or business logic — those must remain server-side. */

import { useEffect, useState, useCallback } from 'react';

/**
 * Threshold in pixels between outer and inner window dimensions that indicates
 * a docked browser developer tools drawer is open.
 */
export const DEVTOOLS_DIMENSION_THRESHOLD = 160;

/**
 * Attaches a contextmenu event listener to document to prevent the default
 * browser right-click context menu.
 * Returns a cleanup function.
 */
export function attachContextMenuDeterrence(): () => void {
  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  document.addEventListener('contextmenu', handleContextMenu, { capture: true });
  return () => {
    document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
  };
}

/**
 * Attaches a keydown listener to window to intercept and block DevTools shortcuts:
 * - F12
 * - Ctrl+Shift+I / Cmd+Option+I (Inspect)
 * - Ctrl+Shift+J / Cmd+Option+J (Console)
 * - Ctrl+Shift+C / Cmd+Option+C (Element Inspector)
 * - Ctrl+U / Cmd+U (View Page Source)
 * Returns a cleanup function.
 */
export function attachKeyboardDeterrence(): () => void {
  const handleKeyDown = (e: KeyboardEvent) => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    const isShiftOrAlt = e.shiftKey || e.altKey;
    const key = e.key ? e.key.toLowerCase() : '';
    const keyCode = e.keyCode || e.which;

    // F12 key (Key code 123)
    if (key === 'f12' || keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Ctrl+Shift+I or Cmd+Option+I (Inspect element / DevTools)
    if (isCtrlOrCmd && isShiftOrAlt && (key === 'i' || keyCode === 73)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Ctrl+Shift+J or Cmd+Option+J (DevTools Console)
    if (isCtrlOrCmd && isShiftOrAlt && (key === 'j' || keyCode === 74)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Ctrl+Shift+C or Cmd+Option+C (Inspect Element cursor)
    if (isCtrlOrCmd && isShiftOrAlt && (key === 'c' || keyCode === 67)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Ctrl+U or Cmd+U (View HTML source)
    if (isCtrlOrCmd && (key === 'u' || keyCode === 85)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  };

  window.addEventListener('keydown', handleKeyDown, { capture: true });
  return () => {
    window.removeEventListener('keydown', handleKeyDown, { capture: true });
  };
}

/**
 * Checks whether developer tools appear open based on window dimension disparity.
 * Note: Only applies when outer dimensions are populated and valid.
 */
export function isDevToolsDimensionExceeded(threshold = DEVTOOLS_DIMENSION_THRESHOLD): boolean {
  if (typeof window === 'undefined') return false;

  const outerW = window.outerWidth;
  const innerW = window.innerWidth;
  const outerH = window.outerHeight;
  const innerH = window.innerHeight;

  // Sanity check for valid window measurements
  if (!outerW || !outerH || !innerW || !innerH) {
    return false;
  }

  const widthDiff = outerW - innerW;
  const heightDiff = outerH - innerH;

  return widthDiff > threshold || heightDiff > threshold;
}

/**
 * React hook that binds contextmenu blocking, DevTools keyboard shortcut prevention,
 * and periodic dimension checks.
 *
 * @param enabled Whether deterrence features are actively enabled.
 */
export function useDevToolsDeterrence(enabled: boolean = true) {
  const [isDevToolsDetected, setIsDevToolsDetected] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsDevToolsDetected(false);
      return;
    }

    // 1. Right-click contextmenu prevention
    const cleanupContextMenu = attachContextMenuDeterrence();

    // 2. DevTools keyboard shortcut prevention
    const cleanupKeyboard = attachKeyboardDeterrence();

    // 3. Periodic DevTools heuristic inspection
    const checkHeuristic = () => {
      const detected = isDevToolsDimensionExceeded(DEVTOOLS_DIMENSION_THRESHOLD);
      setIsDevToolsDetected(detected);
      // Reset dismissal state if dimensions normalize then reopen
      if (!detected) {
        setIsDismissed(false);
      }
    };

    // Run initial check
    checkHeuristic();

    const intervalId = window.setInterval(checkHeuristic, 600);
    window.addEventListener('resize', checkHeuristic);

    return () => {
      cleanupContextMenu();
      cleanupKeyboard();
      window.clearInterval(intervalId);
      window.removeEventListener('resize', checkHeuristic);
    };
  }, [enabled]);

  return {
    isDevToolsOpen: enabled && isDevToolsDetected && !isDismissed,
    dismissWarning: dismiss
  };
}
