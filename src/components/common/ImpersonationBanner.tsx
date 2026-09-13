import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, LogOut } from 'lucide-react';
import { api } from '../../services/api';

export const ImpersonationBanner: React.FC = () => {
  const { securityContext, currentUser } = useAuth();
  const [isEnding, setIsEnding] = useState(false);

  if (!securityContext || !securityContext.impersonating) {
    return null;
  }

  const handleEndImpersonation = async () => {
    setIsEnding(true);
    try {
      // We don't have a specific api method for this yet, so we use fetch directly
      const token = sessionStorage.getItem('dialpulse_access_token') || localStorage.getItem('dialpulse_access_token') || localStorage.getItem('dialpulse_token');
      await fetch('/api/platform/impersonate/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      // Force reload to clear all state and get fresh context
      window.location.reload();
    } catch (e) {
      console.error('Failed to end impersonation', e);
      setIsEnding(false);
    }
  };

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between sticky top-0 z-[100] shadow-md">
      <div className="flex items-center space-x-3">
        <ShieldAlert className="w-5 h-5 animate-pulse" />
        <div>
          <span className="font-bold mr-2">SECURITY WARNING:</span>
          <span className="text-sm font-medium">
            You are actively impersonating tenant <strong>{securityContext.tenantId}</strong>.
            All actions are being audited under your original identity.
          </span>
        </div>
      </div>
      <button
        onClick={handleEndImpersonation}
        disabled={isEnding}
        className="flex items-center space-x-2 bg-amber-950 text-amber-100 hover:bg-amber-900 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors disabled:opacity-50"
      >
        <LogOut className="w-4 h-4" />
        <span>{isEnding ? 'Ending...' : 'End Impersonation'}</span>
      </button>
    </div>
  );
};
