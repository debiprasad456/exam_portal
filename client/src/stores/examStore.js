import { create } from 'zustand';

const SUBJECTS = ['marketing', 'hr', 'digital_marketing', 'general_reasoning'];

const defaultSession = () => ({
  status: 'waiting', // waiting | active | ended
  timeLeft: 0,
  duration: 0,
  sessionId: null,
});

const useExamStore = create((set) => ({
  sessions: {
    marketing: defaultSession(),
    hr: defaultSession(),
    digital_marketing: defaultSession(),
    general_reasoning: defaultSession(),
  },
  // Live results received via socket (admin only)
  liveResults: [],

  setSessionStatus: (subject, data) =>
    set((state) => ({
      sessions: {
        ...state.sessions,
        [subject]: { ...state.sessions[subject], ...data },
      },
    })),

  setExamStarted: (subject, duration, sessionId) =>
    set((state) => ({
      sessions: {
        ...state.sessions,
        [subject]: { status: 'active', timeLeft: duration, duration, sessionId },
      },
    })),

  setTick: (subject, timeLeft) =>
    set((state) => ({
      sessions: {
        ...state.sessions,
        [subject]: { ...state.sessions[subject], timeLeft },
      },
    })),

  setExamEnded: (subject) =>
    set((state) => ({
      sessions: {
        ...state.sessions,
        [subject]: { ...state.sessions[subject], status: 'ended', timeLeft: 0 },
      },
    })),

  addLiveResult: (result) =>
    set((state) => ({ liveResults: [result, ...state.liveResults] })),

  clearLiveResults: () => set({ liveResults: [] }),

  // Load all sessions from server on initial load
  loadSessions: (statusMap) =>
    set(() => {
      const sessions = {};
      SUBJECTS.forEach((sub) => {
        sessions[sub] = statusMap[sub] || defaultSession();
      });
      return { sessions };
    }),
}));

export default useExamStore;
