const jwt = require('jsonwebtoken');
const ExamSession = require('../models/ExamSession');
const Candidate = require('../models/Candidate');

/**
 * Start a server-authoritative countdown timer for a subject exam.
 * Broadcasts start events to candidates and admin in real time.
 */
const startExamTimer = (io, session) => {
  const { subject, duration, sessionId } = session;

  // Notify candidates in the subject room and admin room
  io.to(`subject:${subject}`).emit('exam:started', { subject, duration, sessionId });
  io.to('admin').emit('exam:started', { subject, duration, sessionId });

  console.log(`▶️  Exam session started for subject: ${subject} | Candidate Duration: ${duration}s`);
};

/**
 * Forcefully stop an exam (admin stop action).
 */
const stopExamTimer = async (io, subject) => {
  try {
    await ExamSession.updateMany(
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
    socket.on('admin:join', async (token) => {
      try {
        if (!token) throw new Error('Missing admin token');
        jwt.verify(token, process.env.JWT_SECRET);
        socket.join('admin');
        console.log(`👑 Admin joined admin room: ${socket.id}`);

        // Send current active sessions to admin directly from database (resilient to server restarts)
        const activeSessions = await ExamSession.find({ status: 'active' }).lean();
        for (const session of activeSessions) {
          const elapsed = session.startedAt
            ? Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000)
            : 0;
          const timeLeft = Math.max(0, (session.duration || 0) - elapsed);
          socket.emit('exam:tick', { subject: session.subject, timeLeft });
        }
      } catch (err) {
        socket.emit('error', { message: 'Unauthorized: invalid admin token' });
      }
    });

    // Candidate joins their subject room with authentication
    socket.on('candidate:join', async (data) => {
      try {
        const subject = typeof data === 'object' ? data.subject : null;
        const token = typeof data === 'object' ? data.token : null;
        const candidateId = typeof data === 'object' ? data.candidateId : null;

        if (!subject) {
          return socket.emit('error', { message: 'Subject is required to join' });
        }

        let authenticatedCandidateId = null;

        // 1. Verify via JWT token if provided
        if (token) {
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.subject === subject) {
              authenticatedCandidateId = decoded.candidateId;
            }
          } catch (tokenErr) {
            console.warn(`Candidate token verification failed for socket ${socket.id}: ${tokenErr.message}`);
          }
        }

        // 2. Database validation fallback
        if (!authenticatedCandidateId && candidateId) {
          const candidate = await Candidate.findById(candidateId).lean();
          if (candidate && candidate.subject === subject) {
            authenticatedCandidateId = candidate._id.toString();
          }
        }

        if (!authenticatedCandidateId) {
          console.warn(`❌ Unauthorized candidate join attempt on subject ${subject} from socket ${socket.id}`);
          return socket.emit('error', { message: 'Unauthorized: candidate authentication required' });
        }

        socket.join(`subject:${subject}`);
        socket.join(`candidate:${authenticatedCandidateId}`);
        socket.candidate = { candidateId: authenticatedCandidateId, subject };
        console.log(`👤 Authenticated candidate (${authenticatedCandidateId}) joined subject: ${subject} | Socket: ${socket.id}`);
      } catch (err) {
        console.error('Error during candidate:join:', err.message);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });
};

const activeTimers = new Map();

module.exports = { initSocket, startExamTimer, stopExamTimer, activeTimers };
