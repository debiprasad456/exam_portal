import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerCandidate } from '../../api';
import useCandidateStore from '../../stores/candidateStore';
import AuthRoleToggle from '../../components/AuthRoleToggle';

const SUBJECTS = [
  { value: 'marketing', label: 'Marketing', icon: '📈', desc: 'Market analysis, strategy & consumer behavior' },
  { value: 'hr', label: 'Human Resources', icon: '🤝', desc: 'Recruitment, HR policies & employee relations' },
  { value: 'digital_marketing', label: 'Digital Marketing', icon: '💻', desc: 'SEO, social media & digital strategies' },
  { value: 'general_reasoning', label: 'General Reasoning', icon: '🧠', desc: 'Logical reasoning, analytical & problem-solving skills' },
];

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', subject: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { candidateId, register } = useCandidateStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (candidateId) navigate('/waiting');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject) { setError('Please select a subject.'); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await registerCandidate(form);
      register(data.candidateId, data.name, data.subject, data.token);
      navigate('/waiting');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen page-bg flex items-center justify-center p-4">
      <div className="w-full max-w-2xl animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center px-4 py-2 rounded-2xl bg-dark-800/90 border border-white/10 mb-4 shadow-xl shadow-primary-500/15">
            <img src="/Logo1.jpg" alt="DS Logo" className="h-12 w-auto max-w-[160px] object-contain rounded-lg" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">DS Exam Portal</h1>
          <p className="text-slate-400 mt-2">Register to begin your examination</p>
        </div>

        <div className="glass-card p-5 sm:p-8">
          <AuthRoleToggle activeRole="candidate" />
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-6">📝 Candidate Registration</h2>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="form-label">Full Name</label>
                <input
                  id="candidate-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="John Doe"
                  className="form-input"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="form-label">Phone Number</label>
                <input
                  id="candidate-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label">Email Address</label>
              <input
                id="candidate-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">Residential Address</label>
              <textarea
                id="candidate-address"
                rows={2}
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Enter your complete street address, city, state, pin code"
                className="form-input resize-none py-2.5"
                required
              />
            </div>

            {/* Subject Selection */}
            <div>
              <label className="form-label">Select Your Exam Subject</label>
              <div className="grid grid-cols-1 gap-3">
                {SUBJECTS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, subject: s.value }))}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                      form.subject === s.value
                        ? 'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/20'
                        : 'border-white/10 bg-white/3 hover:border-white/20'
                    }`}
                  >
                    <span className="text-2xl">{s.icon}</span>
                    <div>
                      <p className="text-white font-semibold text-sm">{s.label}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{s.desc}</p>
                    </div>
                    {form.subject === s.value && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              id="register-btn"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 text-base mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Registering...
                </span>
              ) : 'Register & Proceed to Waiting Room'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          Once submitted, you cannot retake the exam. Make sure all information is correct.
        </p>
      </div>
    </div>
  );
}
