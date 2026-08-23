import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import { adminLogin, adminSetup, checkAdminExists } from '../../api';
import AuthRoleToggle from '../../components/AuthRoleToggle';

export default function AdminLogin() {
  const [mode, setMode] = useState('login'); // 'login' | 'setup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const { login, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) { navigate('/admin/dashboard'); return; }
    checkAdminExists()
      .then(({ data }) => { if (!data.exists) setMode('setup'); })
      .catch((err) => {
        if (!err.response) {
          setError('Backend server is waking up or unreachable. Please wait 10 seconds and refresh the page.');
        }
      })
      .finally(() => setChecking(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'setup') {
        await adminSetup(email, password);
        setMode('login');
        setError('');
        setEmail('');
        setPassword('');
        alert('Admin account created! Please login.');
      } else {
        const { data } = await adminLogin(email, password);
        login(data.token, data.email);
        navigate('/admin/dashboard');
      }
    } catch (err) {
      if (!err.response) {
        setError('Cannot connect to backend server. Render free backend may be starting up—please wait 10–20 seconds and click Sign In again.');
      } else {
        setError(err.response?.data?.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen page-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center px-4 py-2 rounded-2xl bg-dark-800/90 border border-white/10 mb-4 shadow-xl shadow-primary-500/15">
            <img src="/Logo1.jpg" alt="DS Logo" className="h-12 w-auto max-w-[160px] object-contain rounded-lg" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">DS Exam Portal</h1>
          <p className="text-slate-400 mt-2">
            {mode === 'setup' ? 'Create your admin account to get started' : 'Sign in to your admin panel'}
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-5 sm:p-8">
          <AuthRoleToggle activeRole="admin" />
          <h2 className="text-xl font-semibold text-white mb-6">
            {mode === 'setup' ? '🛠️ First-time Setup' : '👑 Admin Login'}
          </h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="form-label">Email Address</label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="form-input"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'setup' ? 'Min. 6 characters' : '••••••••'}
                  className="form-input pr-11"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.027 10.027 0 013.68-.788c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-1.563 3.029m-5.858 5.908L3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              id="admin-submit-btn"
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {mode === 'setup' ? 'Creating account...' : 'Signing in...'}
                </span>
              ) : (
                mode === 'setup' ? 'Create Admin Account' : 'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          DS Exam Portal • Admin Panel • Secured with JWT
        </p>
      </div>
    </div>
  );
}
