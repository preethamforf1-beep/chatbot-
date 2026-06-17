import express from 'express';
import jwt from 'jsonwebtoken';
import {
  getUserByEmailAndPassword,
  getUserByUserId
} from '../db/repository.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'dev_access_secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'dev_refresh_secret';

function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.userId || user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      name: user.name
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { userId: user.userId || user.id },
    REFRESH_TOKEN_SECRET,
    { expiresIn: '30d' }
  );
}

// POST: Standard Login Endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    // Pull directly from our local repository file handler
    const user = await getUserByEmailAndPassword(email, password);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.json({
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.userId || user.id,
        employeeId: user.employeeId,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Login route error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST: Token Refresh Endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(401).json({ success: false, error: 'Token missing' });

    jwt.verify(token, REFRESH_TOKEN_SECRET, async (err, payload) => {
      if (err) return res.status(403).json({ success: false, error: 'Invalid token' });

      const user = await getUserByUserId(payload.userId);
      if (!user) return res.status(403).json({ success: false, error: 'User not found' });

      const accessToken = generateAccessToken(user);
      return res.json({ success: true, accessToken });
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
});

// POST: Logout Endpoint
router.post('/logout', async (req, res) => {
  return res.json({ success: true, message: 'Logged out successfully' });
});

// GET: Session Verify Endpoint
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ success: false, error: 'Signature missing' });

    jwt.verify(token, ACCESS_TOKEN_SECRET, async (err, payload) => {
      if (err) return res.status(401).json({ success: false, error: 'Expired session' });
      return res.json({ success: true, user: payload });
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Verification error' });
  }
});

export default router;