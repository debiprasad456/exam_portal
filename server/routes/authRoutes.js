const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const auth = require('../middleware/auth');

/**
 * POST /api/auth/setup
 * First-time admin setup. Only works if NO admin exists in the database.
 */
router.post('/setup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const existing = await Admin.findOne();
    if (existing) {
      return res.status(400).json({ message: 'Admin already exists. Please login.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = new Admin({ email, passwordHash });
    await admin.save();

    res.status(201).json({ message: 'Admin account created successfully. You can now login.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/auth/admin-exists
 * Tells the frontend whether admin setup is needed.
 */
router.get('/admin-exists', async (req, res) => {
  try {
    const admin = await Admin.findOne();
    res.json({ exists: !!admin });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/auth/login
 * Admin login — returns JWT.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isValid = await admin.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign({ adminId: admin._id }, process.env.JWT_SECRET, {
      expiresIn: '12h',
    });

    res.json({ token, email: admin.email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/auth/verify
 * Verify JWT token validity.
 */
router.get('/verify', auth, (req, res) => {
  res.json({ valid: true, adminId: req.adminId });
});

module.exports = router;
