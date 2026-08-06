import { io } from 'socket.io-client';

const RENDER_BACKEND_URL = 'https://exam-portal-server-tliz.onrender.com';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? RENDER_BACKEND_URL
    : 'http://localhost:5000');

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default getSocket;
