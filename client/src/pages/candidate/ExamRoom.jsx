import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCandidateQuestions, submitExam, getExamStatus } from '../../api';
import { getSocket } from '../../socket';
import useCandidateStore from '../../stores/candidateStore';

export default function ExamRoom() {
  const { candidateId, subject, name, setSubmitted, hasSubmitted } = useCandidateStore();
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

    // Get current time left from server
    getExamStatus()
      .then(({ data }) => {
        const session = data[subject];
        if (session?.status === 'ended') { navigate('/thankyou'); return; }
        if (session?.status === 'active') {
          setTimeLeft(session.timeLeft || 0);
          setDuration(session.duration || 0);
        } else if (session?.status === 'waiting') {
          navigate('/waiting');
        }
      })
      .catch(() => {});

    // Socket for live tick & end
    const socket = getSocket();
    socket.emit('candidate:join', { subject });

    socket.on('exam:tick', ({ subject: s, timeLeft: t }) => {
      if (s === subject) setTimeLeft(t);
    });

    socket.on('exam:ended', ({ subject: s }) => {
      if (s === subject && !autoSubmitRef.current) {
        autoSubmitRef.current = true;
        handleAutoSubmit();
      }
    });

    return () => {
      socket.off('exam:tick');
      socket.off('exam:ended');
    };
  }, []);

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

  const SUBJECT_LABELS = { marketing: 'Marketing', hr: 'Human Resources', digital_marketing: 'Digital Marketing' };

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

  if (error && questions.length === 0) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center p-4">
        <div className="glass-card p-8 text-center max-w-md">
          <p className="text-4xl mb-4">⚠️</p>
          <p className="text-white font-semibold mb-2">Something went wrong</p>
          <p className="text-slate-400 text-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-ghost mt-4">
            Try Again
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
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-400">
              <span className="text-white font-medium">{name}</span>
              <span className="mx-2 text-slate-600">•</span>
              <span className="text-primary-300">{SUBJECT_LABELS[subject]}</span>
            </div>
          </div>

          {/* Timer */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-700 border border-white/10 ${timeLeft < 60 ? 'animate-pulse border-red-500/30' : ''}`}>
            <svg className={`w-4 h-4 ${timerColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className={`font-mono font-bold text-lg ${timerColor}`}>
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
          </div>

          <div className="text-xs text-slate-500">
            {answered}/{questions.length} answered
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

      <div className="flex-1 flex max-w-4xl mx-auto w-full px-4 py-8 gap-6">
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
            <div className="glass-card p-8 animate-fade-in" key={q._id}>
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
