import { create } from 'zustand';

const useCandidateStore = create((set) => ({
  candidateId: localStorage.getItem('candidateId') || null,
  name: localStorage.getItem('candidateName') || null,
  subject: localStorage.getItem('candidateSubject') || null,
  token: localStorage.getItem('candidateToken') || null,
  hasSubmitted: localStorage.getItem('hasSubmitted') === 'true',
  paymentStatus: localStorage.getItem('paymentStatus') || 'pending',

  register: (candidateId, name, subject, token = null) => {
    localStorage.setItem('candidateId', candidateId);
    localStorage.setItem('candidateName', name);
    localStorage.setItem('candidateSubject', subject);
    if (token) localStorage.setItem('candidateToken', token);
    localStorage.removeItem('hasSubmitted');
    localStorage.setItem('paymentStatus', 'pending');
    set({ candidateId, name, subject, token, hasSubmitted: false, paymentStatus: 'pending' });
  },

  setPaymentStatus: (status) => {
    localStorage.setItem('paymentStatus', status);
    set({ paymentStatus: status });
  },

  setSubmitted: () => {
    localStorage.setItem('hasSubmitted', 'true');
    set({ hasSubmitted: true });
  },

  clear: () => {
    localStorage.removeItem('candidateId');
    localStorage.removeItem('candidateName');
    localStorage.removeItem('candidateSubject');
    localStorage.removeItem('candidateToken');
    localStorage.removeItem('hasSubmitted');
    localStorage.removeItem('paymentStatus');
    set({ candidateId: null, name: null, subject: null, token: null, hasSubmitted: false, paymentStatus: 'pending' });
  },
}));

export default useCandidateStore;
