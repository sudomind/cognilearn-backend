// ─────────────────────────────────────────────
//  AUTH ROUTES  —  /api/auth
// ─────────────────────────────────────────────
const express = require('express');
const { body } = require('express-validator');
const { register, login, getProfile, updateProfile, updatePassword } = require('../controllers/authController');
const { protect } = require('../middleware/errorMiddleware');

const authRouter = express.Router();

authRouter.post('/register', [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], register);

authRouter.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], login);

authRouter.get('/profile',          protect, getProfile);
authRouter.put('/profile',          protect, updateProfile);
authRouter.put('/password',         protect, updatePassword);

module.exports = authRouter;
