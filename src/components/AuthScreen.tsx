import { CheckCircle2, Eye, EyeOff, KeyRound, ShieldCheck, Stethoscope, UserCog, Users } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest, isNativeAndroidRuntime, setNativeToken } from '../lib/api';
import type { User, UserRole } from '../types';

interface Props {
  onAuthenticated: (user: User) => void;
  onOpenPolicy: (tab: 'preferences' | 'privacy' | 'cookie-policy') => void;
}

export function AuthScreen({ onAuthenticated, onOpenPolicy }: Props) {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMIN');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    apiRequest<{ needsSetup: boolean }>('/api/auth/bootstrap-status')
      .then((res) => setNeedsSetup(res.needsSetup))
      .catch(() => setNeedsSetup(false));
  }, []);

  const handleBootstrap = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest<{ user: User; token?: string }>('/api/auth/bootstrap', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          password,
        }),
      });
      if (isNativeAndroidRuntime() && res.token) {
        setNativeToken(res.token);
      }
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete admin setup.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const res = await apiRequest<{ user: User; token?: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          expectedRole: selectedRole,
        }),
      });
      if (isNativeAndroidRuntime() && res.token) {
        setNativeToken(res.token);
      }
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const res = await apiRequest<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setNotice(res.message);
      setMode('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit reset request.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const res = await apiRequest<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, resetCode, newPassword }),
      });
      setNotice(res.message);
      setMode('login');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Clinical Identity Panel */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-8 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-3.5 py-1 text-xs font-semibold text-[#047857]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#059669]" />
              <span>100% Free Patient Registration · ₹0</span>
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1E40AF] text-white">
                  <Eye className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                    Divya Drusti Opticals
                  </h1>
                  <p className="text-sm text-slate-500">
                    Optical Clinic & Consultancy Management System
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4">
                <p className="text-sm font-semibold text-slate-900">Clinical Precision & Role Security</p>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Structured OD/OS refraction matrices, confidential optometric records, real-time patient intake synchronization, and GST optical billing.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 p-3.5">
                  <UserCog className="h-4 w-4 text-[#1E40AF]" />
                  <p className="mt-2 text-xs font-semibold text-slate-900">Clinic Admin</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">Full oversight, doctors, inventory & billing</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3.5">
                  <Stethoscope className="h-4 w-4 text-[#0284C7]" />
                  <p className="mt-2 text-xs font-semibold text-slate-900">Optometrist</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">Free registration, OD/OS exams & Rx</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3.5">
                  <Users className="h-4 w-4 text-[#059669]" />
                  <p className="mt-2 text-xs font-semibold text-slate-900">Receptionist</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">Free registration slips & appointments</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#059669]" />
              HttpOnly Encrypted Session · RBAC Protected
            </span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => onOpenPolicy('privacy')}
                className="font-medium text-[#1E40AF] hover:underline"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => onOpenPolicy('cookie-policy')}
                className="font-medium text-[#1E40AF] hover:underline"
              >
                Cookie Policy
              </button>
            </div>
          </div>
        </div>

        {/* Right Auth Card */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-8 flex flex-col justify-center">
          {needsSetup === null ? (
            <div className="py-12 text-center text-sm text-slate-500">Checking clinic configuration...</div>
          ) : needsSetup ? (
            <form onSubmit={handleBootstrap} className="space-y-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-semibold text-[#1E40AF]">
                  First-Time Clinic Initialization
                </span>
                <h2 className="mt-3 font-display text-xl font-bold text-slate-900">
                  Claim Clinic Admin Account
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Create the primary owner account for Divya Drusti Opticals. Once claimed, you can create Doctor and Receptionist accounts inside the dashboard.
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Owner Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dr. Rajeshwari Panda"
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@divyadrusti.in"
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 94370 11223"
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Password (min 8 characters)</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong clinic password"
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 pr-10 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#1E40AF] py-2.5 text-sm font-semibold text-white hover:bg-[#173bab] disabled:opacity-60 transition-colors"
              >
                {loading ? 'Initializing Clinic...' : 'Create Admin Account & Enter Clinic'}
              </button>
            </form>
          ) : mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900">Clinical Portal Sign In</h2>
                <p className="mt-1 text-sm text-slate-500">Select your staff role and authenticate securely.</p>
              </div>

              {/* Role Selector */}
              <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-slate-100 p-1">
                {(['ADMIN', 'DOCTOR', 'RECEPTIONIST'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className={`rounded-md py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                      selectedRole === r
                        ? 'bg-white text-[#1E40AF] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {r === 'ADMIN' ? 'Admin' : r === 'DOCTOR' ? 'Doctor' : 'Receptionist'}
                  </button>
                ))}
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
                  {error}
                </div>
              )}
              {notice && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700">
                  {notice}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@divyadrusti.in"
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setNotice('');
                      setMode('forgot');
                    }}
                    className="text-xs font-medium text-[#0284C7] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 pr-10 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#1E40AF] py-2.5 text-sm font-semibold text-white hover:bg-[#173bab] disabled:opacity-60 transition-colors"
              >
                {loading ? 'Verifying Credentials...' : `Sign In as ${selectedRole === 'ADMIN' ? 'Admin' : selectedRole === 'DOCTOR' ? 'Doctor' : 'Receptionist'}`}
              </button>
            </form>
          ) : mode === 'forgot' ? (
            <form onSubmit={handleForgot} className="space-y-4">
              <div className="flex items-center gap-2 text-[#1E40AF]">
                <KeyRound className="h-5 w-5" />
                <h2 className="font-display text-xl font-bold text-slate-900">Request Password Reset</h2>
              </div>
              <p className="text-sm text-slate-600">
                Submit your registered staff email. Your Clinic Admin will issue a one-time reset code inside Staff Management.
              </p>
              {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Staff Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@divyadrusti.in"
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-[#1E40AF] py-2.5 text-sm font-semibold text-white hover:bg-[#173bab] disabled:opacity-60"
                >
                  {loading ? 'Submitting...' : 'Submit Reset Request'}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Have a Code?
                </button>
              </div>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                Back to Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <h2 className="font-display text-xl font-bold text-slate-900">Complete Password Reset</h2>
              <p className="text-sm text-slate-600">
                Enter your email, the one-time reset code provided by your Clinic Admin, and your new password.
              </p>
              {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
              {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</div>}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">One-Time Reset Code</label>
                <input
                  type="text"
                  required
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="DDO-XXXXXX"
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm uppercase focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password (min 8 characters)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-[#1E40AF] py-2.5 text-sm font-semibold text-white hover:bg-[#173bab]"
                >
                  {loading ? 'Updating...' : 'Reset Password'}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
