import React from 'react';
import { ShieldAlert, AlertTriangle, X, Terminal } from 'lucide-react';

interface DevToolsWarningOverlayProps {
  isOpen: boolean;
  onDismiss: () => void;
}

/**
 * Full-screen UX deterrence overlay shown when browser developer tools are detected.
 * Designed to provide a clear deterrence prompt without crashing the page or breaking user state.
 */
export const DevToolsWarningOverlay: React.FC<DevToolsWarningOverlayProps> = ({ isOpen, onDismiss }) => {
  if (!isOpen) return null;

  return (
    <div
      id="devtools-warning-overlay"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="devtools-warning-title"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#1E201F] p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-center">
        {/* Close / Dismiss button */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Dismiss warning"
          title="Dismiss warning"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <h2 id="devtools-warning-title" className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Developer tools are restricted on this application.
        </h2>

        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Access to browser developer tools, console debugging, and source inspection is restricted by policy to protect enterprise client workflows.
        </p>

        <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-[#161817] border border-slate-200/80 dark:border-slate-800 text-left text-xs text-slate-500 dark:text-slate-400 flex items-start space-x-2.5">
          <Terminal className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <span>
            Please close the developer inspection drawer to continue using DialPulse CRM normally.
          </span>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="w-full inline-flex justify-center items-center px-4 py-2.5 rounded-xl bg-[#00695C] text-white text-sm font-medium hover:bg-[#005449] active:scale-[0.99] transition-all shadow-sm"
          >
            I understand, dismiss warning
          </button>
        </div>
      </div>
    </div>
  );
};

interface AutomationWarningBannerProps {
  isVisible: boolean;
  onDismiss: () => void;
  reasons?: string[];
}

/**
 * Top-of-app notification banner displayed when client-side browser automation heuristics trigger.
 * Informs the user without hard-locking app functionality.
 */
export const AutomationWarningBanner: React.FC<AutomationWarningBannerProps> = ({
  isVisible,
  onDismiss,
  reasons
}) => {
  if (!isVisible) return null;

  return (
    <aside
      id="automation-detection-banner"
      aria-label="Automated browser warning"
      className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800/80 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <span className="font-medium truncate">
          Automated browser access detected. If you are a human seeing this message, please disable browser automation extensions or contact support.
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={onDismiss}
          className="rounded px-2 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
        >
          Dismiss
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
          aria-label="Close automation warning banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
