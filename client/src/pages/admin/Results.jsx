import { useState, useEffect } from 'react';
import { getResults, deleteResult } from '../../api';
import useExamStore from '../../stores/examStore';

const SUBJECTS = [
  { value: 'marketing', label: 'Marketing', color: 'text-purple-300 bg-purple-500/10 border-purple-500/20' },
  { value: 'hr', label: 'HR', color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20' },
  { value: 'digital_marketing', label: 'Digital Marketing', color: 'text-pink-300 bg-pink-500/10 border-pink-500/20' },
  { value: 'general_reasoning', label: 'General Reasoning', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
];

const formatDateTime = (dateStr) => {
  if (!dateStr) return { date: 'N/A', time: 'N/A' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { date: 'N/A', time: 'N/A' };

  const date = d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const time = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return { date, time };
};

export default function Results() {
  const [results, setResults] = useState([]);
  const [filter, setFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'yesterday', 'last7days', 'custom'
  const [customDate, setCustomDate] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'score_desc', 'score_asc'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { liveResults } = useExamStore();

  const load = () => {
    setLoading(true);
    getResults()
      .then(({ data }) => setResults(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [liveResults.length]);

  const toggleExpand = (id) => setExpanded((prev) => (prev === id ? null : id));

  const getScoreColor = (pct) => {
    if (pct >= 80) return 'text-emerald-400';
    if (pct >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await deleteResult(id);
      setDeleteConfirm(null);
      load();
    } catch (err) {
      console.error('Failed to delete result:', err);
    } finally {
      setDeleting(false);
    }
  };

  const getSubmissionTimestamp = (result) => {
    const ts = result.createdAt || result.candidate?.createdAt;
    return ts ? new Date(ts).getTime() : 0;
  };

  // Filter by subject
  let filtered = results;
  if (filter) {
    filtered = filtered.filter((r) => r.subject === filter);
  }

  // Filter by search query (name, email, phone)
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (r) =>
        r.candidate?.name?.toLowerCase().includes(q) ||
        r.candidate?.email?.toLowerCase().includes(q) ||
        r.candidate?.phone?.includes(q) ||
        r.candidate?.address?.toLowerCase().includes(q)
    );
  }

  // Filter by date submitted
  if (dateFilter !== 'all') {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOf7DaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;

    filtered = filtered.filter((r) => {
      const timestamp = getSubmissionTimestamp(r);
      if (!timestamp) return false;

      if (dateFilter === 'today') {
        return timestamp >= startOfToday;
      }
      if (dateFilter === 'yesterday') {
        return timestamp >= startOfYesterday && timestamp < startOfToday;
      }
      if (dateFilter === 'last7days') {
        return timestamp >= startOf7DaysAgo;
      }
      if (dateFilter === 'custom' && customDate) {
        const d = new Date(timestamp);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        return dateString === customDate;
      }
      return true;
    });
  }

  // Sort by date/time or score
  const displayedResults = [...filtered].sort((a, b) => {
    const timeA = getSubmissionTimestamp(a);
    const timeB = getSubmissionTimestamp(b);
    const pctA = a.percentage || 0;
    const pctB = b.percentage || 0;

    if (sortBy === 'newest') {
      return timeB - timeA;
    }
    if (sortBy === 'oldest') {
      return timeA - timeB;
    }
    if (sortBy === 'score_desc') {
      if (pctB !== pctA) return pctB - pctA;
      return (b.score || 0) - (a.score || 0);
    }
    if (sortBy === 'score_asc') {
      if (pctA !== pctB) return pctA - pctB;
      return (a.score || 0) - (b.score || 0);
    }
    return timeB - timeA;
  });

  const isFilterActive = filter || dateFilter !== 'all' || customDate || searchQuery || sortBy !== 'newest';

  const resetAllFilters = () => {
    setFilter('');
    setDateFilter('all');
    setCustomDate('');
    setSearchQuery('');
    setSortBy('newest');
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 page-bg min-h-full">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Exam Results</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              {displayedResults.length === results.length
                ? `${results.length} total submissions`
                : `Showing ${displayedResults.length} of ${results.length} submissions`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isFilterActive && (
              <button
                onClick={resetAllFilters}
                className="px-3 py-2 text-xs sm:text-sm text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/10"
              >
                ✕ Reset Filters
              </button>
            )}
            <button onClick={load} className="btn-ghost text-xs sm:text-sm px-3 sm:px-4 py-2">
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Subject Filter Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setFilter('')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${filter === '' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-slate-400 hover:text-white bg-white/5'}`}
          >
            All ({results.length})
          </button>
          {SUBJECTS.map((s) => {
            const cnt = results.filter((r) => r.subject === s.value).length;
            return (
              <button
                key={s.value}
                onClick={() => setFilter(s.value)}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${filter === s.value ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-slate-400 hover:text-white bg-white/5'}`}
              >
                {s.label} ({cnt})
              </button>
            );
          })}
        </div>

        {/* Date & Time Submitted Filter & Controls Bar */}
        <div className="glass-card p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            
            {/* Search Bar */}
            <div className="lg:col-span-4 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate name, email..."
                className="form-input text-xs sm:text-sm pl-9 py-2 w-full"
              />
            </div>

            {/* Date Filter Dropdown */}
            <div className="lg:col-span-4 flex items-center gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="form-input text-xs sm:text-sm pl-9 py-2 w-full appearance-none cursor-pointer"
                >
                  <option value="all" className="bg-dark-800 text-white">📅 All Dates</option>
                  <option value="today" className="bg-dark-800 text-white">📅 Submitted Today</option>
                  <option value="yesterday" className="bg-dark-800 text-white">📅 Submitted Yesterday</option>
                  <option value="last7days" className="bg-dark-800 text-white">📅 Last 7 Days</option>
                  <option value="custom" className="bg-dark-800 text-white">📅 Specific Date (Pick)</option>
                </select>
              </div>

              {/* Specific Date Picker Input */}
              {dateFilter === 'custom' && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="form-input text-xs sm:text-sm py-1.5 px-3 w-40 cursor-pointer"
                />
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="lg:col-span-4 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="form-input text-xs sm:text-sm pl-9 py-2 w-full appearance-none cursor-pointer"
              >
                <option value="newest" className="bg-dark-800 text-white">🕒 Latest Submitted (Newest first)</option>
                <option value="oldest" className="bg-dark-800 text-white">⏱ Oldest Submitted (Earliest first)</option>
                <option value="score_desc" className="bg-dark-800 text-white">🏆 Highest Score (% first)</option>
                <option value="score_asc" className="bg-dark-800 text-white">📉 Lowest Score (% first)</option>
              </select>
            </div>

          </div>
        </div>

        {loading ? (
          <div className="glass-card p-8 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading results...
          </div>
        ) : results.length === 0 ? (
          <div className="glass-card p-8 sm:p-12 text-center">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-slate-400 text-sm sm:text-base">No results yet. Results will appear here once candidates submit their exams.</p>
          </div>
        ) : displayedResults.length === 0 ? (
          <div className="glass-card p-8 sm:p-12 text-center">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-slate-400 text-sm sm:text-base">No results found for this section.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedResults.map((result) => {
              const subj = SUBJECTS.find((s) => s.value === result.subject);
              const isExpanded = expanded === result._id;
              const pct = result.percentage || 0;
              const isPassed = (result.score || 0) >= 12;
              const submissionTime = result.createdAt || result.candidate?.createdAt;
              const { date: subDate, time: subClock } = formatDateTime(submissionTime);

              return (
                <div key={result._id} className="glass-card overflow-hidden">
                  {/* Result Row */}
                  <div
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-5 gap-3 sm:gap-4 cursor-pointer hover:bg-white/3 transition-colors"
                    onClick={() => toggleExpand(result._id)}
                  >
                    {/* Candidate Info */}
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      {/* Avatar */}
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-xs sm:text-sm font-bold text-white flex-shrink-0">
                        {result.candidate?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      {/* Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-semibold text-sm sm:text-base truncate">{result.candidate?.name}</p>
                          <span className={`badge border text-xs px-2.5 py-0.5 ${subj?.color}`}>{subj?.label}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          <p className="text-slate-500 text-xs truncate">{result.candidate?.email}</p>
                          <span className="text-slate-600 hidden sm:inline">•</span>
                          <p className="text-slate-500 text-xs">{result.candidate?.phone}</p>
                          {result.candidate?.address && (
                            <>
                              <span className="text-slate-600 hidden sm:inline">•</span>
                              <p className="text-slate-400 text-xs truncate max-w-xs" title={result.candidate.address}>
                                📍 {result.candidate.address}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Submission Date & Time Column */}
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center text-xs px-0 md:px-4 md:border-l border-white/5 py-2 md:py-0 border-t md:border-t-0 border-white/5 gap-1 min-w-[140px]">
                      <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                        <svg className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{subDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                        <svg className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{subClock}</span>
                      </div>
                    </div>

                    {/* Score & Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          isPassed
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                            : 'text-red-400 bg-red-500/10 border-red-500/30'
                        }`}
                      >
                        {isPassed ? 'Passed' : 'Failed'}
                      </span>
                      <div className="text-right">
                        <p className={`text-lg sm:text-xl font-bold ${getScoreColor(pct)}`}>{pct}%</p>
                        <p className="text-slate-500 text-xs">{result.score}/{result.totalQuestions} correct</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(result);
                        }}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                        title="Delete Record"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
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
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-white/5">
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Answer Breakdown</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md">
                          <span>Submitted:</span>
                          <span className="text-slate-200 font-medium">{subDate} at {subClock}</span>
                        </p>
                      </div>
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="glass-card p-8 max-w-sm w-full text-center animate-slide-up">
            <p className="text-4xl mb-4">🗑️</p>
            <h3 className="text-xl font-bold text-white mb-2">Delete Record?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Are you sure you want to delete the result for <strong className="text-white">{deleteConfirm.candidate?.name || 'this candidate'}</strong>? This will permanently delete both the exam result and candidate record from the database.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm._id)}
                disabled={deleting}
                className="btn-danger flex-1"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
