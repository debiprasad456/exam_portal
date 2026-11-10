import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCandidateQuestions, submitExam, getCandidateSession, cleanupCandidate } from '../../api';
import { getSocket } from '../../socket';
import useCandidateStore from '../../stores/candidateStore';

export default function ExamRoom() {
  const { candidateId, subject, name, token, setSubmitted, hasSubmitted, clear } = useCandidateStore();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { questionId: selectedIndex }
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmittedLocal] = useState(false);
  const [error, setError] = useState('');
  const autoSubmitRef = useRef(false);

  useEffect(() => {
    if (!candidateId || !subject) { navigate('/'); return; }
    if (hasSubmitted) { navigate('/thankyou'); return; }

    // Load questions
    getCandidateQuestions(subject)
      .then(({ data }) => setQuestions(data))
      .catch(() => setError('Failed to load questions. Please refresh.'))
      .finally(() => setLoading(false));

    // Fetch individual candidate timer session
    getCandidateSession(candidateId)
      .then(({ data }) => {
        if (data.status === 'ended') {
          navigate('/thankyou');
          return;
        }
        if (data.status === 'active') {
          setTimeLeft(data.timeLeft || 0);
          setDuration(data.duration || 0);
          if (data.timeLeft <= 0 && !autoSubmitRef.current) {
            autoSubmitRef.current = true;
            handleAutoSubmit();
          }
        } else if (data.status === 'waiting') {
          navigate('/waiting');
        }
      })
      .catch(() => {});

    // Socket for manual exam stop by admin with authenticated join
    const socket = getSocket();
    socket.emit('candidate:join', { token, candidateId, subject });

    socket.on('exam:ended', ({ subject: s }) => {
      if (s === subject && !autoSubmitRef.current) {
        autoSubmitRef.current = true;
        handleAutoSubmit();
      }
    });

    return () => {
      socket.off('exam:ended');
    };
  }, []);

  // Local 1-second timer tick for candidate's individual time
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!autoSubmitRef.current) {
            autoSubmitRef.current = true;
            handleAutoSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft > 0]);

  const handleAutoSubmit = async () => {
    if (submitted) return;
    try {
      const answersArr = Object.entries(answers).map(([questionId, selectedIndex]) => ({
        questionId, selectedIndex,
      }));
      await submitExam({ candidateId, subject, answers: answersArr });
    } catch {}
    setSubmitted(true);
    setSubmittedLocal(true);
    navigate('/thankyou');
  };

  const handleSubmit = async () => {
    if (submitting || submitted) return;
    setSubmitting(true);
    setError('');
    try {
      const answersArr = Object.entries(answers).map(([questionId, selectedIndex]) => ({
        questionId, selectedIndex,
      }));
      await submitExam({ candidateId, subject, answers: answersArr });
      setSubmitted(true);
      setSubmittedLocal(true);
      navigate('/thankyou');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit. Please try again.');
      setSubmitting(false);
    }
  };

  const selectAnswer = (questionId, idx) => {
    setAnswers((prev) => ({ ...prev, [questionId]: idx }));
  };

  const answered = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answered / questions.length) * 100 : 0;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timerPct = duration > 0 ? (timeLeft / duration) * 100 : 100;
  const timerColor = timeLeft < 60 ? 'text-red-400' : timeLeft < 300 ? 'text-amber-400' : 'text-emerald-400';
  const timerBg = timeLeft < 60 ? 'from-red-500 to-red-600' : timeLeft < 300 ? 'from-amber-500 to-amber-600' : 'from-emerald-500 to-emerald-600';

  const SUBJECT_LABELS = { marketing: 'Marketing', hr: 'Human Resources', digital_marketing: 'Digital Marketing', general_reasoning: 'General Reasoning' };

  if (loading) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading exam questions...</p>
        </div>
      </div>
    );
  }

  const handleBackToLogin = async () => {
    if (candidateId) {
      try { await cleanupCandidate(candidateId); } catch {}
    }
    clear();
    navigate('/');
  };

  if ((error || questions.length === 0) && !loading) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center p-4">
        <div className="glass-card p-8 text-center max-w-md animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-3xl mx-auto mb-4 text-amber-400">
            📋
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Questions are not assigned</h2>
          <p className="text-slate-400 text-sm mb-6">
            Questions are not assigned, Please go back
          </p>
          <button
            onClick={handleBackToLogin}
            className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
          >
            ← Back to Candidate Login
          </button>
        </div>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div className="min-h-screen page-bg flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-10 bg-dark-800 bg-opacity-95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="text-xs sm:text-sm text-slate-400 truncate">
              <span className="text-white font-medium">{name}</span>
              <span className="mx-1.5 text-slate-600">•</span>
              <span className="text-primary-300 hidden sm:inline">{SUBJECT_LABELS[subject]}</span>
            </div>
          </div>

          {/* Timer */}
          <div className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-dark-700 border border-white/10 ${timeLeft < 60 ? 'animate-pulse border-red-500/30' : ''}`}>
            <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${timerColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className={`font-mono font-bold text-base sm:text-lg ${timerColor}`}>
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
          </div>

          <div className="text-xs text-slate-500 flex-shrink-0">
            {answered}/{questions.length} <span className="hidden sm:inline">answered</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-dark-700">
          <div
            className={`h-full bg-gradient-to-r ${timerBg} transition-all duration-1000`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
      </header>

      {/* Mobile Horizontal Question Navigation */}
      <div className="md:hidden bg-dark-800/90 backdrop-blur-md border-b border-white/5 px-3 py-2 overflow-x-auto flex items-center gap-1.5 sticky top-[49px] z-10">
        {questions.map((q_, i) => (
          <button
            key={q_._id}
            onClick={() => setCurrent(i)}
            className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-semibold flex-shrink-0 transition-all ${
              i === current
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                : answers[q_._id] !== undefined
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-white/5 text-slate-400'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="flex-1 flex max-w-4xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-8 gap-6">
        {/* Question Navigation (left panel on desktop) */}
        <aside className="hidden md:block w-48 flex-shrink-0">
          <div className="glass-card p-4 sticky top-28">
            <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-3">Questions</p>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((q_, i) => (
                <button
                  key={q_._id}
                  onClick={() => setCurrent(i)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                    i === current
                      ? 'bg-primary-500 text-white'
                      : answers[q_._id] !== undefined
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 space-y-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/30" />
                Answered
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-white/5" />
                Not answered
              </div>
            </div>
          </div>
        </aside>

        {/* Main Question Card */}
        <div className="flex-1">
          {q && (
            <div className="glass-card p-5 sm:p-8 animate-fade-in" key={q._id}>
              {/* Question header */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-slate-500 text-sm font-medium">
                  Question {current + 1} of {questions.length}
                </span>
                {answers[q._id] !== undefined && (
                  <span className="badge-active text-xs">Answered</span>
                )}
              </div>

              {/* Question */}
              <h2 className="text-xl font-semibold text-white mb-8 leading-relaxed">
                {q.questionText}
              </h2>

              {/* Options */}
              <div className="space-y-3 mb-8">
                {q.options.map((opt, idx) => {
                  const isSelected = answers[q._id] === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => selectAnswer(q._id, idx)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                        isSelected
                          ? 'border-primary-500 bg-primary-500/15 shadow-lg shadow-primary-500/20'
                          : 'border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                        isSelected
                          ? 'border-primary-500 bg-primary-500 text-white'
                          : 'border-slate-600 text-slate-400'
                      }`}>
                        {['A', 'B', 'C', 'D'][idx]}
                      </div>
                      <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                  disabled={current === 0}
                  className="btn-ghost text-sm px-5 py-2.5 disabled:opacity-40"
                >
                  ← Previous
                </button>

                {current < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrent((c) => c + 1)}
                    className="btn-primary text-sm px-5 py-2.5"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="btn-primary text-sm px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500"
                  >
                    {submitting ? 'Submitting...' : `✅ Submit Exam (${answered}/${questions.length})`}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Answer progress */}
          <div className="glass-card p-4 mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">Answer Progress</span>
              <span className="text-xs text-slate-400">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
