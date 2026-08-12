import { useState, useEffect } from 'react';
import { getAdminQuestions, createQuestion, updateQuestion, deleteQuestion } from '../../api';

const SUBJECTS = [
  { value: 'marketing', label: 'Marketing', color: 'text-purple-300 bg-purple-500/10 border-purple-500/20' },
  { value: 'hr', label: 'HR', color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20' },
  { value: 'digital_marketing', label: 'Digital Marketing', color: 'text-pink-300 bg-pink-500/10 border-pink-500/20' },
  { value: 'general_reasoning', label: 'General Reasoning', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
];

const EMPTY_FORM = {
  subject: 'marketing',
  questionText: '',
  options: ['', '', '', ''],
  correctIndex: 0,
};

export default function Questions() {
  const [questions, setQuestions] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = () => {
    setLoading(true);
    getAdminQuestions()
      .then(({ data }) => setQuestions(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (q) => {
    setForm({ subject: q.subject, questionText: q.questionText, options: [...q.options], correctIndex: q.correctIndex });
    setEditingId(q._id);
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.options.some((o) => !o.trim())) { setError('All 4 options must be filled.'); return; }
    if (!form.questionText.trim()) { setError('Question text is required.'); return; }
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await updateQuestion(editingId, form);
      } else {
        await createQuestion(form);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save question.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteQuestion(id);
      setDeleteConfirm(null);
      load();
    } catch {}
  };

  const setOption = (idx, val) => {
    const opts = [...form.options];
    opts[idx] = val;
    setForm((f) => ({ ...f, options: opts }));
  };

  const filtered = filter ? questions.filter((q) => q.subject === filter) : questions;

  return (
    <div className="p-4 sm:p-6 md:p-8 page-bg min-h-full">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Question Bank</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">{questions.length} total questions across all subjects</p>
          </div>
          <button id="add-question-btn" onClick={openCreate} className="btn-primary w-full sm:w-auto">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Question
          </button>
        </div>

        {/* Subject Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilter('')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              filter === '' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-white bg-white/5'
            }`}
          >
            All ({questions.length})
          </button>
          {SUBJECTS.map((s) => {
            const cnt = questions.filter((q) => q.subject === s.value).length;
            return (
              <button
                key={s.value}
                onClick={() => setFilter(s.value)}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  filter === s.value ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-white bg-white/5'
                }`}
              >
                {s.label} ({cnt})
              </button>
            );
          })}
        </div>

        {/* Questions Table */}
        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading questions...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-slate-400 text-sm sm:text-base">No questions yet. Click "Add Question" to create one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table min-w-[640px]">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Subject</th>
                    <th>Question</th>
                    <th>Options</th>
                    <th>Correct</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((q, i) => {
                    const subj = SUBJECTS.find((s) => s.value === q.subject);
                    return (
                      <tr key={q._id}>
                        <td className="text-slate-500 text-xs">{i + 1}</td>
                        <td>
                          <span className={`badge border ${subj?.color}`}>{subj?.label}</span>
                        </td>
                        <td className="max-w-xs">
                          <p className="text-white text-sm line-clamp-2">{q.questionText}</p>
                        </td>
                        <td>
                          <div className="space-y-0.5">
                            {q.options.map((opt, idx) => (
                              <p key={idx} className={`text-xs ${idx === q.correctIndex ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                                {['A', 'B', 'C', 'D'][idx]}. {opt}
                              </p>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className="text-emerald-400 font-bold text-sm">
                            {['A', 'B', 'C', 'D'][q.correctIndex]}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEdit(q)}
                              className="px-3 py-1.5 text-xs rounded-lg bg-primary-500/10 text-primary-300 border border-primary-500/20 hover:bg-primary-500/20 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(q._id)}
                              className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in">
          <div className="glass-card w-full max-w-2xl p-5 sm:p-8 max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingId ? 'Edit Question' : 'New Question'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="form-label">Subject</label>
                <select
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  className="form-select"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Question Text</label>
                <textarea
                  value={form.questionText}
                  onChange={(e) => setForm((f) => ({ ...f, questionText: e.target.value }))}
                  placeholder="Enter the question here..."
                  rows={3}
                  className="form-input resize-none"
                  required
                />
              </div>

              <div>
                <label className="form-label">Answer Options</label>
                <p className="text-xs text-slate-500 mb-3">Fill all 4 options and select the correct answer (●)</p>
                <div className="space-y-3">
                  {form.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, correctIndex: idx }))}
                        className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                          form.correctIndex === idx
                            ? 'border-emerald-400 bg-emerald-400/20 text-emerald-400'
                            : 'border-slate-600 text-slate-500 hover:border-slate-400'
                        }`}
                        title="Mark as correct answer"
                      >
                        {['A', 'B', 'C', 'D'][idx]}
                      </button>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => setOption(idx, e.target.value)}
                        placeholder={`Option ${['A', 'B', 'C', 'D'][idx]}`}
                        className="form-input flex-1"
                        required
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  ✅ Correct answer: Option <strong className="text-emerald-400">{['A', 'B', 'C', 'D'][form.correctIndex]}</strong>
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving...' : editingId ? 'Update Question' : 'Create Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="glass-card p-8 max-w-sm w-full text-center animate-slide-up">
            <p className="text-4xl mb-4">⚠️</p>
            <h3 className="text-xl font-bold text-white mb-2">Delete Question?</h3>
            <p className="text-slate-400 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
