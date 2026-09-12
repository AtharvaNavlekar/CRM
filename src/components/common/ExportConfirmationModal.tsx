import React, { useState } from 'react';
import {
  ShieldAlert,
  FileSpreadsheet,
  AlertTriangle,
  X,
  CheckCircle2,
  Lock,
  UserCheck,
  Download
} from 'lucide-react';
import { useModalFocusTrap } from '../../utils/useModalFocusTrap';

interface ExportConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  exportCount: number;
  format?: 'csv' | 'json';
  userRole?: string;
  userName?: string;
  isProcessing?: boolean;
}

export const ExportConfirmationModal: React.FC<ExportConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  exportCount,
  format = 'csv',
  userRole = 'owner',
  userName = 'User',
  isProcessing = false
}) => {
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const modalRef = useModalFocusTrap(isOpen, () => {
    if (!isProcessing) onClose();
  });

  if (!isOpen) return null;

  const handleConfirmClick = async () => {
    if (!hasAcknowledged) return;
    setErrorMessage(null);
    try {
      await onConfirm();
    } catch (err: any) {
      setErrorMessage(err.message || 'Export authorization failed. Please try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-confirmation-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-[#F8FAF8] dark:bg-[#1D201F] text-[#191C1B] dark:text-[#E1E3E0] rounded-[28px] shadow-2xl border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Header with Security Lock Tone */}
        <div className="p-6 pb-4 border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30 flex items-start justify-between bg-[#F2F5F2] dark:bg-[#191C1B]">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 flex items-center justify-center shrink-0 shadow-xs">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Approval Required
              </span>
              <h2 id="export-confirmation-title" className="text-lg font-bold tracking-tight text-[#191C1B] dark:text-[#E1E3E0]">
                Authorize Customer Data Export
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Close export confirmation dialog"
            className="touch-target-48 rounded-full text-[#6F7976] hover:text-[#191C1B] dark:hover:text-[#E1E3E0] hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Security Notice Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start space-x-3 leading-relaxed">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Governance &amp; Data Protection Guard</p>
              <p className="mt-0.5 opacity-90">
                Bulk extraction of customer contact details and telecalling records falls under the{' '}
                <strong className="font-semibold">requiresApproval</strong> policy category. This operation is blocked until explicitly confirmed.
              </p>
            </div>
          </div>

          {/* Export Transaction Parameters Table */}
          <div className="bg-[#ECEFEC] dark:bg-[#272B2A] rounded-2xl p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30">
              <span className="text-[#6F7976] dark:text-[#89938F] flex items-center space-x-1.5">
                <FileSpreadsheet className="w-4 h-4 text-[#00695C] dark:text-[#80D5C4]" />
                <span>Records to Export:</span>
              </span>
              <span className="font-bold font-mono text-[#191C1B] dark:text-[#E1E3E0]">
                {exportCount} Lead Records ({format.toUpperCase()})
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30">
              <span className="text-[#6F7976] dark:text-[#89938F] flex items-center space-x-1.5">
                <UserCheck className="w-4 h-4 text-[#00695C] dark:text-[#80D5C4]" />
                <span>Requesting Actor:</span>
              </span>
              <span className="font-medium text-[#191C1B] dark:text-[#E1E3E0]">
                {userName} <span className="capitalize text-[#6F7976] dark:text-[#89938F]">({userRole})</span>
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30">
              <span className="text-[#6F7976] dark:text-[#89938F] flex items-center space-x-1.5">
                <Lock className="w-4 h-4 text-[#00695C] dark:text-[#80D5C4]" />
                <span>Audit Action Code:</span>
              </span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-white dark:bg-[#191C1B] text-[#00695C] dark:text-[#80D5C4] font-semibold">
                DATA_EXPORT (Approval Gated)
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-[#6F7976] dark:text-[#89938F]">Formula Neutralization:</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Active (Prepends &apos; to =, +, -, @)</span>
              </span>
            </div>
          </div>

          {/* Audit Logging Assurance Note */}
          <div className="p-3 rounded-2xl bg-[#CCE8E1]/60 dark:bg-[#004F46]/40 text-[#00201B] dark:text-[#A3F2E4] text-xs flex items-center space-x-2.5">
            <ShieldAlert className="w-4 h-4 text-[#00695C] dark:text-[#80D5C4] shrink-0" />
            <p className="leading-relaxed">
              An immutable audit log containing your user ID, IP address, timestamp, and row count will be committed upon confirmation.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-2xl bg-[#FFDAD6] text-[#410002] text-xs font-medium flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Explicit Acknowledgment Checkbox */}
          <label className="flex items-start space-x-3 p-3 rounded-2xl border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              id="chk-confirm-audit-trail"
              checked={hasAcknowledged}
              onChange={(e) => setHasAcknowledged(e.target.checked)}
              disabled={isProcessing}
              className="w-4 h-4 mt-0.5 rounded-sm text-[#00695C] focus:ring-[#00695C] cursor-pointer"
            />
            <span className="text-xs text-[#191C1B] dark:text-[#E1E3E0] leading-relaxed">
              I acknowledge and confirm that this customer export is authorized, aligns with company privacy standards, and will be logged to the immutable security audit trail.
            </span>
          </label>
        </div>

        {/* Footer Actions - M3 Pill Buttons */}
        <div className="p-4 px-6 border-t border-[#BEC9C5]/30 dark:border-[#3F4946]/30 bg-[#F2F5F2] dark:bg-[#191C1B] flex items-center justify-end space-x-3">
          <button
            type="button"
            id="btn-cancel-export"
            onClick={onClose}
            disabled={isProcessing}
            className="min-h-[44px] px-5 text-xs font-semibold rounded-full border border-[#BEC9C5] dark:border-[#3F4946] text-[#3F4946] dark:text-[#BEC9C5] hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] transition-all"
          >
            Cancel &amp; Block Export
          </button>

          <button
            type="button"
            id="btn-confirm-export"
            onClick={handleConfirmClick}
            disabled={!hasAcknowledged || isProcessing}
            className={`min-h-[44px] px-6 text-xs font-semibold rounded-full flex items-center space-x-2 transition-all shadow-sm ${
              hasAcknowledged && !isProcessing
                ? 'bg-[#00695C] text-white hover:bg-[#005449] hover:shadow-md'
                : 'bg-[#ECEFEC] dark:bg-[#272B2A] text-[#6F7976] dark:text-[#89938F] cursor-not-allowed border border-transparent'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Authorizing &amp; Logging...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Confirm &amp; Log Audit Trail</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
