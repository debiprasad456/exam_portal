const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const Question = require('../models/Question');
const ExamSession = require('../models/ExamSession');
const Result = require('../models/Result');
const Candidate = require('../models/Candidate');
const { getIO } = require('../socket/ioInstance');
const { startExamTimer, stopExamTimer } = require('../socket/examSocket');
const emailService = require('../services/emailService');

const candidateRoutes = require('./candidateRoutes');

// All routes under /api/admin are protected
router.use(auth);

/* ─────────────────────────── QUESTIONS ─────────────────────────── */

/**
 * GET /api/admin/questions
 * All questions (with correctIndex) — admin only.
 */
router.get('/questions', async (req, res) => {
  try {
    const { subject } = req.query;
    const filter = subject ? { subject } : {};
    const questions = await Question.find(filter).sort({ subject: 1, createdAt: -1 }).lean();
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/admin/questions
 * Create a new question.
 */
router.post('/questions', async (req, res) => {
  try {
    const { subject, questionText, options, correctIndex } = req.body;
    if (!subject || !questionText || !options || correctIndex === undefined) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({ message: 'Exactly 4 options are required.' });
    }
    if (correctIndex < 0 || correctIndex > 3) {
      return res.status(400).json({ message: 'correctIndex must be between 0 and 3.' });
    }

    const question = new Question({ subject, questionText, options, correctIndex });
    await question.save();
    if (candidateRoutes.clearQuestionsCache) {
      candidateRoutes.clearQuestionsCache(subject);
    }
    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * PUT /api/admin/questions/:id
 * Update an existing question.
 */
router.put('/questions/:id', async (req, res) => {
  try {
    const { subject, questionText, options, correctIndex } = req.body;
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { subject, questionText, options, correctIndex },
      { new: true, runValidators: true }
    );
    if (!question) return res.status(404).json({ message: 'Question not found.' });
    if (candidateRoutes.clearQuestionsCache) {
      candidateRoutes.clearQuestionsCache(question.subject);
    }
    res.json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * DELETE /api/admin/questions/:id
 * Delete a question.
 */
router.delete('/questions/:id', async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found.' });
    if (candidateRoutes.clearQuestionsCache) {
      candidateRoutes.clearQuestionsCache(question.subject);
    }
    res.json({ message: 'Question deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────── EXAM CONTROL ─────────────────────────── */

/**
 * GET /api/admin/exam/status
 * Get the status of all exam sessions.
 */
router.get('/exam/status', async (req, res) => {
  try {
    const sessions = await ExamSession.find().sort({ createdAt: -1 });
    const statusMap = {};
    for (const sub of ['marketing', 'hr', 'digital_marketing', 'general_reasoning']) {
      const session = sessions.find((s) => s.subject === sub);
      statusMap[sub] = {
        status: session ? session.status : 'waiting',
        sessionId: session ? session.sessionId : null,
        duration: session ? session.duration : 0,
      };
    }
    res.json(statusMap);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/admin/exam/start
 * Start exam for one or more subjects.
 * Body: { subjects: ['marketing', 'hr', 'digital_marketing', 'general_reasoning'], duration: 30 } (duration in minutes)
 */
router.post('/exam/start', async (req, res) => {
  try {
    const { subjects, duration } = req.body;
    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ message: 'Select at least one subject.' });
    }
    if (!duration || duration < 1) {
      return res.status(400).json({ message: 'Duration must be at least 1 minute.' });
    }

    const io = getIO();
    const durationSeconds = duration * 60;
    const started = [];

    for (const subject of subjects) {
      // Skip if already active
      const existing = await ExamSession.findOne({ subject, status: 'active' });
      if (existing) continue;

      // End any lingering 'waiting' sessions for this subject
      await ExamSession.updateMany({ subject, status: 'waiting' }, { status: 'ended' });

      const sessionId = uuidv4();
      const session = await ExamSession.create({
        sessionId,
        subject,
        duration: durationSeconds,
        status: 'active',
        startedAt: new Date(),
        endsAt: new Date(Date.now() + durationSeconds * 1000),
      });

      startExamTimer(io, session);
      started.push(subject);
    }

    res.json({ message: `Exam started for: ${started.join(', ') || 'none (already active)'}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/admin/exam/stop
 * Forcefully stop an exam.
 * Body: { subject: 'marketing' }
 */
router.post('/exam/stop', async (req, res) => {
  try {
    const { subject } = req.body;
    if (!subject) return res.status(400).json({ message: 'Subject is required.' });

    const io = getIO();
    await stopExamTimer(io, subject);
    res.json({ message: `Exam stopped for subject: ${subject}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * DELETE /api/admin/results/:id
 * Delete a result and its candidate record.
 */
router.delete('/results/:id', async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);
    if (!result) return res.status(404).json({ message: 'Result not found.' });

    if (result.candidate) {
      await Candidate.findByIdAndDelete(result.candidate);
    }
    await Result.findByIdAndDelete(req.params.id);

    res.json({ message: 'Result deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────── RESULTS ─────────────────────────── */

/**
 * GET /api/admin/results
 * All results with candidate details and full answer breakdown.
 * Optional query: ?subject=marketing
 */
router.get('/results', async (req, res) => {
  try {
    const { subject } = req.query;
    const filter = subject ? { subject } : {};
    const results = await Result.find(filter)
      .populate('candidate', 'name email phone address subject createdAt')
      .sort({ percentage: -1, score: -1, createdAt: -1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/admin/stats
 * Dashboard statistics.
 */
router.get('/stats', async (req, res) => {
  try {
    const [totalCandidates, totalResults, questionCounts] = await Promise.all([
      Candidate.countDocuments(),
      Result.countDocuments(),
      Question.aggregate([
        { $group: { _id: '$subject', count: { $sum: 1 } } },
      ]),
    ]);

    const subjectResultCounts = await Result.aggregate([
      { $group: { _id: '$subject', count: { $sum: 1 }, avgScore: { $avg: '$percentage' } } },
    ]);

    res.json({ totalCandidates, totalResults, questionCounts, subjectResultCounts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────── EMAIL & NOTIFICATIONS ─────────────────────────── */

/**
 * GET /api/admin/email/status
 * Check if SMTP is configured and verify live connection.
 */
router.get('/email/status', async (req, res) => {
  try {
    const configured = emailService.isConfigured();
    if (!configured) {
      return res.json({
        configured: false,
        connected: false,
        message: 'SMTP credentials (SMTP_USER or SMTP_PASS) not configured in server environment.',
      });
    }

    const verification = await emailService.verifySMTP();
    res.json({
      configured: true,
      connected: verification.success,
      message: verification.message,
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || '465',
      user: process.env.SMTP_USER,
      fromName: process.env.SMTP_FROM_NAME || 'Diverse Solutions Exam Portal',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/admin/email/test
 * Send a test email to verify SMTP delivery.
 */
router.post('/email/test', async (req, res) => {
  try {
    const { toEmail } = req.body;
    const target = (toEmail || process.env.SMTP_USER || '').trim();
    if (!target) {
      return res.status(400).json({ message: 'Recipient email is required.' });
    }

    const result = await emailService.sendTestEmail(target);
    res.json({
      message: `Test email sent successfully to ${target}!`,
      messageId: result.messageId,
    });
  } catch (err) {
    console.error('Test email failed:', err);
    res.status(500).json({ message: err.message || 'Failed to send test email.' });
  }
});

/**
 * POST /api/admin/email/send-result/:id
 * Manually send / resend exam scorecard to a candidate.
 */
router.post('/email/send-result/:id', async (req, res) => {
  try {
    const result = await Result.findById(req.params.id).populate('candidate');
    if (!result) {
      return res.status(404).json({ message: 'Result not found.' });
    }
    if (!result.candidate || !result.candidate.email) {
      return res.status(400).json({ message: 'Candidate or candidate email not found for this result.' });
    }

    const sendRes = await emailService.sendExamResultEmail({
      candidate: result.candidate,
      result,
      subjectTitle: emailService.getSubjectName(result.subject),
    });

    if (sendRes.sent) {
      result.emailSent = true;
      result.emailSentAt = new Date();
      result.emailError = undefined;
      await result.save();

      return res.json({
        message: `Scorecard sent successfully to ${result.candidate.email}!`,
        emailSentAt: result.emailSentAt,
      });
    } else {
      result.emailSent = false;
      result.emailError = sendRes.reason;
      await result.save();
      return res.status(500).json({ message: sendRes.reason || 'Failed to send scorecard email.' });
    }
  } catch (err) {
    console.error('Send result email error:', err);
    res.status(500).json({ message: err.message || 'Failed to send scorecard email.' });
  }
});

/**
 * POST /api/admin/email/send-results-bulk
 * Bulk send scorecards to multiple candidates.
 */
router.post('/email/send-results-bulk', async (req, res) => {
  try {
    const { resultIds } = req.body;
    if (!Array.isArray(resultIds) || !resultIds.length) {
      return res.status(400).json({ message: 'Array of resultIds is required.' });
    }

    const results = await Result.find({ _id: { $in: resultIds } }).populate('candidate');
    let successful = 0;
    let failed = 0;
    const errors = [];

    for (const r of results) {
      if (!r.candidate || !r.candidate.email) {
        failed++;
        continue;
      }
      try {
        const sendRes = await emailService.sendExamResultEmail({
          candidate: r.candidate,
          result: r,
          subjectTitle: emailService.getSubjectName(r.subject),
        });
        if (sendRes.sent) {
          r.emailSent = true;
          r.emailSentAt = new Date();
          r.emailError = undefined;
          await r.save();
          successful++;
        } else {
          failed++;
          errors.push({ id: r._id, error: sendRes.reason });
        }
      } catch (e) {
        failed++;
        errors.push({ id: r._id, error: e.message });
      }
    }

    res.json({
      message: `Processed bulk delivery: ${successful} sent, ${failed} failed.`,
      successful,
      failed,
      errors,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

