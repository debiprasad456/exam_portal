import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import { adminLogin, adminSetup, checkAdminExists } from '../../api';
import AuthRoleToggle from '../../components/AuthRoleToggle';

export default function AdminLogin() {
  const [mode, setMode] = useState('login'); // 'login' | 'setup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
          setError('Cannot connect to backend server. Please make sure the backend server is running on http://localhost:5000.');
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
        setError('Cannot connect to backend server. Please ensure the backend server is running (npm run dev / node server.js inside server directory).');
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 mb-4 shadow-lg shadow-primary-500/30">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold gradient-text">DS Exam Portal</h1>
          <p className="text-slate-400 mt-2">
            {mode === 'setup' ? 'Create your admin account to get started' : 'Sign in to your admin panel'}
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
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
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'setup' ? 'Min. 6 characters' : '••••••••'}
                className="form-input"
                required
                minLength={6}
              />
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
