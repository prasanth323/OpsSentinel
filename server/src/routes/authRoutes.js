import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import { registerSchema, loginSchema } from '../validation/schemas.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ops_sentinel_super_secret_jwt_key_2025_prod_secure';

/**
 * POST /api/auth/register
 */
router.post('/register', (req, res) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { username, email, password, role } = validatedData;

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'A user with this email or username already exists.'
      });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const result = db.prepare(`
      INSERT INTO users (username, email, password, role)
      VALUES (?, ?, ?, ?)
    `).run(username, email, hashedPassword, role || 'Site Reliability Engineer');

    const token = jwt.sign(
      { id: result.lastInsertRowid, username, email, role: role || 'Site Reliability Engineer' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: result.lastInsertRowid,
        username,
        email,
        role: role || 'Site Reliability Engineer'
      }
    });
  } catch (err) {
    if (err.errors) {
      return res.status(400).json({
        success: false,
        error: err.errors.map(e => e.message).join(', ')
      });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    // Allow login by email or username
    const user = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').get(email, email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email/username or password.'
      });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email/username or password.'
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      message: 'Authentication successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    if (err.errors) {
      return res.status(400).json({
        success: false,
        error: err.errors.map(e => e.message).join(', ')
      });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
