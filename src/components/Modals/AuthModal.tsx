/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  LogIn,
  UserPlus,
  Shield,
  User,
  Key,
  Mail,
  LogOut,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Gamepad2,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Globe
} from 'lucide-react';
import {
  loginWithGoogle,
  loginViaAuthBridge,
  registerWithUsernameAndPassword,
  loginWithUsernameOrEmail,
  logoutUser,
  UserProfile
} from '../../firebase/userService.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  isMandatory?: boolean;
  onAuthSuccess: (profile: UserProfile) => void;
  onContinueAsGuest: (guestCallsign?: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isMandatory = false,
  onAuthSuccess,
  onContinueAsGuest
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'guest'>('signin');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [guestCallsign, setGuestCallsign] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [domainNotice, setDomainNotice] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);

  if (!isOpen) return null;

  const isGuestSession = currentUser?.authProvider === 'guest';

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const profile = await loginWithGoogle();
      setSuccessMsg(`Welcome, Operator ${profile.username}!`);
      setDomainNotice(null);
      onAuthSuccess(profile);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      const isCancelled =
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.includes('popup-closed-by-user') ||
        err?.message?.includes('cancelled-popup-request');

      if (isCancelled) {
        // User closed the popup window voluntarily; reset state cleanly
        setError(null);
        return;
      }

      const isDomainError =
        err?.code === 'auth/unauthorized-domain' ||
        err?.message?.includes('unauthorized-domain') ||
        err?.message?.includes('not authorized to run this operation');

      if (isDomainError) {
        setDomainNotice(window.location.hostname || 'ominx-vanguard-fps.ai.studio');
        setError('Domain Authorization Required: Google login on this URL requires adding the domain to Firebase or using the Auth Bridge below.');
      } else {
        console.warn('Google auth notice:', err?.message || err);
        setError(err?.message || 'Failed to authenticate via Google. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchBridge = async () => {
    try {
      setLoading(true);
      setError(null);
      const profile = await loginViaAuthBridge();
      setSuccessMsg(`Welcome, Operator ${profile.username}!`);
      setDomainNotice(null);
      onAuthSuccess(profile);
      setTimeout(() => onClose(), 1000);
    } catch (err: any) {
      const isCancelled =
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.includes('popup-closed-by-user');

      if (isCancelled) {
        setError(null);
        return;
      }
      console.warn('Auth bridge notice:', err?.message || err);
      setError(err?.message || 'Auth Bridge failed. Please ensure popups are allowed in browser settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (mode === 'signup') {
      if (!username.trim() || username.trim().length < 2) {
        setError('Callsign must be at least 2 characters.');
        return;
      }
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
    } else {
      if (!username.trim()) {
        setError('Please enter your callsign or email.');
        return;
      }
      if (!password) {
        setError('Please enter your password.');
        return;
      }
    }

    try {
      setLoading(true);
      if (mode === 'signup') {
        const profile = await registerWithUsernameAndPassword(username, email, password);
        setSuccessMsg(`Account created for ${profile.username}! Starter +100 Coins credited.`);
        onAuthSuccess(profile);
        setTimeout(() => onClose(), 1200);
      } else {
        const profile = await loginWithUsernameOrEmail(username, password);
        setSuccessMsg(`Welcome back, ${profile.username}!`);
        onAuthSuccess(profile);
        setTimeout(() => onClose(), 1000);
      }
    } catch (err: any) {
      console.warn('Auth feedback:', err?.message || err);
      let msg = err?.message || 'Authentication failed.';
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
        msg = 'Invalid callsign or password. Please re-check.';
      } else if (msg.includes('auth/email-already-in-use')) {
        msg = 'This callsign/email is already registered. Please sign in instead.';
      } else if (msg.includes('auth/weak-password')) {
        msg = 'Password is too weak. Please use at least 6 characters.';
      } else if (msg.includes('auth/popup-closed-by-user')) {
        msg = 'Sign-in window closed before completing.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onContinueAsGuest(guestCallsign.trim() || undefined);
    onClose();
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      try {
        localStorage.removeItem('vanguard.guest_profile');
      } catch {}
      await logoutUser();
      setSuccessMsg('Signed out of session.');
      setTimeout(() => {
        // Will re-trigger mandatory login
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-mono select-none"
      onClick={e => {
        if (!isMandatory && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-[#090d15] border border-cyan-500/40 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-[0_0_60px_rgba(6,182,212,0.25)] text-zinc-200 flex flex-col max-h-[92dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-zinc-800 mb-4 shrink-0">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-base tracking-wider">
            <Shield className="w-5 h-5 text-cyan-400" />
            <span>{isMandatory ? 'MANDATORY OPERATOR ACCESS' : 'OPERATOR ACCOUNT'}</span>
          </div>
          {!isMandatory && (
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Mandatory Requirement Notice */}
        {isMandatory && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold text-amber-300">CLEARANCE REQUIRED:</span> An account is required to deploy into the arena. Sign in with Google, register with credentials, or proceed with <b>Use as Guest</b>.
            </div>
          </div>
        )}

        {/* If user is already logged in with a full account or guest, show dossier */}
        {currentUser && !isMandatory ? (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border ${isGuestSession ? 'bg-zinc-900/80 border-amber-500/30' : 'bg-zinc-900/80 border-cyan-500/30'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black text-black shadow-lg ${isGuestSession ? 'bg-gradient-to-br from-amber-400 to-orange-600' : 'bg-gradient-to-br from-cyan-400 to-blue-600'}`}>
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt="Avatar"
                      className="w-full h-full rounded-xl object-cover"
                    />
                  ) : (
                    currentUser.username.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold tracking-widest flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isGuestSession ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`}></span>
                    <span className={isGuestSession ? 'text-amber-400' : 'text-emerald-400'}>
                      {isGuestSession ? 'GUEST OPERATOR (LOCAL)' : 'VERIFIED CLOUD OPERATOR'}
                    </span>
                  </div>
                  <div className="text-base font-black text-white truncate">{currentUser.username}</div>
                  <div className="text-[10px] text-zinc-400 truncate">{currentUser.email}</div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 border-t border-zinc-800 pt-3 text-center">
                <div className="bg-black/50 p-2 rounded-lg border border-zinc-800/80">
                  <div className="text-[9px] text-zinc-500 font-bold">RANK</div>
                  <div className="text-xs font-black text-amber-400">{currentUser.rank || 'RECRUIT'}</div>
                </div>
                <div className="bg-black/50 p-2 rounded-lg border border-zinc-800/80">
                  <div className="text-[9px] text-zinc-500 font-bold">LEVEL</div>
                  <div className="text-xs font-black text-cyan-300">LVL {currentUser.level}</div>
                </div>
                <div className="bg-black/50 p-2 rounded-lg border border-zinc-800/80">
                  <div className="text-[9px] text-zinc-500 font-bold">COINS</div>
                  <div className="text-xs font-black text-amber-300">{currentUser.coins} ⛁</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2 text-center text-xs">
                <div className="bg-black/40 p-1.5 rounded border border-zinc-800 text-[10px] text-zinc-300">
                  KILLS: <span className="text-emerald-400 font-bold">{currentUser.kills}</span>
                </div>
                <div className="bg-black/40 p-1.5 rounded border border-zinc-800 text-[10px] text-zinc-300">
                  DEATHS: <span className="text-red-400 font-bold">{currentUser.deaths}</span>
                </div>
              </div>
            </div>

            {isGuestSession && (
              <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl space-y-2">
                <div className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> UPGRADE TO PERMANENT ACCOUNT
                </div>
                <p className="text-[10px] text-zinc-400">
                  Link with Google or create an account to save your stats to Firebase Firestore and retain progress on any device.
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="flex-1 py-2 px-3 bg-white hover:bg-zinc-200 text-black font-bold text-[11px] rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    LINK GOOGLE
                  </button>
                  <button
                    onClick={() => {
                      setMode('signup');
                    }}
                    className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    REGISTER CALLSIGN
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="flex-1 py-2.5 bg-red-950/70 hover:bg-red-900 border border-red-500/40 text-red-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> {isGuestSession ? 'RESET GUEST' : 'SIGN OUT'}
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-black font-black text-xs rounded-xl transition cursor-pointer"
              >
                RESUME COMBAT
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Google One-Click Login Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-3 transition transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>CONTINUE WITH GOOGLE</span>
            </button>

            {/* Custom Domain Helper / Notice */}
            {domainNotice && (
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs space-y-2.5 shadow-lg animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <Globe className="w-4 h-4 text-amber-400" />
                    <span>FIREBASE DOMAIN AUTHORIZATION</span>
                  </div>
                  <span className="text-[10px] text-amber-300 font-mono bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                    ACTION REQUIRED
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Google Login on <span className="text-cyan-300 font-bold">{domainNotice}</span> requires whitelisting this domain in your Firebase Console, or using the pre-authorized Auth Bridge below.
                </p>

                <div className="bg-black/60 p-2.5 rounded-lg border border-zinc-800 space-y-2">
                  <div className="text-[10px] text-zinc-400 font-bold">DOMAINS TO ADD IN FIREBASE AUTH:</div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between bg-zinc-900 px-2.5 py-1.5 rounded border border-zinc-700/60">
                      <span className="text-cyan-300 font-mono text-[11px] select-all">ominx-vanguard-fps.ai.studio</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText('ominx-vanguard-fps.ai.studio');
                          setCopiedDomain('custom');
                          setTimeout(() => setCopiedDomain(null), 2000);
                        }}
                        className="text-[10px] text-cyan-400 hover:text-cyan-200 flex items-center gap-1 cursor-pointer font-bold"
                      >
                        {copiedDomain === 'custom' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedDomain === 'custom' ? 'COPIED' : 'COPY'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between bg-zinc-900 px-2.5 py-1.5 rounded border border-zinc-700/60">
                      <span className="text-cyan-300 font-mono text-[11px] select-all">ai.studio</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText('ai.studio');
                          setCopiedDomain('wildcard');
                          setTimeout(() => setCopiedDomain(null), 2000);
                        }}
                        className="text-[10px] text-cyan-400 hover:text-cyan-200 flex items-center gap-1 cursor-pointer font-bold"
                      >
                        {copiedDomain === 'wildcard' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedDomain === 'wildcard' ? 'COPIED' : 'COPY'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <a
                    href="https://console.firebase.google.com/project/mindful-quartet-tjq9c/authentication/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] rounded-lg transition flex items-center justify-center gap-1.5 text-center cursor-pointer shadow-md"
                  >
                    <span>FIREBASE CONSOLE</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={handleLaunchBridge}
                    disabled={loading}
                    className="flex-1 py-2 px-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[11px] rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>LAUNCH AUTH BRIDGE</span>
                  </button>
                </div>
              </div>
            )}

            {/* Sub-hint for custom domains */}
            {!domainNotice && (typeof window !== 'undefined' && window.location.hostname.includes('ai.studio')) && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setDomainNotice(window.location.hostname)}
                  className="text-[10px] text-zinc-500 hover:text-cyan-400 underline transition cursor-pointer"
                >
                  Running on custom URL (ominx-vanguard-fps.ai.studio)? View domain authorization guide
                </button>
              </div>
            )}

            {/* Quick Guest Access Card */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-700/80 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black text-amber-400 flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5" /> USE AS GUEST
                </span>
                <span className="text-[9px] text-zinc-500 uppercase tracking-wider">No password needed</span>
              </div>
              <p className="text-[10px] text-zinc-400 mb-2.5">
                Play immediately as an anonymous guest. Progress is stored locally on this device.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={guestCallsign}
                  onChange={e => setGuestCallsign(e.target.value)}
                  placeholder="Optional guest callsign"
                  maxLength={20}
                  className="min-w-0 flex-1 bg-black/70 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-amber-400 transition"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleGuestSubmit();
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleGuestSubmit()}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-lg transition flex items-center gap-1 shadow-[0_0_12px_rgba(245,158,11,0.25)] cursor-pointer shrink-0"
                >
                  <span>PLAY AS GUEST</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-[1px] bg-zinc-800"></div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                OR WITH CALLSIGN & PASSWORD
              </span>
              <div className="flex-1 h-[1px] bg-zinc-800"></div>
            </div>

            {/* Mode Toggle (Sign In vs Register) */}
            <div className="flex bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-cyan-500 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" /> SIGN IN
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" /> NEW RECRUIT
              </button>
            </div>

            {/* Feedback Messages */}
            {error && (
              <div className="p-2.5 bg-red-950/80 border border-red-500/50 rounded-xl text-red-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] text-zinc-400 font-bold block mb-1">
                  {mode === 'signup' ? 'CALLSIGN (USERNAME)' : 'CALLSIGN OR EMAIL'}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder={mode === 'signup' ? 'e.g. Ghost_Operator' : 'Enter callsign or email'}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-cyan-400 transition"
                    autoComplete="username"
                  />
                </div>
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1">
                    EMAIL (OPTIONAL)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="operator@example.com (optional)"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-cyan-400 transition"
                      autoComplete="email"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] text-zinc-400 font-bold block mb-1">PASSWORD</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-cyan-400 transition"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2.5 rounded-xl font-black text-xs transition cursor-pointer mt-2 ${
                  mode === 'signup'
                    ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                }`}
              >
                {loading
                  ? 'COMMUNICATING WITH SATELLITE...'
                  : mode === 'signup'
                  ? 'CREATE ACCOUNT & DEPLOY'
                  : 'SIGN IN TO VANGUARD'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
