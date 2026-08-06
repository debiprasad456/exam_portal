import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { verifyToken } from '../api';

export default function ProtectedRoute({ children }) {
  const { token, logout } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    verifyToken()
      .then(() => setValid(true))
      .catch(() => { logout(); setValid(false); })
      .finally(() => setChecking(false));
  }, [token]);

  if (checking) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!token || !valid) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
