const jwt = require('jsonwebtoken');
const ExamSession = require('../models/ExamSession');

// In-memory map: subject → { intervalId, timeLeft }
const activeTimers = new Map();

/**
 * Start a server-authoritative countdown timer for a subject exam.
 * Broadcasts tick events to candidates and admin in real time.
 */
const startExamTimer = (io, session) => {
  const { subject, duration, sessionId, _id } = session;
  let timeLeft = duration; // seconds

  // Notify candidates in the subject room and admin room
  io.to(`subject:${subject}`).emit('exam:started', { subject, duration, timeLeft, sessionId });
  io.to('admin').emit('exam:started', { subject, duration, timeLeft, sessionId });

  // Clear any pre-existing timer for this subject
  if (activeTimers.has(subject)) {
    clearInterval(activeTimers.get(subject).intervalId);
  }

  const intervalId = setInterval(async () => {
    timeLeft -= 1;

    io.to(`subject:${subject}`).emit('exam:tick', { subject, timeLeft });
    io.to('admin').emit('exam:tick', { subject, timeLeft });

    if (timeLeft <= 0) {
      clearInterval(intervalId);
      activeTimers.delete(subject);

      // Update DB session status
      try {
        await ExamSession.findByIdAndUpdate(_id, {
          status: 'ended',
          endedAt: new Date(),
        });
      } catch (err) {
        console.error('Error ending session:', err.message);
      }

      // Notify all parties
      io.to(`subject:${subject}`).emit('exam:ended', { subject });
      io.to('admin').emit('exam:ended', { subject });
      console.log(`⏰ Exam ended for subject: ${subject}`);
    }
  }, 1000);

  activeTimers.set(subject, { intervalId, timeLeft });
  console.log(`▶️  Exam timer started for subject: ${subject} | Duration: ${duration}s`);
};

/**
 * Forcefully stop an exam (admin stop action).
 */
const stopExamTimer = async (io, subject) => {
  const timer = activeTimers.get(subject);
  if (timer) {
    clearInterval(timer.intervalId);
    activeTimers.delete(subject);
  }

  try {
    await ExamSession.findOneAndUpdate(
      { subject, status: 'active' },
      { status: 'ended', endedAt: new Date() }
    );
  } catch (err) {
    console.error('Error stopping session:', err.message);
  }

  io.to(`subject:${subject}`).emit('exam:ended', { subject });
  io.to('admin').emit('exam:ended', { subject });
  console.log(`⏹  Exam forcefully stopped for subject: ${subject}`);
};

/**
 * Initialize Socket.IO event handlers.
 */
const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Admin joins admin room (send JWT token for verification)
    socket.on('admin:join', (token) => {
      try {
        jwt.verify(token, process.env.JWT_SECRET);
        socket.join('admin');
        console.log(`👑 Admin joined admin room: ${socket.id}`);

        // Send current active sessions to admin
        activeTimers.forEach((timer, subject) => {
          socket.emit('exam:tick', { subject, timeLeft: timer.timeLeft });
        });
      } catch {
        socket.emit('error', { message: 'Unauthorized: invalid admin token' });
      }
    });

    // Candidate joins their subject room
    socket.on('candidate:join', ({ subject }) => {
      if (subject) {
        socket.join(`subject:${subject}`);
        console.log(`👤 Candidate joined subject room: ${subject} | Socket: ${socket.id}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = { initSocket, startExamTimer, stopExamTimer, activeTimers };
