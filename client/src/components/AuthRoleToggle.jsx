import { useNavigate } from 'react-router-dom';

export default function AuthRoleToggle({ activeRole }) {
  const navigate = useNavigate();

  return (
    <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-white/10 mb-6 shadow-inner">
      <button
        id="toggle-candidate-btn"
        type="button"
        onClick={() => navigate('/')}
        className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
          activeRole === 'candidate'
            ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-md shadow-primary-500/25'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <span className="text-base">👤</span>
        <span>Candidate Portal</span>
      </button>
      <button
        id="toggle-admin-btn"
        type="button"
        onClick={() => navigate('/admin/login')}
        className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
          activeRole === 'admin'
            ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-md shadow-primary-500/25'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <span className="text-base">👑</span>
        <span>Admin Portal</span>
      </button>
    </div>
  );
}
