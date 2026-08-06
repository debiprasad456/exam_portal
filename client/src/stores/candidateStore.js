import { create } from 'zustand';

const useCandidateStore = create((set) => ({
  candidateId: localStorage.getItem('candidateId') || null,
  name: localStorage.getItem('candidateName') || null,
  subject: localStorage.getItem('candidateSubject') || null,
  hasSubmitted: localStorage.getItem('hasSubmitted') === 'true',

  register: (candidateId, name, subject) => {
    localStorage.setItem('candidateId', candidateId);
    localStorage.setItem('candidateName', name);
    localStorage.setItem('candidateSubject', subject);
    localStorage.removeItem('hasSubmitted');
    set({ candidateId, name, subject, hasSubmitted: false });
  },

  setSubmitted: () => {
    localStorage.setItem('hasSubmitted', 'true');
    set({ hasSubmitted: true });
  },

  clear: () => {
    localStorage.removeItem('candidateId');
    localStorage.removeItem('candidateName');
    localStorage.removeItem('candidateSubject');
    localStorage.removeItem('hasSubmitted');
    set({ candidateId: null, name: null, subject: null, hasSubmitted: false });
  },
}));

export default useCandidateStore;
