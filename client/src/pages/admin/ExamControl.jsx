import { useState, useEffect } from 'react';
import { startExam, stopExam, getAdminExamStatus } from '../../api';
import useExamStore from '../../stores/examStore';

const SUBJECTS = [
  {
    value: 'marketing',
    label: 'Marketing',
    icon: '📈',
    gradient: 'from-purple-600 to-purple-800',
    glow: 'shadow-purple-500/30',
    badge: 'badge-marketing',
  },
  {
    value: 'hr',
    label: 'Human Resources',
    icon: '🤝',
    gradient: 'from-cyan-600 to-cyan-800',
    glow: 'shadow-cyan-500/30',
    badge: 'badge-hr',
  },
  {
    value: 'digital_marketing',
    label: 'Digital Marketing',
    icon: '💻',
    gradient: 'from-pink-600 to-pink-800',
    glow: 'shadow-pink-500/30',
    badge: 'badge-digital_marketing',
  },
];

export default function ExamControl() {
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { sessions, setExamStarted, setTick, setExamEnded, loadSessions } = useExamStore();

  useEffect(() => {
    getAdminExamStatus()
      .then(({ data }) => loadSessions(data))
      .catch(() => {});
  }, []);

  const toggleSubject = (val) => {
    setSelectedSubjects((prev) =>
      prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]
    );
  };

  const selectAll = () => {
    const allActive = SUBJECTS.every((s) => sessions[s.value]?.status === 'active');
    if (allActive) return;
    setSelectedSubjects(
      SUBJECTS.filter((s) => sessions[s.value]?.status !== 'active').map((s) => s.value)
    );
  };

  const handleStart = async () => {
    if (selectedSubjects.length === 0) { setMessage('⚠️ Select at least one subject.'); return; }
    if (duration < 1) { setMessage('⚠️ Duration must be at least 1 minute.'); return; }
    setLoading(true);
    setMessage('');
    try {
      const { data } = await startExam(selectedSubjects, duration);
      setMessage(`✅ ${data.message}`);
      setSelectedSubjects([]);
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || 'Failed to start exam.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async (subject) => {
    setLoading(true);
    try {
      await stopExam(subject);
      setMessage(`⏹ Exam stopped for ${SUBJECTS.find((s) => s.value === subject)?.label}.`);
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || 'Failed to stop exam.'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const allInactive = SUBJECTS.every((s) => sessions[s.value]?.status !== 'active');

  return (
    <div className="p-8 page-bg min-h-full">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Exam Control</h1>
          <p className="text-slate-400 mt-1">Start, monitor, and stop exam sessions in real time</p>
        </div>

        {message && (
          <div className={`mb-6 px-5 py-4 rounded-xl text-sm font-medium ${
            message.startsWith('✅') ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' :
            message.startsWith('❌') ? 'bg-red-500/10 border border-red-500/30 text-red-400' :
            'bg-amber-500/10 border border-amber-500/30 text-amber-400'
          }`}>
            {message}
          </div>
        )}

        {/* Start Panel */}
        {allInactive && (
          <div className="glass-card p-8 mb-8">
            <h2 className="text-xl font-semibold text-white mb-6">🚀 Start New Exam</h2>

            {/* Subject Selection */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <label className="form-label mb-0">Select Subjects</label>
                <button
                  onClick={selectAll}
                  className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Select All 3
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {SUBJECTS.map((s) => {
                  const isSelected = selectedSubjects.includes(s.value);
                  const isActive = sessions[s.value]?.status === 'active';
                  return (
                    <button
                      key={s.value}
                      disabled={isActive}
                      onClick={() => toggleSubject(s.value)}
                      className={`p-5 rounded-xl border-2 text-left transition-all duration-200 ${
                        isActive
                          ? 'border-emerald-500/50 bg-emerald-500/5 cursor-not-allowed opacity-60'
                          : isSelected
                          ? 'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/20'
                          : 'border-white/10 bg-white/3 hover:border-white/20'
                      }`}
                    >
                      <div className="text-2xl mb-2">{s.icon}</div>
                      <p className="text-white font-semibold text-sm">{s.label}</p>
                      {isActive ? (
                        <p className="text-emerald-400 text-xs mt-1">🟢 Currently Active</p>
                      ) : (
                        <p className="text-slate-500 text-xs mt-1">
                          {isSelected ? '✅ Selected' : 'Click to select'}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration */}
            <div className="mb-6">
              <label className="form-label">Duration (minutes)</label>
              <div className="flex items-center gap-4">
                <input
                  id="exam-duration-input"
                  type="number"
                  min={1}
                  max={180}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="form-input w-36"
                />
                <div className="flex gap-2">
                  {[15, 30, 45, 60].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        duration === d ? 'bg-primary-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              id="start-exam-btn"
              onClick={handleStart}
              disabled={loading || selectedSubjects.length === 0}
              className="btn-primary text-lg px-10 py-4"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Starting...
                </span>
              ) : (
                <>▶ Start Exam {selectedSubjects.length > 0 ? `(${selectedSubjects.length} subject${selectedSubjects.length > 1 ? 's' : ''})` : ''}</>
              )}
            </button>
          </div>
        )}

        {/* Live Exam Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SUBJECTS.map((s) => {
            const session = sessions[s.value];
            const isActive = session?.status === 'active';
            const isEnded = session?.status === 'ended';
            const timeLeft = session?.timeLeft || 0;
            const duration_ = session?.duration || 1;
            const progress = isActive ? ((duration_ - timeLeft) / duration_) * 100 : isEnded ? 100 : 0;

            return (
              <div
                key={s.value}
                className={`glass-card p-6 transition-all duration-500 ${
                  isActive ? 'border border-emerald-500/30 shadow-lg shadow-emerald-500/10' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="text-3xl">{s.icon}</div>
                  {isActive && <span className="badge-active">● Live</span>}
                  {isEnded && <span className="badge-ended">Ended</span>}
                  {!isActive && !isEnded && <span className="badge-waiting">Waiting</span>}
                </div>
                <h3 className="text-white font-semibold mb-1">{s.label}</h3>

                {isActive && (
                  <>
                    <p className="text-4xl font-mono font-bold text-emerald-400 my-3">
                      {formatTime(timeLeft)}
                    </p>
                    <div className="w-full h-2 bg-dark-600 rounded-full overflow-hidden mb-4">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000"
                        style={{ width: `${100 - progress}%` }}
                      />
                    </div>
                    <button
                      id={`stop-${s.value}-btn`}
                      onClick={() => handleStop(s.value)}
                      disabled={loading}
                      className="btn-danger w-full text-sm py-2"
                    >
                      ⏹ Stop Exam
                    </button>
                  </>
                )}

                {!isActive && !isEnded && (
                  <p className="text-slate-500 text-sm mt-2">Waiting for exam to start...</p>
                )}
                {isEnded && (
                  <p className="text-slate-400 text-sm mt-2">This exam session has ended.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
