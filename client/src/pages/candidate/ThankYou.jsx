import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useCandidateStore from '../../stores/candidateStore';

const SUBJECT_LABELS = {
  marketing: 'Marketing',
  hr: 'Human Resources',
  digital_marketing: 'Digital Marketing',
  general_reasoning: 'General Reasoning',
};

export default function ThankYou() {
  const { name, subject, clear } = useCandidateStore();
  const navigate = useNavigate();

  // Clear candidate data after showing thank you
  useEffect(() => {
    const timer = setTimeout(() => clear(), 10000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen page-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg text-center animate-slide-up">
        {/* Success animation */}
        <div className="relative inline-flex items-center justify-center mb-8">
          {/* Glowing rings */}
          <div className="w-40 h-40 rounded-full border-4 border-emerald-500/10 absolute animate-ping" style={{ animationDuration: '3s' }} />
          <div className="w-32 h-32 rounded-full border-4 border-emerald-500/20 absolute animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
          {/* Main icon */}
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/40 relative z-10">
            <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-white mb-3">
          Exam Submitted! 🎉
        </h1>
        <p className="text-slate-400 text-lg mb-8">
          Thank you <strong className="text-white">{name || 'Candidate'}</strong>! Your answers have been recorded successfully.
        </p>

        {/* Details card */}
        <div className="glass-card p-6 text-left space-y-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              ✅
            </div>
            <div>
              <p className="text-white font-medium text-sm">Submission Confirmed</p>
              <p className="text-slate-500 text-xs">Your exam has been saved and is under review</p>
            </div>
          </div>
          <div className="w-full h-px bg-white/5" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-300">
              📚
            </div>
            <div>
              <p className="text-white font-medium text-sm">Subject: {SUBJECT_LABELS[subject] || 'N/A'}</p>
              <p className="text-slate-500 text-xs">Your exam category</p>
            </div>
          </div>
          <div className="w-full h-px bg-white/5" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
              📊
            </div>
            <div>
              <p className="text-white font-medium text-sm">Results with Administrator</p>
              <p className="text-slate-500 text-xs">Your score will be reviewed by the exam administrator</p>
            </div>
          </div>
        </div>

        <div className="text-slate-500 text-sm space-y-2">
          <p>🔒 Your exam cannot be retaken once submitted.</p>
          <p>📧 Contact your administrator for result details.</p>
        </div>

        <button
          onClick={() => { clear(); navigate('/'); }}
          className="btn-ghost mt-8"
          id="back-to-home-btn"
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
}
