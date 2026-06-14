import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { auth } from '../../firebase';

export default function AdminLogin() {
  const [activeTab, setActiveTab] = useState('email'); // email, google, phone
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // Phone OTP States
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmResult, setConfirmResult] = useState(null);
  const [phoneLoading, setPhoneLoading] = useState(false);

  // Errors / Info States
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');
  
  const { login, loginWithGoogle, setupRecaptcha, sendPhoneOTP, user, isAdmin, loading: authLoading, authError, clearAuthError } = useAuth();
  const navigate = useNavigate();

  // Only redirect to admin dashboard when auth is fully resolved AND user is confirmed admin
  useEffect(() => {
    console.log("[AdminLogin] Auth state check — loading:", authLoading, "user:", user?.email || "null", "isAdmin:", isAdmin);
    if (!authLoading && user && isAdmin) {
      console.log("[AdminLogin] User is admin — redirecting to /admin");
      navigate('/admin', { replace: true });
    }
    // Do NOT redirect to '/' here — if user is not admin, AuthContext handles sign-out
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (authError) {
      setError(`Login failed. Code: ${authError.code}. Message: ${authError.message}`);
    }
  }, [authError]);

  // Reset errors when changing tabs
  useEffect(() => {
    setError('');
    if (clearAuthError) clearAuthError();
  }, [activeTab]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await login(email.trim(), password);
      // Don't navigate here — the useEffect above will redirect once auth state settles
    } catch (err) {
      console.error("Firebase Error:", err);
      console.error("Code:", err.code);
      console.error("Message:", err.message);
      setError(`Login failed. Code: ${err.code || 'unknown'}. Message: ${err.message || 'Invalid admin credentials.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setResetError('Please enter your email address.');
      return;
    }

    setResetLoading(true);
    setResetError('');
    setResetSuccess('');

    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetSuccess('Password reset link sent. Check your inbox.');
      setResetEmail('');
    } catch (err) {
      console.error("Firebase Error:", err);
      console.error("Code:", err.code);
      console.error("Message:", err.message);
      if (err.code === 'auth/user-not-found') {
        setResetError('No account found with this email.');
      } else if (err.code === 'auth/invalid-email') {
        setResetError('Please enter a valid email address.');
      } else if (err.code === 'auth/too-many-requests') {
        setResetError('Too many requests. Please try again later.');
      } else {
        setResetError(`Failed to send reset link. Code: ${err.code || 'unknown'}. Message: ${err.message || err.toString()}`);
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      // Don't navigate here — the useEffect above will redirect once auth state settles
    } catch (err) {
      console.error("Firebase Error:", err);
      console.error("Code:", err.code);
      console.error("Message:", err.message);
      setError(`Google Sign-in failed. Code: ${err.code || 'unknown'}. Message: ${err.message || err.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!phone) {
      setError('Please enter phone number (with country code, e.g. +919999999999).');
      return;
    }

    setPhoneLoading(true);
    setError('');

    try {
      const verifier = setupRecaptcha('recaptcha-container');
      const confirmationResult = await sendPhoneOTP(phone.trim(), verifier);
      setConfirmResult(confirmationResult);
      setOtpSent(true);
    } catch (err) {
      console.error("Firebase Error:", err);
      console.error("Code:", err.code);
      console.error("Message:", err.message);
      setError(`Failed to send OTP code. Code: ${err.code || 'unknown'}. Message: ${err.message || err.toString()}`);
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!verificationCode) {
      setError('Please enter verification code.');
      return;
    }

    setPhoneLoading(true);
    setError('');

    try {
      await confirmResult.confirm(verificationCode);
      navigate('/admin', { replace: true });
    } catch (err) {
      console.error("Firebase Error:", err);
      console.error("Code:", err.code);
      console.error("Message:", err.message);
      setError(`Verification failed. Code: ${err.code || 'unknown'}. Message: ${err.message || 'Invalid OTP verification code.'}`);
    } finally {
      setPhoneLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-transparent flex items-center justify-center p-4">
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Recaptcha Container */}
      <div id="recaptcha-container" className="hidden"></div>

      {/* Login Card */}
      <div 
        className="relative w-full max-w-md p-8 rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden shadow-2xl"
        style={{
          boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)'
        }}
      >
        <div className="flex flex-col gap-2 mb-6 text-center">
          <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">
            SECURE ACCESS
          </span>
          <h2 className="text-2xl font-normal tracking-tight text-white uppercase">
            AUTOSCALE ADMIN
          </h2>
        </div>

        {/* Tab Headers */}
        {!showForgotPassword && (
          <div className="flex border-b border-white/10 mb-6 text-xs uppercase tracking-wider font-semibold">
            <button
              onClick={() => setActiveTab('email')}
              className={`flex-1 pb-3 text-center transition-all ${activeTab === 'email' ? 'border-b-2 border-white text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Email
            </button>
            <button
              onClick={() => setActiveTab('google')}
              className={`flex-1 pb-3 text-center transition-all ${activeTab === 'google' ? 'border-b-2 border-white text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Google
            </button>
            <button
              onClick={() => setActiveTab('phone')}
              className={`flex-1 pb-3 text-center transition-all ${activeTab === 'phone' ? 'border-b-2 border-white text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Phone OTP
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-3 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded-lg text-center font-medium">
            {error}
          </div>
        )}

        {showForgotPassword ? (
          <div>
            <p className="text-sm text-gray-300 mb-6 text-center">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            {resetError && (
              <div className="mb-4 p-3 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded-lg text-center font-medium">
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div className="mb-4 p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg text-center font-medium">
                {resetSuccess}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                  placeholder="admin@autoscale.systems"
                />
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full py-3 rounded-lg bg-white text-black text-xs font-semibold tracking-wider hover:bg-gray-100 transition duration-200 disabled:opacity-50 uppercase flex items-center justify-center"
              >
                {resetLoading ? 'SENDING...' : 'SEND RESET LINK'}
              </button>
            </form>

            <button
              onClick={() => {
                setShowForgotPassword(false);
                setResetError('');
                setResetSuccess('');
                setResetEmail('');
              }}
              className="w-full mt-4 text-center text-xs text-gray-400 hover:text-white transition duration-200 tracking-wider uppercase"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <div>
            {/* Tab Contents: Email */}
            {activeTab === 'email' && (
              <form onSubmit={handleEmailLogin} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                    placeholder="admin@autoscale.systems"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded border transition duration-200 flex items-center justify-center ${rememberMe ? 'bg-white border-white' : 'border-white/20 bg-transparent group-hover:border-white/40'}`}>
                        {rememberMe && (
                          <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-medium tracking-wider text-gray-400 uppercase group-hover:text-gray-300 transition duration-200">
                      Remember me
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setError('');
                      setResetEmail(email);
                    }}
                    className="text-[10px] font-medium tracking-wider text-gray-400 uppercase hover:text-white transition duration-200"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg bg-white text-black text-xs font-semibold tracking-wider hover:bg-gray-100 transition duration-200 disabled:opacity-50 uppercase flex items-center justify-center mt-6"
                >
                  {loading ? 'AUTHENTICATING...' : 'ENTER DASHBOARD'}
                </button>
              </form>
            )}

            {/* Tab Contents: Google */}
            {activeTab === 'google' && (
              <div className="space-y-6 py-4">
                <p className="text-sm text-gray-400 text-center font-light leading-relaxed">
                  Authenticate securely using your linked Google administrator account.
                </p>
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-3 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-white text-xs font-semibold tracking-wider hover:bg-white/10 transition duration-200 disabled:opacity-50 uppercase flex items-center justify-center gap-2.5"
                >
                  {loading ? (
                    'AUTHORIZING...'
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                      </svg>
                      <span>Sign in with Google</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Tab Contents: Phone OTP */}
            {activeTab === 'phone' && (
              <div>
                {!otpSent ? (
                  <form onSubmit={handleSendOTP} className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase mb-1.5">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                        placeholder="+919999999999"
                      />
                      <span className="text-[10px] text-gray-500 mt-1.5 block leading-normal">
                        Include country code (e.g. +91 for India). reCAPTCHA verification runs in the background.
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={phoneLoading}
                      className="w-full py-3 rounded-lg bg-white text-black text-xs font-semibold tracking-wider hover:bg-gray-100 transition duration-200 disabled:opacity-50 uppercase flex items-center justify-center"
                    >
                      {phoneLoading ? 'SENDING OTP...' : 'SEND OTP CODE'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOTP} className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase mb-1.5">
                        OTP Verification Code
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white transition duration-200 text-center tracking-[0.5em] font-mono"
                        placeholder="000000"
                      />
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[10px] text-gray-500">
                          Code sent to {phone}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setOtpSent(false);
                            setVerificationCode('');
                          }}
                          className="text-[10px] text-white hover:underline uppercase tracking-wider font-semibold"
                        >
                          Change Number
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={phoneLoading}
                      className="w-full py-3 rounded-lg bg-white text-black text-xs font-semibold tracking-wider hover:bg-gray-100 transition duration-200 disabled:opacity-50 uppercase flex items-center justify-center"
                    >
                      {phoneLoading ? 'VERIFYING...' : 'VERIFY & SIGN IN'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
