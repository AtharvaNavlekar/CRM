import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Sparkles,
  X,
  Copy,
  Check,
  RefreshCw,
  Volume2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { useModalFocusTrap } from '../../utils/useModalFocusTrap';

interface AudioTranscriberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTranscript?: (transcript: string) => void;
  leadName?: string;
}

export const AudioTranscriberModal: React.FC<AudioTranscriberModalProps> = ({
  isOpen,
  onClose,
  onApplyTranscript,
  leadName
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const modalRef = useModalFocusTrap(isOpen, () => {
    if (!isRecording && !isTranscribing) {
      handleClose();
    }
  });

  // Reset state when modal closes
  const handleClose = () => {
    stopRecording(false);
    if (audioBlobUrl) {
      URL.revokeObjectURL(audioBlobUrl);
      setAudioBlobUrl(null);
    }
    setTranscription('');
    setErrorMessage(null);
    setRecordingDuration(0);
    onClose();
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
    };
  }, [audioBlobUrl]);

  // Start recording
  const startRecording = async () => {
    setErrorMessage(null);
    setTranscription('');
    audioChunksRef.current = [];
    if (audioBlobUrl) {
      URL.revokeObjectURL(audioBlobUrl);
      setAudioBlobUrl(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all audio tracks to release microphone hardware
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlobUrl(url);

        // Send to backend for transcription with gemini-3.5-transcribe
        await transcribeAudioBlob(audioBlob);
      };

      mediaRecorder.start(250); // Collect chunks every 250ms
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone permission was denied. Please allow microphone access in your browser.');
      } else {
        setErrorMessage(err.message || 'Could not access microphone.');
      }
      setIsRecording(false);
    }
  };

  // Stop recording
  const stopRecording = (shouldTranscribe = true) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (!shouldTranscribe) {
        mediaRecorderRef.current.onstop = null;
      }
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Transcribe audio using backend endpoint
  const transcribeAudioBlob = async (blob: Blob) => {
    setIsTranscribing(true);
    setErrorMessage(null);

    try {
      // Convert blob to base64 string
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const res = reader.result as string;
          const base64 = res.split(',')[1] || res;
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const base64Audio = await base64Promise;

      const token = localStorage.getItem('dialpulse_token');
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          audioBase64: base64Audio,
          mimeType: blob.type || 'audio/webm'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      setTranscription(data.text || 'No speech detected in audio.');
    } catch (err: any) {
      console.error('Transcription error:', err);
      setErrorMessage(err.message || 'Transcription failed. Please try speaking again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleCopy = () => {
    if (!transcription) return;
    navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (onApplyTranscript && transcription) {
      onApplyTranscript(transcription);
      handleClose();
    }
  };

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audio-transcriber-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-[#F8FAF8] dark:bg-[#1D201F] text-[#191C1B] dark:text-[#E1E3E0] rounded-[28px] shadow-2xl border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-5 px-6 border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30 flex items-center justify-between bg-[#F2F5F2] dark:bg-[#191C1B]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#CCE8E1] dark:bg-[#005046] text-[#00201B] dark:text-[#A3F2E4] flex items-center justify-center shrink-0">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 id="audio-transcriber-title" className="text-base font-bold text-[#191C1B] dark:text-[#E1E3E0]">
                Audio Voice Transcriber
              </h2>
              <p className="text-xs text-[#6F7976] dark:text-[#89938F]">
                Powered by Gemini <span className="font-mono font-semibold text-[#00695C] dark:text-[#80D5C4]">gemini-3.5-transcribe</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close audio transcriber dialog"
            className="touch-target-48 rounded-full text-[#6F7976] hover:text-[#191C1B] dark:hover:text-[#E1E3E0] hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {leadName && (
            <div className="p-2.5 rounded-2xl bg-[#ECEFEC] dark:bg-[#272B2A] text-xs flex items-center justify-between">
              <span className="text-[#6F7976] dark:text-[#89938F]">Target Lead:</span>
              <span className="font-semibold text-[#191C1B] dark:text-[#E1E3E0]">{leadName}</span>
            </div>
          )}

          {/* Recording Status & Control Area */}
          <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-[#ECEFEC]/60 dark:bg-[#272B2A]/60 border border-[#BEC9C5]/30 dark:border-[#3F4946]/30 space-y-4">
            {isRecording ? (
              <>
                {/* Live Pulse Waveform Indicator */}
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-24 h-24 rounded-full bg-red-500/20 animate-ping" />
                  <div className="absolute w-20 h-20 rounded-full bg-red-500/30 animate-pulse" />
                  <div className="w-16 h-16 rounded-full bg-[#BA1A1A] text-white flex items-center justify-center shadow-lg relative z-10">
                    <Mic className="w-8 h-8 animate-bounce" />
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-mono font-bold text-[#BA1A1A] tracking-wider">
                    {formatTime(recordingDuration)}
                  </div>
                  <p className="text-xs text-[#6F7976] dark:text-[#89938F] mt-0.5">
                    Recording live microphone audio...
                  </p>
                </div>

                <button
                  type="button"
                  id="btn-stop-recording"
                  onClick={() => stopRecording(true)}
                  className="min-h-[44px] px-6 py-2 rounded-full bg-[#BA1A1A] text-white hover:bg-[#93000a] text-xs font-semibold flex items-center space-x-2 transition-all shadow-md active:scale-95"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Stop &amp; Transcribe Audio</span>
                </button>
              </>
            ) : isTranscribing ? (
              <div className="py-6 flex flex-col items-center space-y-3">
                <RefreshCw className="w-10 h-10 text-[#00695C] dark:text-[#80D5C4] animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#191C1B] dark:text-[#E1E3E0]">
                    Transcribing with gemini-3.5-transcribe...
                  </p>
                  <p className="text-xs text-[#6F7976] dark:text-[#89938F] mt-0.5">
                    Analyzing speech modality and telecalling context
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-[#CCE8E1] dark:bg-[#005046] text-[#00201B] dark:text-[#A3F2E4] flex items-center justify-center shadow-xs">
                  <Mic className="w-8 h-8" />
                </div>

                <div className="text-center max-w-xs">
                  <p className="text-sm font-semibold text-[#191C1B] dark:text-[#E1E3E0]">
                    Speak into your microphone
                  </p>
                  <p className="text-xs text-[#6F7976] dark:text-[#89938F] mt-0.5">
                    Dictate call notes, meeting follow-ups, or client requirements.
                  </p>
                </div>

                <button
                  type="button"
                  id="btn-start-recording"
                  onClick={startRecording}
                  className="min-h-[44px] px-6 py-2.5 rounded-full bg-[#00695C] text-white hover:bg-[#005247] text-xs font-semibold flex items-center space-x-2 transition-all shadow-md active:scale-95"
                >
                  <Mic className="w-4 h-4" />
                  <span>{transcription ? 'Record Again' : 'Start Recording'}</span>
                </button>
              </>
            )}
          </div>

          {/* Audio Playback preview if recorded */}
          {audioBlobUrl && !isRecording && (
            <div className="flex items-center space-x-3 p-3 rounded-2xl bg-[#ECEFEC] dark:bg-[#272B2A]">
              <Volume2 className="w-4 h-4 text-[#00695C] dark:text-[#80D5C4] shrink-0" />
              <audio src={audioBlobUrl} controls className="w-full h-8" />
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-[#FFDAD6] text-[#410002] text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Transcription Output Area */}
          {transcription && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#191C1B] dark:text-[#E1E3E0] flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" />
                  <span>Transcribed Notes</span>
                </span>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-xs text-[#00695C] dark:text-[#80D5C4] hover:underline flex items-center space-x-1"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>
              </div>

              <textarea
                value={transcription}
                onChange={(e) => setTranscription(e.target.value)}
                rows={4}
                aria-label="Transcribed audio text editor"
                className="w-full p-3.5 text-xs bg-white dark:bg-[#191C1B] text-[#191C1B] dark:text-[#E1E3E0] rounded-2xl border border-[#BEC9C5]/50 dark:border-[#3F4946]/50 focus:border-[#00695C] focus:ring-2 focus:ring-[#00695C]/20 focus:outline-none font-sans leading-relaxed"
                placeholder="Transcribed text will appear here..."
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-[#BEC9C5]/30 dark:border-[#3F4946]/30 bg-[#F2F5F2] dark:bg-[#191C1B] flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            className="min-h-[44px] px-5 text-xs font-medium rounded-full border border-[#BEC9C5] dark:border-[#3F4946] text-[#3F4946] dark:text-[#BEC9C5] hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] transition-all"
          >
            Close
          </button>

          {transcription && onApplyTranscript && (
            <button
              type="button"
              id="btn-apply-transcript"
              onClick={handleApply}
              className="min-h-[44px] px-6 text-xs font-semibold rounded-full bg-[#00695C] text-white hover:bg-[#005449] flex items-center space-x-2 transition-all shadow-sm"
            >
              <FileText className="w-4 h-4" />
              <span>Apply to Notes</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
