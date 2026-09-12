import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Clock,
  CheckCircle2,
  Calendar,
  FileText,
  User,
  Sparkles,
  PhoneForwarded,
  Pause,
  Play
} from 'lucide-react';
import { Lead, CallOutcome, User as UserType } from '../../types';
import { useModalFocusTrap } from '../../utils/useModalFocusTrap';

interface CallConsoleModalProps {
  isOpen: boolean;
  lead: Lead | null;
  currentUser: UserType | null;
  onClose: () => void;
  onCallLogged: (callData: {
    leadId: string;
    duration: number;
    outcome: CallOutcome;
    notes: string;
    callbackReminder?: string | null;
  }) => Promise<void>;
}

type CallState = 'dialing' | 'ringing' | 'connected' | 'ended_disposition';

export const CallConsoleModal: React.FC<CallConsoleModalProps> = ({
  isOpen,
  lead,
  currentUser,
  onClose,
  onCallLogged
}) => {
  const [callState, setCallState] = useState<CallState>('ringing');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);

  // Disposition fields
  const [outcome, setOutcome] = useState<CallOutcome>('Follow-up');
  const [notes, setNotes] = useState('');
  const [callbackTime, setCallbackTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const timerRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringOscillatorRef = useRef<OscillatorNode | null>(null);

  const handleClose = useCallback(() => {
    try {
      if (ringOscillatorRef.current) {
        ringOscillatorRef.current.stop();
        ringOscillatorRef.current.disconnect();
        ringOscillatorRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    } catch (e) {}
    onClose();
  }, [onClose]);

  const modalRef = useModalFocusTrap(isOpen, handleClose);

  // Audio synthesize ring tone safely using Web Audio API
  const playRingtone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // 440 Hz
      gain.gain.setValueAtTime(0.05, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      ringOscillatorRef.current = osc;

      // Pulse the ring tone (400ms on, 1000ms off)
      const pulseInterval = setInterval(() => {
        if (!audioCtxRef.current) {
          clearInterval(pulseInterval);
          return;
        }
        try {
          const now = ctx.currentTime;
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.setValueAtTime(0, now + 0.4);
        } catch (e) {}
      }, 1500);

      return () => {
        clearInterval(pulseInterval);
        stopRingtone();
      };
    } catch (e) {
      // Audio context might be restricted, fallback silently
    }
  };

  const stopRingtone = () => {
    try {
      if (ringOscillatorRef.current) {
        ringOscillatorRef.current.stop();
        ringOscillatorRef.current.disconnect();
        ringOscillatorRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    } catch (e) {}
  };

  // Lifecycle on modal open
  useEffect(() => {
    if (!isOpen || !lead) {
      stopRingtone();
      return;
    }

    setCallState('ringing');
    setDurationSeconds(0);
    setIsMuted(false);
    setIsOnHold(false);
    setOutcome('Follow-up');
    setNotes('');
    setCallbackTime('');

    const cleanupAudio = playRingtone();

    // Auto connect after 3 seconds if not clicked manually
    const autoConnectTimer = setTimeout(() => {
      stopRingtone();
      setCallState('connected');
    }, 3200);

    return () => {
      clearTimeout(autoConnectTimer);
      if (cleanupAudio) cleanupAudio();
      stopRingtone();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, lead?.id]);

  // Connected state timer
  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  if (!isOpen || !lead) return null;

  const handleManualAnswer = () => {
    stopRingtone();
    setCallState('connected');
  };

  const handleEndCall = () => {
    stopRingtone();
    setCallState('ended_disposition');
  };

  const handleSaveDisposition = async () => {
    setIsSaving(true);
    try {
      await onCallLogged({
        leadId: lead.id,
        duration: durationSeconds,
        outcome,
        notes: notes.trim() || `Discussed ${lead.industry || 'service'} requirements. Outcome: ${outcome}`,
        callbackReminder: callbackTime ? new Date(callbackTime).toISOString() : null
      });
      onClose();
    } catch (e) {
      console.error('Failed to save call disposition:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        id="modal-call-console"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-call-console-title"
        className="bg-[#191C1B] text-[#E1E3E0] w-full max-w-md rounded-[28px] shadow-2xl border border-[#3F4946]/50 overflow-hidden flex flex-col outline-none"
        tabIndex={-1}
      >
        {/* Header Bar */}
        <div className="px-6 py-4 bg-[#00201B] flex items-center justify-between border-b border-[#3F4946]/30">
          <div className="flex items-center space-x-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#80D5C4] animate-pulse" />
            <span id="modal-call-console-title" className="text-xs font-semibold tracking-wide uppercase text-[#80D5C4] m3-label-large">
              TeleCRM In-App Telecaller
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close call console"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#A2ADA9] hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80D5C4] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dialing / Ringing / Active Screen */}
        {callState !== 'ended_disposition' ? (
          <div className="p-8 flex flex-col items-center text-center">
            {/* Contact Avatar with simulated pulse ring */}
            <div className="relative my-4">
              <div
                className={`w-28 h-28 rounded-full flex items-center justify-center text-3xl font-bold shadow-xl ${
                  callState === 'ringing'
                    ? 'bg-[#00695C] text-white ring-8 ring-[#00695C]/30 animate-pulse'
                    : 'bg-[#00695C] text-white ring-4 ring-[#80D5C4]/40'
                }`}
              >
                {lead.name.charAt(0)}
              </div>
            </div>

            {/* Lead Name & Phone */}
            <h2 className="text-xl font-bold tracking-tight text-[#E1E3E0] mb-1 m3-headline-small">
              {lead.name}
            </h2>
            <p className="text-sm font-mono text-[#80D5C4] mb-2">{lead.phone}</p>

            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-xs text-[#C4C7C5] mb-6">
              <span>{lead.source}</span>
              <span>•</span>
              <span>{lead.industry || 'Sales Lead'}</span>
            </div>

            {/* Status & Timer */}
            {callState === 'ringing' ? (
              <div className="space-y-3">
                <div className="text-sm font-medium text-amber-300 animate-pulse flex items-center justify-center space-x-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  <span>Dialing Indian Mobile Gateway... (Ringing)</span>
                </div>
                <button
                  onClick={handleManualAnswer}
                  className="px-5 py-2 rounded-full bg-[#00695C] hover:bg-[#005449] text-xs font-medium text-white transition-all shadow-md min-h-[38px]"
                >
                  ⚡ Simulate Customer Pickup
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-3xl font-mono font-bold text-white tracking-wider">
                  {formatTimer(durationSeconds)}
                </div>
                <div className="text-xs text-[#80D5C4] font-medium flex items-center justify-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#80D5C4]"></span>
                  <span>Call Connected (HD Voice Simulated)</span>
                </div>
              </div>
            )}

            {/* In-Call Controls */}
            {callState === 'connected' && (
              <div className="grid grid-cols-3 gap-4 mt-8 w-full max-w-xs">
                {/* Mute */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-[20px] border transition-all ${
                    isMuted
                      ? 'bg-[#FFDAD6]/20 border-[#BA1A1A] text-[#FFB4AB]'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-[#E1E3E0]'
                  }`}
                >
                  {isMuted ? <MicOff className="w-5 h-5 mb-1 text-[#FFB4AB]" /> : <Mic className="w-5 h-5 mb-1" />}
                  <span className="text-[11px] font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>

                {/* Hold */}
                <button
                  onClick={() => setIsOnHold(!isOnHold)}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-[20px] border transition-all ${
                    isOnHold
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-[#E1E3E0]'
                  }`}
                >
                  {isOnHold ? <Play className="w-5 h-5 mb-1 text-amber-400" /> : <Pause className="w-5 h-5 mb-1" />}
                  <span className="text-[11px] font-medium">{isOnHold ? 'Resume' : 'Hold'}</span>
                </button>

                {/* Speaker */}
                <div className="flex flex-col items-center justify-center p-3.5 rounded-[20px] border bg-white/5 border-white/10 text-[#E1E3E0]">
                  <Volume2 className="w-5 h-5 mb-1 text-[#80D5C4]" />
                  <span className="text-[11px] font-medium">Headset</span>
                </div>
              </div>
            )}

            {/* Hangup button */}
            <div className="mt-8">
              <button
                id="btn-end-call"
                onClick={handleEndCall}
                className="w-16 h-16 rounded-full bg-[#BA1A1A] hover:bg-[#93000A] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
                title="Hang up and open wrap-up disposition"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
              <p className="text-xs text-[#A2ADA9] mt-2.5 font-medium">End Call &amp; Save Outcome</p>
            </div>
          </div>
        ) : (
          /* Post-Call Wrap-up & Outcome Disposition Screen */
          <div className="p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-semibold text-[#E1E3E0] m3-title-medium">Call Wrap-Up Disposition</h3>
                <p className="text-xs text-[#A2ADA9]">Duration: {formatTimer(durationSeconds)} with {lead.name}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#004F46] text-[#80D5C4] flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            {/* Outcome dropdown */}
            <div>
              <label className="block text-xs font-medium text-[#C4C7C5] mb-1.5">
                Call Outcome *
              </label>
              <select
                id="select-call-outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as CallOutcome)}
                className="w-full px-4 py-2.5 bg-[#272B2A] rounded-full text-xs font-medium text-white focus:ring-[#80D5C4] m3-select"
              >
                <option value="Interested">Interested (Ready for demo / quote)</option>
                <option value="Follow-up">Follow-up (Schedule callback)</option>
                <option value="Converted">Converted (Deal Won / Advance Received)</option>
                <option value="Not interested">Not interested (Budget / Timing mismatch)</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-[#C4C7C5] mb-1.5">
                Call Notes &amp; Discussion Summary
              </label>
              <textarea
                id="textarea-call-notes"
                rows={3}
                placeholder="e.g. Client requested customized pricing sheet, asked to call back post lunch..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3.5 bg-[#272B2A] border border-transparent rounded-[18px] text-xs text-white placeholder-[#6F7976] focus:outline-none focus:ring-2 focus:ring-[#80D5C4]"
              />
            </div>

            {/* Callback Reminder Date/Time */}
            <div>
              <label className="block text-xs font-medium text-[#C4C7C5] mb-1.5 flex items-center justify-between">
                <span>Set Callback Reminder (Optional)</span>
                <span className="text-[10px] text-[#80D5C4] font-normal">Adds to Callbacks Due list</span>
              </label>
              <input
                id="input-call-callback"
                type="datetime-local"
                value={callbackTime}
                onChange={(e) => setCallbackTime(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#272B2A] border border-transparent rounded-full text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#80D5C4]"
              />
            </div>

            {/* Save Button */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-full text-xs font-medium text-[#C4C7C5] hover:text-white border border-[#3F4946] hover:bg-white/10 transition-colors min-h-[44px]"
              >
                Discard
              </button>
              <button
                id="btn-save-call-disposition"
                type="button"
                onClick={handleSaveDisposition}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-full text-xs font-medium bg-[#00695C] hover:bg-[#005449] text-white transition-colors shadow-sm min-h-[44px]"
              >
                {isSaving ? 'Saving Log...' : 'Save Call & Update Lead'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
