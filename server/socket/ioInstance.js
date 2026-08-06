/**
 * Singleton Socket.IO instance
 * Allows any module to get/set the io object without circular dependencies.
 */
let _io = null;

const setIO = (ioInstance) => {
  _io = ioInstance;
};

const getIO = () => {
  if (!_io) throw new Error('Socket.IO not initialized');
  return _io;
};

module.exports = { setIO, getIO };
