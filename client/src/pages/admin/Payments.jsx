import { useEffect, useState, useMemo } from 'react';
import { getPayments, approvePayment, rejectPayment, getPaymentStats } from '../../api';
import { getSocket } from '../../socket';

const SUBJECT_LABELS = {
  marketing: 'Marketing',
  hr: 'Human Resources',
  digital_marketing: 'Digital Marketing',
  general_reasoning: 'General Reasoning',
};

const SUBJECT_COLORS = {
  marketing: 'badge-marketing',
  hr: 'badge-hr',
  digital_marketing: 'badge-digital_marketing',
  general_reasoning: 'badge-general_reasoning',
};

export default function Payments() {
  const [allPayments, setAllPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [lightbox, setLightbox] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Fetch all payments once and filter in-memory for 0ms tab switching
  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [paymentsRes] = await Promise.all([
        getPayments(''), // Fetch all payments
        getPaymentStats().catch(() => ({ data: {} })),
      ]);
      setAllPayments(paymentsRes.data || []);
    } catch (_) {
      // Fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchData(false);
  }, []);

  // Real-time: listen for new candidate payments without blocking UI
  useEffect(() => {
    const socket = getSocket();
    const handleNewPayment = () => {
      fetchData(true);
    };

    socket.on('payment:new', handleNewPayment);
    return () => {
      socket.off('payment:new', handleNewPayment);
    };
  }, []);

  // Compute stats instantly from local in-memory payments
  const stats = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    for (const p of allPayments) {
      if (p.status === 'pending') pending++;
      else if (p.status === 'approved') approved++;
      else if (p.status === 'rejected') rejected++;
    }

    return {
      pending,
      approved,
      rejected,
      total: allPayments.length,
    };
  }, [allPayments]);

  // Instant in-memory tab filtering (0 ms delay on any tab click)
  const filteredPayments = useMemo(() => {
    if (activeTab === 'all') return allPayments;
    return allPayments.filter((p) => p.status === activeTab);
  }, [allPayments, activeTab]);

  // Optimistic Approve
  const handleApprove = async (paymentId) => {
    setActionLoading(paymentId);
    // Optimistically update local state immediately
    const prev = [...allPayments];
    setAllPayments((current) =>
      current.map((p) =>
        p._id === paymentId
          ? { ...p, status: 'approved', reviewedAt: new Date().toISOString() }
          : p
      )
    );

    try {
      await approvePayment(paymentId);
    } catch (_) {
      // Revert if API failed
      setAllPayments(prev);
    } finally {
      setActionLoading(null);
    }
  };

  // Optimistic Reject
  const handleReject = async () => {
    if (!rejectModal) return;
    const paymentId = rejectModal;
    const reason = rejectReason;
    setActionLoading(paymentId);

    // Optimistically update local state immediately
    const prev = [...allPayments];
    setAllPayments((current) =>
      current.map((p) =>
        p._id === paymentId
          ? {
              ...p,
              status: 'rejected',
              rejectionReason: reason,
              reviewedAt: new Date().toISOString(),
            }
          : p
      )
    );
    setRejectModal(null);
    setRejectReason('');

    try {
      await rejectPayment(paymentId, reason);
    } catch (_) {
      // Revert if API failed
      setAllPayments(prev);
    } finally {
      setActionLoading(null);
    }
  };

  const tabs = [
    { key: 'pending', label: 'Pending', count: stats.pending, color: 'text-amber-400' },
    { key: 'approved', label: 'Approved', count: stats.approved, color: 'text-emerald-400' },
    { key: 'rejected', label: 'Rejected', count: stats.rejected, color: 'text-red-400' },
    { key: 'all', label: 'All', count: stats.total, color: 'text-slate-400' },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 page-bg min-h-full">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              💳 Payment Approvals
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Review and approve student payment screenshots
            </p>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-medium transition-all duration-200"
            title="Refresh payment records"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? 'animate-spin text-primary-400' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div
            onClick={() => setActiveTab('pending')}
            className={`glass-card p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 cursor-pointer transition-all ${
              activeTab === 'pending' ? 'ring-2 ring-amber-500/40' : 'hover:border-amber-500/40'
            }`}
          >
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Pending</p>
            <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
          </div>

          <div
            onClick={() => setActiveTab('approved')}
            className={`glass-card p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 cursor-pointer transition-all ${
              activeTab === 'approved' ? 'ring-2 ring-emerald-500/40' : 'hover:border-emerald-500/40'
            }`}
          >
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Approved</p>
            <p className="text-2xl font-bold text-emerald-400">{stats.approved}</p>
          </div>

          <div
            onClick={() => setActiveTab('rejected')}
            className={`glass-card p-4 bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 cursor-pointer transition-all ${
              activeTab === 'rejected' ? 'ring-2 ring-red-500/40' : 'hover:border-red-500/40'
            }`}
          >
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Rejected</p>
            <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
          </div>

          <div
            onClick={() => setActiveTab('all')}
            className={`glass-card p-4 bg-gradient-to-br from-primary-500/10 to-primary-600/5 border border-primary-500/20 cursor-pointer transition-all ${
              activeTab === 'all' ? 'ring-2 ring-primary-500/40' : 'hover:border-primary-500/40'
            }`}
          >
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Total</p>
            <p className="text-2xl font-bold text-primary-400">{stats.total}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-dark-800 rounded-xl border border-white/5 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs font-bold ${tab.color}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Payment Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-card p-6 h-56 animate-pulse bg-dark-700/60 rounded-2xl" />
            ))}
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center text-3xl mx-auto mb-4">
              {activeTab === 'pending' ? '⏳' : activeTab === 'approved' ? '✅' : activeTab === 'rejected' ? '❌' : '📋'}
            </div>
            <p className="text-slate-300 font-medium text-base mb-1">No {activeTab === 'all' ? '' : activeTab} payments found</p>
            <p className="text-slate-500 text-xs">
              {activeTab === 'pending'
                ? 'All submitted payments have been reviewed.'
                : 'No records in this category.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPayments.map((payment) => (
              <div
                key={payment._id}
                className="glass-card p-5 hover:border-white/15 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Candidate Info */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-md">
                        {payment.candidate?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{payment.candidate?.name || 'Unknown Candidate'}</p>
                        <p className="text-slate-500 text-xs">{payment.candidate?.email || 'No email'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={SUBJECT_COLORS[payment.subject] || 'badge'}>
                        {SUBJECT_LABELS[payment.subject] || payment.subject}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        payment.status === 'pending'
                          ? 'bg-amber-500/15 text-amber-400'
                          : payment.status === 'approved'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-red-500/15 text-red-400'
                      }`}>
                        {payment.status === 'pending' ? '⏳ Pending' : payment.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                      </span>
                    </div>
                  </div>

                  {/* Phone */}
                  {payment.candidate?.phone && (
                    <p className="text-slate-400 text-xs mb-3 flex items-center gap-1.5">
                      <span>📱</span> {payment.candidate.phone}
                    </p>
                  )}

                  {/* Screenshot Thumbnail */}
                  <div
                    onClick={() => setLightbox(payment.screenshot)}
                    className="cursor-pointer group mb-4"
                  >
                    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-dark-800/80 min-h-[160px] flex items-center justify-center">
                      <img
                        src={payment.screenshot}
                        alt="Payment screenshot"
                        loading="lazy"
                        className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-all duration-300 flex items-center justify-center">
                        <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur-sm shadow-md">
                          🔍 Click to enlarge
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Amount & Time */}
                  <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
                    <span className="text-amber-400 font-bold text-sm">₹{payment.amount}</span>
                    <span>
                      {new Date(payment.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </span>
                  </div>

                  {/* Rejection Reason */}
                  {payment.status === 'rejected' && payment.rejectionReason && (
                    <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                      <span className="font-semibold">Reason:</span> {payment.rejectionReason}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div>
                  {payment.status === 'pending' && (
                    <div className="flex gap-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => handleApprove(payment._id)}
                        disabled={actionLoading === payment._id}
                        className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                      >
                        {actionLoading === payment._id ? 'Approving...' : '✅ Approve'}
                      </button>
                      <button
                        onClick={() => { setRejectModal(payment._id); setRejectReason(''); }}
                        disabled={actionLoading === payment._id}
                        className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  )}

                  {payment.reviewedAt && (
                    <p className="text-[11px] text-slate-500 mt-2 text-right">
                      Reviewed:{' '}
                      {new Date(payment.reviewedAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-dark-800 border border-white/20 flex items-center justify-center text-white hover:bg-red-500 transition-colors z-10 shadow-lg"
            >
              ✕
            </button>
            <img
              src={lightbox}
              alt="Payment screenshot full view"
              className="max-w-full max-h-[85vh] rounded-2xl border border-white/10 shadow-2xl object-contain bg-black/50"
            />
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setRejectModal(null)}
        >
          <div
            className="glass-card p-6 w-full max-w-md animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              ❌ Reject Payment
            </h3>
            <label className="form-label">Reason for rejection (optional)</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Screenshot is blurry, amount doesn't match, UTR not visible..."
              className="form-input resize-none h-24 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectModal(null)}
                className="btn-ghost flex-1 py-2.5 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading === rejectModal}
                className="btn-danger flex-1 py-2.5 text-sm"
              >
                {actionLoading === rejectModal ? 'Rejecting...' : 'Reject Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
