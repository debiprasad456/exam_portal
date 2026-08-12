import { useEffect, useState } from 'react';
import { getStats } from '../../api';
import useExamStore from '../../stores/examStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const SUBJECT_LABELS = {
  marketing: 'Marketing',
  hr: 'HR',
  digital_marketing: 'Digital Marketing',
  general_reasoning: 'General Reasoning',
};

const SUBJECT_COLORS = {
  marketing: '#7C3AED',
  hr: '#06B6D4',
  digital_marketing: '#EC4899',
  general_reasoning: '#F59E0B',
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { sessions, liveResults } = useExamStore();

  useEffect(() => {
    getStats()
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [liveResults.length]);

  const activeCount = Object.values(sessions).filter((s) => s.status === 'active').length;

  const chartData = ['marketing', 'hr', 'digital_marketing', 'general_reasoning'].map((sub) => {
    const found = stats?.subjectResultCounts?.find((s) => s._id === sub);
    return {
      name: SUBJECT_LABELS[sub],
      submissions: found?.count || 0,
      avgScore: Math.round(found?.avgScore || 0),
      color: SUBJECT_COLORS[sub],
    };
  });

  const qChartData = ['marketing', 'hr', 'digital_marketing', 'general_reasoning'].map((sub) => {
    const found = stats?.questionCounts?.find((s) => s._id === sub);
    return { name: SUBJECT_LABELS[sub], count: found?.count || 0, color: SUBJECT_COLORS[sub] };
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 page-bg min-h-full">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">Overview of your exam portal activity</p>
        </div>

        {/* Stat Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-card p-6 h-28 animate-pulse bg-dark-700" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon="👥"
              label="Total Candidates"
              value={stats?.totalCandidates || 0}
              color="purple"
            />
            <StatCard
              icon="📋"
              label="Total Submissions"
              value={stats?.totalResults || 0}
              color="cyan"
            />
            <StatCard
              icon="❓"
              label="Total Questions"
              value={stats?.questionCounts?.reduce((a, b) => a + b.count, 0) || 0}
              color="pink"
            />
            <StatCard
              icon="🟢"
              label="Active Exams"
              value={activeCount}
              color={activeCount > 0 ? 'green' : 'gray'}
              pulse={activeCount > 0}
            />
          </div>
        )}

        {/* Live Exam Status */}
        <div className="glass-card p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Live Exam Status
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {['marketing', 'hr', 'digital_marketing', 'general_reasoning'].map((sub) => {
              const session = sessions[sub];
              const mins = Math.floor((session.timeLeft || 0) / 60);
              const secs = (session.timeLeft || 0) % 60;
              return (
                <div key={sub} className={`p-4 rounded-xl border ${
                  session.status === 'active'
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : session.status === 'ended'
                    ? 'border-slate-500/30 bg-slate-500/5'
                    : 'border-white/5 bg-white/3'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{SUBJECT_LABELS[sub]}</span>
                    {session.status === 'active' && (
                      <span className="badge-active">Live</span>
                    )}
                    {session.status === 'ended' && (
                      <span className="badge-ended">Ended</span>
                    )}
                    {session.status === 'waiting' && (
                      <span className="badge-waiting">Waiting</span>
                    )}
                  </div>
                  {session.status === 'active' && (
                    <p className="text-emerald-400 font-bold text-sm">
                      {Math.round((session.duration || 0) / 60)} min limit
                    </p>
                  )}
                  {session.status !== 'active' && (
                    <p className="text-slate-500 text-sm">—</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Submissions per Subject</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F1F5F9' }}
                />
                <Bar dataKey="submissions" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Questions per Subject</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={qChartData}>
                <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F1F5F9' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {qChartData.map((entry, index) => (
                    <Cell key={`cell-q-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Results Feed */}
        {liveResults.length > 0 && (
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
              Live Submissions Feed
            </h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {liveResults.slice(0, 10).map((r, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2 rounded-lg bg-white bg-opacity-5">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary-500 bg-opacity-20 flex items-center justify-center text-xs font-bold text-primary-300">
                      {r.candidate?.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <span className="text-white text-sm font-medium">{r.candidate?.name}</span>
                      <span className="text-slate-500 text-xs ml-2">{SUBJECT_LABELS[r.subject]}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-semibold text-sm">{r.percentage}%</span>
                    {r.createdAt && (
                      <span className="text-slate-500 text-xs bg-white/5 px-2 py-0.5 rounded">
                        {new Date(r.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, pulse }) {
  const colorMap = {
    purple: 'from-primary-500/20 to-primary-600/10 border-primary-500/20 text-primary-300',
    cyan: 'from-accent-500/20 to-accent-500/10 border-accent-500/20 text-accent-300',
    pink: 'from-pink-500/20 to-pink-600/10 border-pink-500/20 text-pink-300',
    green: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-300',
    gray: 'from-slate-500/10 to-slate-600/5 border-slate-500/20 text-slate-400',
  };
  return (
    <div className={`glass-card p-5 bg-gradient-to-br ${colorMap[color]} border`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
        <span className={`text-2xl ${pulse ? 'animate-pulse' : ''}`}>{icon}</span>
      </div>
    </div>
  );
}
