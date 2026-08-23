import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../../socket';
import { getExamStatus, cleanupCandidate } from '../../api';
import useCandidateStore from '../../stores/candidateStore';

const SUBJECT_LABELS = {
  marketing: 'Marketing',
  hr: 'Human Resources',
  digital_marketing: 'Digital Marketing',
  general_reasoning: 'General Reasoning',
};

const SUBJECT_ICONS = { marketing: '📈', hr: '🤝', digital_marketing: '💻', general_reasoning: '🧠' };

export default function Waiting() {
  const { candidateId, name, subject, token, clear } = useCandidateStore();
  const [status, setStatus] = useState('waiting');
  const [dots, setDots] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!candidateId || !subject) { navigate('/'); return; }

    // Check current exam status on load
    getExamStatus()
      .then(({ data }) => {
        const subjectStatus = data[subject];
        if (subjectStatus?.status === 'active') {
          navigate('/exam');
        } else if (subjectStatus?.status === 'ended') {
          setStatus('ended');
        }
      })
      .catch(() => {});

    // Connect socket with authenticated join
    const socket = getSocket();
    socket.emit('candidate:join', { token, candidateId, subject });

    socket.on('exam:started', ({ subject: startedSubject }) => {
      if (startedSubject === subject) {
        setStatus('starting');
        setTimeout(() => navigate('/exam'), 1500);
      }
    });

    socket.on('exam:ended', ({ subject: endedSubject }) => {
      if (endedSubject === subject) {
        setStatus('ended');
      }
    });

    return () => {
      socket.off('exam:started');
      socket.off('exam:ended');
    };
  }, []);

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  if (!candidateId) return null;

  return (
    <div className="min-h-screen page-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg text-center animate-fade-in">

        {/* Status-based display */}
        {status === 'waiting' && (
          <>
            {/* Animated waiting indicator */}
            <div className="relative inline-flex items-center justify-center mb-8">
              <div className="w-28 h-28 rounded-full border-4 border-primary-500/20 animate-ping absolute" />
              <div className="w-24 h-24 rounded-full border-4 border-primary-500/40 animate-ping absolute" style={{ animationDelay: '0.5s' }} />
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-3xl shadow-lg shadow-primary-500/30 relative z-10">
                {SUBJECT_ICONS[subject]}
              </div>
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">Waiting for Exam to Begin{dots}</h1>
            <p className="text-slate-400 mb-8">The admin will start your exam shortly. Please stay on this page.</p>

            <div className="glass-card p-6 text-left space-y-3 mb-8">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Name</span>
                <span className="text-white font-medium">{name}</span>
              </div>
              <div className="w-full h-px bg-white/5" />
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Subject</span>
                <span className="text-primary-300 font-medium">{SUBJECT_LABELS[subject]}</span>
              </div>
              <div className="w-full h-px bg-white/5" />
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Status</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                  <span className="text-amber-400 text-sm font-medium">Waiting</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <p>🔒 Do not refresh or close this page.</p>
              <p>⏱ The exam will start automatically when the admin begins.</p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5">
              <button
                onClick={async () => {
                  if (candidateId) {
                    try { await cleanupCandidate(candidateId); } catch {}
                  }
                  clear();
                  navigate('/');
                }}
                className="px-4 py-2 text-sm text-slate-400 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-lg transition-colors border border-white/10 hover:border-red-500/30 inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Leave Exam & Return to Login
              </button>
            </div>
          </>
        )}

        {status === 'starting' && (
          <>
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg shadow-emerald-500/30 animate-bounce">
              🚀
            </div>
            <h1 className="text-3xl font-bold text-emerald-400 mb-3">Exam Starting!</h1>
            <p className="text-slate-400">Redirecting you to the exam room...</p>
            <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mt-6" />
          </>
        )}

        {status === 'ended' && (
          <>
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-4xl mx-auto mb-6">
              🕐
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Exam Has Ended</h1>
            <p className="text-slate-400 mb-6">
              The <strong className="text-white">{SUBJECT_LABELS[subject]}</strong> exam session has ended before you could take it.
              Please contact the administrator for more information.
            </p>
            <button
              onClick={() => { clear(); navigate('/'); }}
              className="btn-ghost"
            >
              ← Back to Registration
            </button>
          </>
        )}
      </div>
    </div>
  );
}
