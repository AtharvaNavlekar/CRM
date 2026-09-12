/**
 * This reliably blocks self-identifying AI crawlers and default-configuration
 * automation frameworks, but cannot guarantee blocking a sophisticated agent
 * driving a real browser with a normal, non-automated fingerprint — do not let
 * this comment be removed or the limitation get lost as "already solved" in any
 * future summary of this feature.
 */

import { useState, useEffect, useCallback } from 'react';

export interface AutomationDetectionDetails {
  isAutomated: boolean;
  reasons: string[];
}

/**
 * Checks for common signals indicating browser automation or headless environments.
 * Implemented conservatively to minimize false positives for legitimate human users.
 */
export function detectBrowserAutomation(): AutomationDetectionDetails {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { isAutomated: false, reasons: [] };
  }

  const reasons: string[] = [];

  // 1. Standard W3C webdriver flag (set by Selenium, Puppeteer, Playwright, WebDriver by default)
  if (navigator.webdriver === true) {
    reasons.push('navigator.webdriver is true');
  }

  // 2. Headless Chrome / Puppeteer artifacts in user agent
  const ua = (navigator.userAgent || '').toLowerCase();
  if (ua.includes('headlesschrome') || ua.includes('phantomjs')) {
    reasons.push('Headless token in userAgent');
  }

  // 3. Known automated driver execution globals
  const win = window as any;
  if (
    win.__webdriver_evaluate !== undefined ||
    win.__selenium_evaluate !== undefined ||
    win.__webdriver_script_function !== undefined ||
    win.__webdriver_script_func !== undefined ||
    win.__webdriver_script_fn !== undefined ||
    win.__fxdriver_evaluate !== undefined ||
    win.__driver_evaluate !== undefined ||
    win.__selenium_unwrapped !== undefined ||
    win.__nightmare !== undefined ||
    win._phantom !== undefined ||
    win.callPhantom !== undefined
  ) {
    reasons.push('Automation driver execution symbols detected on window');
  }

  // 4. Combined conservative headless signal:
  // Zero plugins, combined with missing languages on a non-mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (!isMobile) {
    const hasZeroPlugins = navigator.plugins && navigator.plugins.length === 0;
    const hasNoLanguages = !navigator.languages || navigator.languages.length === 0;
    if (hasZeroPlugins && hasNoLanguages) {
      reasons.push('Zero browser plugins and missing language preferences on desktop');
    }
  }

  return {
    isAutomated: reasons.length > 0,
    reasons
  };
}

/**
 * React hook that performs automation detection on mount.
 *
 * @param enabled Whether client automation detection is actively enabled.
 */
export function useAutomationDetection(enabled: boolean = true) {
  const [isAutomated, setIsAutomated] = useState(false);
  const [detectionReasons, setDetectionReasons] = useState<string[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsAutomated(false);
      return;
    }

    const check = detectBrowserAutomation();
    if (check.isAutomated) {
      setIsAutomated(true);
      setDetectionReasons(check.reasons);
    }
  }, [enabled]);

  return {
    isAutomated: enabled && isAutomated && !isDismissed,
    detectionReasons,
    dismissWarning: dismiss
  };
}
