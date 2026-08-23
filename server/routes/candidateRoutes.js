const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Candidate = require('../models/Candidate');
const Question = require('../models/Question');
const Result = require('../models/Result');
const ExamSession = require('../models/ExamSession');
const { getIO } = require('../socket/ioInstance');

const generateCandidateToken = (candidate) => {
  return jwt.sign(
    {
      candidateId: candidate._id.toString(),
      subject: candidate.subject,
      email: candidate.email,
      role: 'candidate',
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

/**
 * POST /api/candidate/register
 * Register a new candidate. Prevents duplicate email for an ongoing session.
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, address, subject } = req.body;
    if (!name || !email || !phone || !address || !subject) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    const validSubjects = ['marketing', 'hr', 'digital_marketing', 'general_reasoning'];
    if (!validSubjects.includes(subject)) {
      return res.status(400).json({ message: 'Invalid subject.' });
    }

    // Check if questions are assigned for this subject
    const questionCount = await Question.countDocuments({ subject });
    if (questionCount === 0) {
      return res.status(400).json({ message: 'Questions are not assigned, Please go back' });
    }

    // Check if this email has already submitted for the current or recent active session
    const activeSession = await ExamSession.findOne({ subject, status: { $in: ['waiting', 'active'] } });
    if (activeSession) {
      const existingResult = await Result.findOne({
        sessionId: activeSession.sessionId,
        'candidate': { $exists: true },
      }).populate('candidate', 'email');

      // Check if any existing candidate with same email+subject already submitted
      const candidateWithSameEmail = await Candidate.findOne({
        email: email.toLowerCase().trim(),
        subject,
      });
      if (candidateWithSameEmail) {
        const alreadySubmitted = await Result.findOne({ candidate: candidateWithSameEmail._id });
        if (alreadySubmitted) {
          return res.status(400).json({ message: 'You have already taken this exam.' });
        }
        // Re-use existing registration (reconnect)
        const token = generateCandidateToken(candidateWithSameEmail);
        return res.json({
          candidateId: candidateWithSameEmail._id,
          name: candidateWithSameEmail.name,
          subject: candidateWithSameEmail.subject,
          token,
          message: 'Welcome back!',
        });
      }
    }

    // Check for existing candidate (e.g., page refresh case)
    const existing = await Candidate.findOne({
      email: email.toLowerCase().trim(),
      subject,
    });
    if (existing) {
      const submitted = await Result.findOne({ candidate: existing._id });
      if (submitted) {
        return res.status(400).json({ message: 'You have already taken this exam.' });
      }
      const token = generateCandidateToken(existing);
      return res.json({
        candidateId: existing._id,
        name: existing.name,
        subject: existing.subject,
        token,
        message: 'Welcome back!',
      });
    }

    const candidate = new Candidate({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      address: address.trim(),
      subject,
    });
    await candidate.save();

    const token = generateCandidateToken(candidate);

    res.status(201).json({
      candidateId: candidate._id,
      name: candidate.name,
      subject: candidate.subject,
      token,
      message: 'Registered successfully! Please wait for the exam to begin.',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// In-memory cache for questions per subject to handle 150-200 concurrent user exam start bursts
const questionsCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

const clearQuestionsCache = (subject) => {
  if (subject) questionsCache.delete(subject);
  else questionsCache.clear();
};

/**
 * GET /api/candidate/questions/:subject
 * Questions for candidates — correctIndex is EXCLUDED.
 */
router.get('/questions/:subject', async (req, res) => {
  try {
    const { subject } = req.params;

    // Check in-memory cache
    const cached = questionsCache.get(subject);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json(cached.data);
    }

    const questions = await Question.find({ subject })
      .select('-correctIndex')
      .sort({ createdAt: 1 })
      .lean();

    if (!questions.length) {
      return res.status(404).json({ message: 'No questions found for this subject.' });
    }

    questionsCache.set(subject, { data: questions, timestamp: Date.now() });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/candidate/exam-status
 * Current exam session statuses for all subjects.
 * Authoritative from MongoDB ExamSession.
 */
router.get('/exam-status', async (req, res) => {
  try {
    const subjects = ['marketing', 'hr', 'digital_marketing', 'general_reasoning'];
    const statusMap = {};

    for (const subject of subjects) {
      const session = await ExamSession.findOne({
        subject,
        status: { $in: ['waiting', 'active'] },
      }).sort({ createdAt: -1 }).lean();

      let timeLeft = 0;
      if (session && session.status === 'active') {
        const elapsed = session.startedAt ? Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000) : 0;
        timeLeft = Math.max(0, (session.duration || 0) - elapsed);
      }

      statusMap[subject] = {
        status: session ? session.status : 'waiting',
        timeLeft,
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
 * GET /api/candidate/candidate-session/:candidateId
 * Individual candidate timer and status session info.
 * Sets candidate.startedAt when candidate first enters active exam.
 */
router.get('/candidate-session/:candidateId', async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.candidateId).lean();
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found.' });
    }

    const session = await ExamSession.findOne({
      subject: candidate.subject,
      status: { $in: ['waiting', 'active'] },
    }).sort({ createdAt: -1 }).lean();

    if (!session) {
      return res.json({ status: 'ended', duration: 0, timeLeft: 0 });
    }

    if (session.status === 'waiting') {
      return res.json({ status: 'waiting', duration: session.duration, timeLeft: 0 });
    }

    // Session is active. Record startedAt if candidate hasn't started yet
    let startedAt = candidate.startedAt;
    if (!startedAt) {
      startedAt = new Date();
      await Candidate.findByIdAndUpdate(candidate._id, { startedAt });
    }

    const duration = session.duration; // total duration in seconds
    const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    const timeLeft = Math.max(0, duration - elapsed);

    res.json({
      status: 'active',
      duration,
      timeLeft,
      startedAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * DELETE /api/candidate/cleanup/:candidateId
 * Remove candidate record if unsubmitted candidate leaves/aborts.
 */
router.delete('/cleanup/:candidateId', async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.candidateId);
    if (candidate) {
      const submitted = await Result.findOne({ candidate: candidate._id });
      if (!submitted) {
        await Candidate.findByIdAndDelete(candidate._id);
      }
    }
    res.json({ message: 'Candidate cleaned up.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/candidate/submit
 * Submit exam answers. Prevents retakes by checking existing results.
 * Body: { candidateId, subject, answers: [{ questionId, selectedIndex }] }
 */
router.post('/submit', async (req, res) => {
  try {
    const { candidateId, subject, answers } = req.body;
    if (!candidateId || !subject || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'candidateId, subject, and answers are required.' });
    }

    // Find candidate
    const candidate = await Candidate.findById(candidateId).lean();
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found.' });
    }

    // Prevent retake
    const existingResult = await Result.findOne({ candidate: candidateId }).lean();
    if (existingResult) {
      return res.status(400).json({ message: 'You have already submitted your exam.' });
    }

    // Find the most recent active or just-ended session for the subject
    const session = await ExamSession.findOne({
      subject,
      status: { $in: ['active', 'ended'] },
    }).sort({ startedAt: -1 }).lean();

    if (!session) {
      return res.status(400).json({ message: 'No exam session found for this subject.' });
    }

    // Prevent duplicate submission for the same session
    const sessionResult = await Result.findOne({
      candidate: candidateId,
      sessionId: session.sessionId,
    }).lean();
    if (sessionResult) {
      return res.status(400).json({ message: 'Already submitted for this session.' });
    }

    // Get all questions for the subject WITH correctIndex
    const questions = await Question.find({ subject }).lean();
    if (!questions.length) {
      return res.status(400).json({ message: 'No questions found for grading.' });
    }

    // Build answer breakdown
    let score = 0;
    const processedAnswers = questions.map((question) => {
      const submitted = answers.find((a) => a.questionId === question._id.toString());
      const selectedIndex = submitted ? submitted.selectedIndex : -1;
      const isCorrect = selectedIndex !== -1 && selectedIndex === question.correctIndex;
      if (isCorrect) score++;
      return {
        questionId: question._id,
        questionText: question.questionText,
        options: question.options,
        selectedIndex,
        correctIndex: question.correctIndex,
        isCorrect,
      };
    });

    const totalQuestions = processedAnswers.length;
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    // Save result
    const result = await Result.create({
      candidate: candidate._id,
      subject,
      sessionId: session.sessionId,
      answers: processedAnswers,
      score,
      totalQuestions,
      percentage,
    });

    // Mark candidate as submitted
    await Candidate.findByIdAndUpdate(candidateId, { hasSubmitted: true });

    // Emit live result to admin room
    try {
      const io = getIO();
      const populated = await Result.findById(result._id).populate(
        'candidate',
        'name email phone address subject'
      );
      io.to('admin').emit('result:new', { result: populated });
    } catch (_) {}

    res.json({
      message: 'Exam submitted successfully!',
      score,
      totalQuestions,
      percentage,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.clearQuestionsCache = clearQuestionsCache;
module.exports = router;
