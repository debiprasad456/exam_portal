import { useState, useEffect, useMemo } from 'react';
import { getCandidates, deleteCandidate } from '../../api';
import { getSocket } from '../../socket';

const SUBJECTS = [
  { value: 'marketing', label: 'Marketing', color: 'text-purple-300 bg-purple-500/10 border-purple-500/20' },
  { value: 'hr', label: 'Human Resources', color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20' },
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

const getRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 30) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function Candidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, yesterday, last7days, custom
  const [customDate, setCustomDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, name_asc, name_desc
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [newlyAddedId, setNewlyAddedId] = useState(null);
  const [liveNotification, setLiveNotification] = useState(null);

  const load = () => {
    setLoading(true);
    getCandidates()
      .then(({ data }) => setCandidates(data))
      .catch((err) => console.error('Failed to load candidates:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();

    const socket = getSocket();

    // Real-time listener: new candidate registered
    const handleNewCandidate = ({ candidate }) => {
      if (!candidate) return;
      setCandidates((prev) => [candidate, ...prev.filter((c) => c._id !== candidate._id)]);
      setNewlyAddedId(candidate._id);
      setLiveNotification(`Student registered: ${candidate.name} (${candidate.subject})`);

      setTimeout(() => setNewlyAddedId(null), 5000);
      setTimeout(() => setLiveNotification(null), 4000);
    };

    // Real-time listener: candidate status updated (started exam or submitted)
    const handleCandidateStatus = ({ candidateId, startedAt, hasSubmitted }) => {
      setCandidates((prev) =>
        prev.map((c) => {
          if (c._id === candidateId) {
            return {
              ...c,
              ...(startedAt ? { startedAt } : {}),
              ...(hasSubmitted !== undefined ? { hasSubmitted } : {}),
            };
          }
          return c;
        })
      );
    };

    // Real-time listener: candidate left before submitting
    const handleCandidateDeleted = ({ candidateId }) => {
      setCandidates((prev) => prev.filter((c) => c._id !== candidateId));
    };

    socket.on('candidate:registered', handleNewCandidate);
    socket.on('candidate:status', handleCandidateStatus);
    socket.on('candidate:deleted', handleCandidateDeleted);

    return () => {
      socket.off('candidate:registered', handleNewCandidate);
      socket.off('candidate:status', handleCandidateStatus);
      socket.off('candidate:deleted', handleCandidateDeleted);
    };
  }, []);

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await deleteCandidate(id);
      setCandidates((prev) => prev.filter((c) => c._id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete candidate:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const total = candidates.length;
    const today = candidates.filter((c) => c.createdAt && new Date(c.createdAt).getTime() >= startOfToday).length;
    const submitted = candidates.filter((c) => c.hasSubmitted).length;
    const inExam = candidates.filter((c) => c.startedAt && !c.hasSubmitted).length;
    const waiting = candidates.filter((c) => !c.startedAt && !c.hasSubmitted).length;

    return { total, today, submitted, inExam, waiting };
  }, [candidates]);

  // Filtering
  const filteredCandidates = useMemo(() => {
    let list = candidates;

    if (filterSubject) {
      list = list.filter((c) => c.subject === filterSubject);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.includes(q) ||
          c.address?.toLowerCase().includes(q)
      );
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
      const startOf7DaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;

      list = list.filter((c) => {
        if (!c.createdAt) return false;
        const ts = new Date(c.createdAt).getTime();

        if (dateFilter === 'today') return ts >= startOfToday;
        if (dateFilter === 'yesterday') return ts >= startOfYesterday && ts < startOfToday;
        if (dateFilter === 'last7days') return ts >= startOf7DaysAgo;
        if (dateFilter === 'custom' && customDate) {
          const d = new Date(ts);
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
            d.getDate()
          ).padStart(2, '0')}`;
          return dateStr === customDate;
        }
        return true;
      });
    }

    return [...list].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      if (sortBy === 'newest') return timeB - timeA;
      if (sortBy === 'oldest') return timeA - timeB;
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '');
      return timeB - timeA;
    });
  }, [candidates, filterSubject, searchQuery, dateFilter, customDate, sortBy]);

  const isFilterActive = filterSubject || dateFilter !== 'all' || customDate || searchQuery || sortBy !== 'newest';

  const resetAllFilters = () => {
    setFilterSubject('');
    setDateFilter('all');
    setCustomDate('');
    setSearchQuery('');
    setSortBy('newest');
  };

  const exportCSV = () => {
    if (!filteredCandidates.length) return;
    const headers = ['Name', 'Email', 'Phone', 'Subject', 'Address', 'Status', 'Registered At Date', 'Registered At Time'];
    const rows = filteredCandidates.map((c) => {
      const { date, time } = formatDateTime(c.createdAt);
      const status = c.hasSubmitted ? 'Submitted' : c.startedAt ? 'In Exam' : 'Waiting';
      const phoneClean = String(c.phone || '').replace(/"/g, '').trim();
      const phoneField = phoneClean ? `"=""${phoneClean}"""` : '""';

      return [
        `"${c.name || ''}"`,
        `"${c.email || ''}"`,
        phoneField,
        `"${c.subject || ''}"`,
        `"${(c.address || '').replace(/"/g, '""')}"`,
        `"${status}"`,
        `"${date}"`,
        `"${time}"`,
      ].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `registered_students_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 page-bg min-h-full">
      <div className="max-w-6xl mx-auto">
        {/* Real-time Toast Notification */}
        {liveNotification && (
          <div className="fixed top-5 right-5 z-50 animate-bounce bg-emerald-500/90 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-400/40 backdrop-blur-md">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span className="text-sm font-semibold">⚡ {liveNotification}</span>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Live Registered Students</h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Real-Time
              </span>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Live registrations stream directly from MongoDB. Shows when each student registered and their current exam status.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isFilterActive && (
              <button
                onClick={resetAllFilters}
                className="px-3 py-2 text-xs sm:text-sm text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/10"
              >
                ✕ Reset Filters
              </button>
            )}
            <button
              onClick={exportCSV}
              disabled={filteredCandidates.length === 0}
              className="btn-ghost text-xs sm:text-sm px-3 sm:px-4 py-2 inline-flex items-center gap-1.5"
              title="Download registered student records as CSV"
            >
              📥 Export CSV
            </button>
            <button onClick={load} className="btn-ghost text-xs sm:text-sm px-3 sm:px-4 py-2">
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="glass-card p-4 sm:p-5 bg-gradient-to-br from-primary-500/15 to-primary-600/5 border border-primary-500/20">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Total Registered</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-white">{stats.total}</span>
              <span className="text-xs text-primary-300 font-medium">students</span>
            </div>
          </div>

          <div className="glass-card p-4 sm:p-5 bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border border-emerald-500/20">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Registered Today</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-emerald-400">{stats.today}</span>
              <span className="text-xs text-emerald-300/80 font-medium">new today</span>
            </div>
          </div>

          <div className="glass-card p-4 sm:p-5 bg-gradient-to-br from-cyan-500/15 to-cyan-600/5 border border-cyan-500/20">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">In Exam Now</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-cyan-400">{stats.inExam}</span>
              <span className="text-xs text-cyan-300/80 font-medium">taking test</span>
            </div>
          </div>

          <div className="glass-card p-4 sm:p-5 bg-gradient-to-br from-purple-500/15 to-purple-600/5 border border-purple-500/20">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Completed / Submitted</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-purple-300">{stats.submitted}</span>
              <span className="text-xs text-purple-300/80 font-medium">done</span>
            </div>
          </div>
        </div>

        {/* Subject Filter Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setFilterSubject('')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              filterSubject === ''
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                : 'text-slate-400 hover:text-white bg-white/5'
            }`}
          >
            All Subjects ({candidates.length})
          </button>
          {SUBJECTS.map((s) => {
            const count = candidates.filter((c) => c.subject === s.value).length;
            return (
              <button
                key={s.value}
                onClick={() => setFilterSubject(s.value)}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  filterSubject === s.value
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                    : 'text-slate-400 hover:text-white bg-white/5'
                }`}
              >
                {s.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Filter and Search Bar */}
        <div className="glass-card p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            {/* Search */}
            <div className="lg:col-span-5 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate name, email, phone, city..."
                className="form-input text-xs sm:text-sm pl-9 py-2 w-full"
              />
            </div>

            {/* Date Registered Filter */}
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
                  <option value="all" className="bg-dark-800 text-white">📅 All Registration Dates</option>
                  <option value="today" className="bg-dark-800 text-white">📅 Registered Today</option>
                  <option value="yesterday" className="bg-dark-800 text-white">📅 Registered Yesterday</option>
                  <option value="last7days" className="bg-dark-800 text-white">📅 Registered Last 7 Days</option>
                  <option value="custom" className="bg-dark-800 text-white">📅 Pick Specific Date</option>
                </select>
              </div>

              {dateFilter === 'custom' && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="form-input text-xs sm:text-sm py-1.5 px-3 w-36 cursor-pointer"
                />
              )}
            </div>

            {/* Sort */}
            <div className="lg:col-span-3 relative">
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
                <option value="newest" className="bg-dark-800 text-white">🕒 Newest Registered</option>
                <option value="oldest" className="bg-dark-800 text-white">⏱ Oldest Registered</option>
                <option value="name_asc" className="bg-dark-800 text-white">🔤 Name (A - Z)</option>
                <option value="name_desc" className="bg-dark-800 text-white">🔤 Name (Z - A)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Candidates List */}
        {loading ? (
          <div className="glass-card p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading registered students...
          </div>
        ) : candidates.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-4xl mb-3">🧑‍🎓</p>
            <p className="text-white font-semibold text-lg mb-1">No registered students yet</p>
            <p className="text-slate-400 text-sm">When students fill the registration form, they will appear here live in real time.</p>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-white font-semibold text-lg mb-1">No matching candidates found</p>
            <p className="text-slate-400 text-sm">Try clearing your search query or adjusting your filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCandidates.map((candidate) => {
              const subj = SUBJECTS.find((s) => s.value === candidate.subject);
              const { date: regDate, time: regTime } = formatDateTime(candidate.createdAt);
              const relative = getRelativeTime(candidate.createdAt);
              const isNewlyAdded = newlyAddedId === candidate._id;

              return (
                <div
                  key={candidate._id}
                  className={`glass-card p-4 sm:p-5 transition-all duration-300 ${
                    isNewlyAdded
                      ? 'border-emerald-500/80 bg-emerald-500/10 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/30'
                      : 'hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Avatar & Candidate Information */}
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-sm font-bold text-white shadow-md flex-shrink-0">
                        {candidate.name?.[0]?.toUpperCase() || '?'}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-semibold text-base truncate">{candidate.name}</p>
                          <span className={`badge border text-xs px-2.5 py-0.5 ${subj?.color || 'badge'}`}>
                            {subj?.label || candidate.subject}
                          </span>

                          {/* Live Status Pill */}
                          {candidate.hasSubmitted ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Exam Submitted
                            </span>
                          ) : candidate.startedAt ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                              Currently in Exam
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              In Waiting Room
                            </span>
                          )}

                          {isNewlyAdded && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500 text-white animate-pulse">
                              NEW
                            </span>
                          )}
                        </div>

                        {/* Candidate Contact & Address Details */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
                          <span className="inline-flex items-center gap-1 hover:text-slate-200">
                            ✉️ {candidate.email}
                          </span>
                          <span className="text-slate-600 hidden sm:inline">•</span>
                          <span className="inline-flex items-center gap-1 hover:text-slate-200">
                            📱 {candidate.phone}
                          </span>
                          {candidate.address && (
                            <>
                              <span className="text-slate-600 hidden sm:inline">•</span>
                              <span className="inline-flex items-center gap-1 text-slate-400 truncate max-w-sm" title={candidate.address}>
                                📍 {candidate.address}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Registration Timestamp & Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-white/5 flex-shrink-0">
                      {/* When they registered */}
                      <div className="text-left md:text-right">
                        <div className="flex items-center md:justify-end gap-1.5 text-slate-300 text-xs font-medium">
                          <svg className="w-3.5 h-3.5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{regDate}</span>
                          <span className="text-slate-500">at</span>
                          <span className="text-slate-200 font-semibold">{regTime}</span>
                        </div>
                        {relative && (
                          <p className="text-[11px] text-primary-300 font-medium mt-0.5">
                            Registered {relative}
                          </p>
                        )}
                      </div>

                      {/* Delete Action */}
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(candidate)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors border border-transparent hover:border-red-500/20"
                        title="Delete candidate record"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-sm">
          <div className="glass-card p-6 sm:p-8 max-w-sm w-full text-center animate-slide-up border border-red-500/30">
            <p className="text-4xl mb-4">🗑️</p>
            <h3 className="text-xl font-bold text-white mb-2">Delete Candidate?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Are you sure you want to delete <strong className="text-white">{deleteConfirm.name}</strong>? This will permanently remove their registration and any exam result records from MongoDB.
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

