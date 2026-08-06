import { useState, useEffect } from 'react';
import { getResults } from '../../api';
import useExamStore from '../../stores/examStore';

const SUBJECTS = [
  { value: 'marketing', label: 'Marketing', color: 'text-purple-300 bg-purple-500/10 border-purple-500/20' },
  { value: 'hr', label: 'HR', color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20' },
  { value: 'digital_marketing', label: 'Digital Marketing', color: 'text-pink-300 bg-pink-500/10 border-pink-500/20' },
];

export default function Results() {
  const [results, setResults] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const { liveResults } = useExamStore();

  const load = () => {
    setLoading(true);
    getResults(filter)
      .then(({ data }) => setResults(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter, liveResults.length]);

  const toggleExpand = (id) => setExpanded((prev) => (prev === id ? null : id));

  const getScoreColor = (pct) => {
    if (pct >= 80) return 'text-emerald-400';
    if (pct >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="p-8 page-bg min-h-full">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Exam Results</h1>
            <p className="text-slate-400 mt-1">{results.length} total submissions</p>
          </div>
          <button onClick={load} className="btn-ghost text-sm px-4 py-2">
            ↻ Refresh
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilter('')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === '' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-white bg-white/5'}`}
          >
            All ({results.length})
          </button>
          {SUBJECTS.map((s) => {
            const cnt = results.filter((r) => r.subject === s.value).length;
            return (
              <button
                key={s.value}
                onClick={() => setFilter(s.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === s.value ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-white bg-white/5'}`}
              >
                {s.label} ({cnt})
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="glass-card p-8 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading results...
          </div>
        ) : results.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-slate-400">No results yet. Results will appear here once candidates submit their exams.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((result) => {
              const subj = SUBJECTS.find((s) => s.value === result.subject);
              const isExpanded = expanded === result._id;
              const pct = result.percentage || 0;
              return (
                <div key={result._id} className="glass-card overflow-hidden">
                  {/* Result Row */}
                  <div
                    className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/3 transition-colors"
                    onClick={() => toggleExpand(result._id)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                        {result.candidate?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      {/* Info */}
                      <div>
                        <p className="text-white font-semibold">{result.candidate?.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <p className="text-slate-500 text-xs">{result.candidate?.email}</p>
                          <span className="text-slate-600">•</span>
                          <p className="text-slate-500 text-xs">{result.candidate?.phone}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <span className={`badge border ${subj?.color}`}>{subj?.label}</span>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${getScoreColor(pct)}`}>{pct}%</p>
                        <p className="text-slate-500 text-xs">{result.score}/{result.totalQuestions} correct</p>
                      </div>
                      <div className="text-slate-400">
                        <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Expanded: Per-question breakdown */}
                  {isExpanded && (
                    <div className="border-t border-white/5 px-5 pb-5 pt-4 animate-fade-in">
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-4">Answer Breakdown</p>
                      <div className="space-y-3">
                        {result.answers.map((ans, i) => (
                          <div
                            key={i}
                            className={`p-4 rounded-xl border ${
                              ans.isCorrect
                                ? 'border-emerald-500/20 bg-emerald-500/5'
                                : 'border-red-500/20 bg-red-500/5'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span className={`text-lg flex-shrink-0 mt-0.5 ${ans.isCorrect ? '✅' : '❌'}`}>
                                {ans.isCorrect ? '✅' : '❌'}
                              </span>
                              <div className="flex-1">
                                <p className="text-white text-sm font-medium mb-2">
                                  Q{i + 1}. {ans.questionText}
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  {ans.options.map((opt, idx) => {
                                    const isSelected = idx === ans.selectedIndex;
                                    const isCorrect = idx === ans.correctIndex;
                                    return (
                                      <div
                                        key={idx}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                                          isCorrect
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                            : isSelected && !isCorrect
                                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                            : 'bg-white/3 text-slate-400'
                                        }`}
                                      >
                                        <span className="font-bold">{['A', 'B', 'C', 'D'][idx]}.</span>
                                        <span className="flex-1">{opt}</span>
                                        {isCorrect && <span className="text-emerald-400">✓</span>}
                                        {isSelected && !isCorrect && <span className="text-red-400">✗</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                                {ans.selectedIndex === -1 && (
                                  <p className="text-amber-400 text-xs mt-2">⚠ Not answered</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
