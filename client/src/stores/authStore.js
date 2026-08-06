import { create } from 'zustand';

const useAuthStore = create((set) => ({
  token: localStorage.getItem('adminToken') || null,
  email: localStorage.getItem('adminEmail') || null,
  isAuthenticated: !!localStorage.getItem('adminToken'),

  login: (token, email) => {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminEmail', email);
    set({ token, email, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    set({ token: null, email: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
