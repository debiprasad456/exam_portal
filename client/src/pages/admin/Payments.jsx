import { useEffect, useState } from 'react';
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
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [lightbox, setLightbox] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchData = async () => {
    try {
      const [paymentsRes, statsRes] = await Promise.all([
        getPayments(activeTab === 'all' ? '' : activeTab),
        getPaymentStats(),
      ]);
      setPayments(paymentsRes.data);
      setStats(statsRes.data);
    } catch (_) {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [activeTab]);

  // Real-time: listen for new payments
  useEffect(() => {
    const socket = getSocket();
    socket.on('payment:new', () => {
      fetchData();
    });
    return () => { socket.off('payment:new'); };
  }, [activeTab]);

  const handleApprove = async (paymentId) => {
    setActionLoading(paymentId);
    try {
      await approvePayment(paymentId);
      fetchData();
    } catch (_) {} finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal);
    try {
      await rejectPayment(rejectModal, rejectReason);
      setRejectModal(null);
      setRejectReason('');
      fetchData();
    } catch (_) {} finally {
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
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            💳 Payment Approvals
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Review and approve student payment screenshots
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="glass-card p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Pending</p>
            <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
          </div>
          <div className="glass-card p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Approved</p>
            <p className="text-2xl font-bold text-emerald-400">{stats.approved}</p>
          </div>
          <div className="glass-card p-4 bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Rejected</p>
            <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
          </div>
          <div className="glass-card p-4 bg-gradient-to-br from-primary-500/10 to-primary-600/5 border border-primary-500/20">
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
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
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
              <div key={i} className="glass-card p-6 h-48 animate-pulse bg-dark-700" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center text-3xl mx-auto mb-4">
              {activeTab === 'pending' ? '⏳' : activeTab === 'approved' ? '✅' : activeTab === 'rejected' ? '❌' : '📋'}
            </div>
            <p className="text-slate-400 text-sm">No {activeTab === 'all' ? '' : activeTab} payments found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {payments.map((payment) => (
              <div key={payment._id} className="glass-card p-5 hover:border-white/15 transition-all duration-200">
                {/* Candidate Info */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                      {payment.candidate?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{payment.candidate?.name || 'Unknown'}</p>
                      <p className="text-slate-500 text-xs">{payment.candidate?.email || ''}</p>
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
                  <p className="text-slate-500 text-xs mb-3">📱 {payment.candidate.phone}</p>
                )}

                {/* Screenshot */}
                <div
                  onClick={() => setLightbox(payment.screenshot)}
                  className="cursor-pointer group mb-4"
                >
                  <div className="relative overflow-hidden rounded-xl border border-white/10 bg-dark-700">
                    <img
                      src={payment.screenshot}
                      alt="Payment screenshot"
                      className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                      <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-3 py-1.5 rounded-lg">
                        🔍 Click to enlarge
                      </span>
                    </div>
                  </div>
                </div>

                {/* Amount & Time */}
                <div className="flex items-center justify-between mb-4 text-xs text-slate-500">
                  <span className="text-amber-400 font-semibold">₹{payment.amount}</span>
                  <span>{new Date(payment.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                </div>

                {/* Rejection Reason */}
                {payment.status === 'rejected' && payment.rejectionReason && (
                  <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    Reason: {payment.rejectionReason}
                  </div>
                )}

                {/* Actions */}
                {payment.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(payment._id)}
                      disabled={actionLoading === payment._id}
                      className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    >
                      {actionLoading === payment._id ? '...' : '✅ Approve'}
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
                  <p className="text-xs text-slate-600 mt-2">
                    Reviewed: {new Date(payment.reviewedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-dark-800 border border-white/20 flex items-center justify-center text-white hover:bg-red-500 transition-colors z-10"
            >
              ✕
            </button>
            <img
              src={lightbox}
              alt="Payment screenshot full view"
              className="max-w-full max-h-[85vh] rounded-2xl border border-white/10 shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
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
              placeholder="e.g., Screenshot is blurry, amount doesn't match, payment not visible..."
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
