import React, { useState } from 'react';
import { Mail, Eye, EyeOff, AlertCircle, ArrowLeft, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useModalFocusTrap } from '../../utils/useModalFocusTrap';

type AuthView = 'login' | 'signup' | 'forgot';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" className="text-black fill-current">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.09 2.31-.86 3.5-.8 1.49.09 2.59.69 3.26 1.76-2.82 1.68-2.31 5.37.5 6.46-.71 1.95-1.63 3.84-2.34 4.75zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

export const LoginModal: React.FC = () => {
  const [view, setView] = useState<AuthView>('login');
  const isReversed = view === 'signup' || view === 'forgot';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111413] sm:p-8 animate-in fade-in">
      <div className="relative flex w-full max-w-5xl h-full sm:h-auto sm:min-h-[600px] bg-white sm:rounded-[2.5rem] overflow-hidden shadow-2xl outline-none">
        
        {/* Form Section */}
        <div 
          className={`absolute top-0 bottom-0 w-full sm:w-1/2 bg-white transition-transform duration-700 ease-in-out z-10 flex flex-col px-8 py-8 sm:px-16 lg:px-20 overflow-y-auto ${
            isReversed ? 'sm:translate-x-full' : 'sm:translate-x-0'
          }`}
        >
          <div className="max-w-sm w-full mx-auto my-auto space-y-6">
            
            {view === 'login' && <LoginForm setView={setView} />}
            {view === 'signup' && <SignUpForm setView={setView} />}
            {view === 'forgot' && <ForgotForm setView={setView} />}
            
          </div>
        </div>

        {/* Image Section */}
        <div 
          className={`hidden sm:block absolute top-0 bottom-0 w-1/2 transition-transform duration-700 ease-in-out p-3 ${
            isReversed ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="w-full h-full relative rounded-[2rem] overflow-hidden bg-slate-100">
            <img 
              src="/login-illustration.jpg" 
              alt="Welcome background" 
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/* --- Sub-components for forms --- */

const LoginForm: React.FC<{ setView: (v: AuthView) => void }> = ({ setView }) => {
  const { login, sessionExpiredMessage, clearSessionExpiredMessage } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    clearSessionExpiredMessage();

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err?.data?.error || err?.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="text-center space-y-2 mb-2">
        <h1 id="modal-login-title" className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Welcome back<span className="inline-block ml-1 waving-hand">👋</span>
        </h1>
        <p className="text-sm text-slate-500 font-medium pt-1">
          Please enter your details.
        </p>
      </div>

      {sessionExpiredMessage && (
        <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-left">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{sessionExpiredMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs text-left">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3">
          <button
            type="button"
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 transition-colors"
          >
            <GoogleIcon />
            <span>Log In with Google</span>
          </button>

          <button
            type="button"
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 transition-colors"
          >
            <AppleIcon />
            <span>Log In with Apple</span>
          </button>
        </div>

        <div className="flex items-center space-x-4 py-2">
          <div className="flex-1 h-px bg-slate-100"></div>
          <span className="text-xs text-slate-400 font-medium uppercase">or</span>
          <div className="flex-1 h-px bg-slate-100"></div>
        </div>

        <div className="space-y-3">
          <div className="relative flex items-center">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full pl-4 pr-10 py-3 text-sm rounded-full border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E6E5C]/20 focus:border-[#2E6E5C] transition-colors"
              required
            />
            <Mail className="w-5 h-5 text-slate-300 absolute right-4 pointer-events-none" />
          </div>

          <div className="relative flex items-center">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full pl-4 pr-10 py-3 text-sm rounded-full border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E6E5C]/20 focus:border-[#2E6E5C] transition-colors"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 text-slate-300 hover:text-slate-500 focus:outline-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 pb-1">
          <label className="flex items-center space-x-2 cursor-pointer group">
            <div className="relative flex items-center justify-center w-4 h-4 rounded border border-slate-300 bg-white group-hover:border-[#2E6E5C] transition-colors">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="sr-only"
              />
              {rememberMe && (
                <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3 text-[#2E6E5C]">
                  <path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className="text-xs text-slate-500 font-medium select-none">Remember for 30 days</span>
          </label>
          <button 
            type="button" 
            onClick={() => setView('forgot')}
            className="text-xs text-[#2E6E5C] font-semibold hover:text-[#25594b] transition-colors"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center py-3 px-4 rounded-full bg-[#2E6E5C] hover:bg-[#25594b] active:scale-[0.99] text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#2E6E5C]/50 transition-all disabled:opacity-70 shadow-lg shadow-emerald-900/20"
        >
          {isSubmitting ? 'Logging In...' : 'Log In'}
        </button>
        
        <div className="text-center pt-2">
          <p className="text-xs text-slate-500">
            Don't have an account?{' '}
            <button 
              type="button" 
              onClick={() => setView('signup')}
              className="text-slate-900 font-semibold hover:text-[#2E6E5C] transition-colors"
            >
              Sign Up
            </button>
          </p>
        </div>
      </form>
    </>
  );
};

const SignUpForm: React.FC<{ setView: (v: AuthView) => void }> = ({ setView }) => {
  return (
    <div className="animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create Account</h1>
        <p className="text-sm text-slate-500 font-medium pt-1">
          Join DialPulse CRM to get started.
        </p>
      </div>

      <div className="flex items-start space-x-2.5 p-3 mb-6 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] text-left leading-relaxed">
        <Shield className="w-4 h-4 mt-0.5 shrink-0 text-[#2E6E5C]" />
        <span>
          <strong>Restricted Access:</strong> Registration is currently available only to authorized NBFC owners and IT department staff.
        </span>
      </div>

      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Full Name"
            className="w-full px-4 py-3 text-sm rounded-full border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E6E5C]/20 focus:border-[#2E6E5C] transition-colors"
          />
          <input
            type="email"
            placeholder="Work Email"
            className="w-full px-4 py-3 text-sm rounded-full border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E6E5C]/20 focus:border-[#2E6E5C] transition-colors"
          />
          <input
            type="password"
            placeholder="Create Password"
            className="w-full px-4 py-3 text-sm rounded-full border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E6E5C]/20 focus:border-[#2E6E5C] transition-colors"
          />
        </div>

        <button
          type="submit"
          className="w-full flex items-center justify-center py-3 px-4 rounded-full bg-[#2E6E5C] hover:bg-[#25594b] active:scale-[0.99] text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#2E6E5C]/50 transition-all shadow-lg shadow-emerald-900/20 mt-6"
        >
          Sign Up
        </button>
      </form>

      <div className="mt-6 text-center">
        <button 
          type="button" 
          onClick={() => setView('login')}
          className="inline-flex items-center space-x-1.5 text-xs text-slate-500 font-medium hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Log In</span>
        </button>
      </div>
    </div>
  );
};

const ForgotForm: React.FC<{ setView: (v: AuthView) => void }> = ({ setView }) => {
  return (
    <div className="animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reset Password</h1>
        <p className="text-sm text-slate-500 font-medium pt-1">
          We'll send you instructions to recover your account.
        </p>
      </div>

      <div className="flex items-start space-x-2.5 p-3 mb-6 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] text-left leading-relaxed">
        <Shield className="w-4 h-4 mt-0.5 shrink-0 text-[#2E6E5C]" />
        <span>
          <strong>Note:</strong> Password recovery is handled by your IT department. An alert will be sent to administrators.
        </span>
      </div>

      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <input
          type="email"
          placeholder="Enter your email"
          className="w-full px-4 py-3 text-sm rounded-full border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E6E5C]/20 focus:border-[#2E6E5C] transition-colors"
        />

        <button
          type="submit"
          className="w-full flex items-center justify-center py-3 px-4 rounded-full bg-[#2E6E5C] hover:bg-[#25594b] active:scale-[0.99] text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#2E6E5C]/50 transition-all shadow-lg shadow-emerald-900/20 mt-6"
        >
          Send Reset Link
        </button>
      </form>

      <div className="mt-6 text-center">
        <button 
          type="button" 
          onClick={() => setView('login')}
          className="inline-flex items-center space-x-1.5 text-xs text-slate-500 font-medium hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Log In</span>
        </button>
      </div>
    </div>
  );
};
