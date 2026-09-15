const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const auth = require('../middleware/auth');
const emailService = require('../services/emailService');

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

/**
 * POST /api/auth/forgot-password
 * Generates an OTP and sends it via email to reset admin password.
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required.' });
    }

    let admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      const ownerEmail = (process.env.SMTP_USER || '').toLowerCase().trim();
      if (ownerEmail && email.toLowerCase().trim() === ownerEmail) {
        const dummyHash = await bcrypt.hash(Math.random().toString(), 10);
        admin = new Admin({
          email: ownerEmail,
          passwordHash: dummyHash,
        });
        await admin.save();
      } else {
        return res.status(404).json({ message: 'No admin account found with this email address.' });
      }
    }

    // Generate secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    admin.resetPasswordOtp = otp;
    admin.resetPasswordExpires = expires;
    await admin.save();

    // Send email via configured SMTP
    await emailService.sendPasswordResetOtpEmail({
      toEmail: admin.email,
      otp,
    });

    res.json({
      message: `A 6-digit verification code has been sent to ${admin.email}.`,
      email: admin.email,
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: err.message || 'Failed to process forgot password request.' });
  }
});

/**
 * POST /api/auth/reset-password
 * Verifies OTP and updates password.
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, verification code, and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      return res.status(404).json({ message: 'No admin account found with this email.' });
    }

    if (!admin.resetPasswordOtp || !admin.resetPasswordExpires) {
      return res.status(400).json({ message: 'No reset code requested or code already used. Please request a new one.' });
    }

    if (new Date() > new Date(admin.resetPasswordExpires)) {
      admin.resetPasswordOtp = undefined;
      admin.resetPasswordExpires = undefined;
      await admin.save();
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    if (admin.resetPasswordOtp !== otp.trim()) {
      return res.status(400).json({ message: 'Invalid verification code. Please check and try again.' });
    }

    // Hash new password and clear reset fields
    const passwordHash = await bcrypt.hash(newPassword, 12);
    admin.passwordHash = passwordHash;
    admin.resetPasswordOtp = undefined;
    admin.resetPasswordExpires = undefined;
    await admin.save();

    res.json({ message: 'Password has been reset successfully! You can now sign in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: err.message || 'Failed to reset password.' });
  }
});

module.exports = router;

