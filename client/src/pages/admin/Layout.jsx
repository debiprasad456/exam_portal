import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import useExamStore from '../../stores/examStore';
import { getSocket } from '../../socket';

const NAV_ITEMS = [
  {
    to: '/admin/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    to: '/admin/questions',
    label: 'Questions',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: '/admin/exam',
    label: 'Exam Control',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: '/admin/results',
    label: 'Results',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

export default function AdminLayout() {
  const { email, logout, token } = useAuthStore();
  const { setExamStarted, setTick, setExamEnded, addLiveResult } = useExamStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('admin:join', token);

    socket.on('exam:started', ({ subject, duration, timeLeft }) => {
      setExamStarted(subject, timeLeft, null);
    });
    socket.on('exam:tick', ({ subject, timeLeft }) => {
      setTick(subject, timeLeft);
    });
    socket.on('exam:ended', ({ subject }) => {
      setExamEnded(subject);
    });
    socket.on('result:new', ({ result }) => {
      addLiveResult(result);
    });

    return () => {
      socket.off('exam:started');
      socket.off('exam:tick');
      socket.off('exam:ended');
      socket.off('result:new');
    };
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const renderSidebarContent = (onNavClick) => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-white border-opacity-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 px-2 py-1 rounded-xl bg-dark-700/80 border border-white/10 flex items-center justify-center shadow-md flex-shrink-0">
            <img src="/Logo1.jpg" alt="DS Exam Portal Logo" className="h-full w-auto max-w-[65px] object-contain rounded" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">DS Exam Portal</p>
            <p className="text-primary-400 text-xs mt-0.5">Admin Panel</p>
          </div>
        </div>

        {/* Close Button for Mobile Drawer */}
        {onNavClick && (
          <button
            onClick={onNavClick}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-500 bg-opacity-20 text-primary-400 border border-primary-500 border-opacity-30'
                  : 'text-slate-400 hover:text-white hover:bg-white hover:bg-opacity-5'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-white border-opacity-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-xs font-bold text-white">
            {email?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{email}</p>
            <p className="text-slate-500 text-xs">Administrator</p>
          </div>
        </div>
        <button
          id="admin-logout-btn"
          onClick={() => {
            if (onNavClick) onNavClick();
            handleLogout();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 text-sm hover:text-red-400 hover:bg-red-500 hover:bg-opacity-10 transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col md:flex-row h-screen bg-dark-900 overflow-hidden">
      {/* Mobile Top Header */}
      <header className="flex md:hidden items-center justify-between p-4 bg-dark-800 border-b border-white border-opacity-5 flex-shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button
            id="admin-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
            aria-label="Open navigation menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="h-8 px-2 py-0.5 rounded-lg bg-dark-700/80 border border-white/10 flex items-center justify-center shadow-md flex-shrink-0">
              <img src="/Logo1.jpg" alt="DS Exam Portal Logo" className="h-full w-auto max-w-[55px] object-contain rounded" />
            </div>
            <span className="text-white font-bold text-sm">DS Exam Portal</span>
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-xs font-bold text-white">
          {email?.[0]?.toUpperCase() || 'A'}
        </div>
      </header>

      {/* Mobile Side Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Side Drawer */}
      {mobileMenuOpen && (
        <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-dark-800 border-r border-white border-opacity-10 flex flex-col md:hidden shadow-2xl animate-slide-right">
          {renderSidebarContent(() => setMobileMenuOpen(false))}
        </aside>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-dark-800 border-r border-white border-opacity-5 flex-col">
        {renderSidebarContent(null)}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto min-w-0">
        <Outlet />
      </main>
    </div>
  );
}

