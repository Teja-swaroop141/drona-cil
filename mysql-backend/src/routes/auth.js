const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const pool = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

// Helper — create nodemailer transporter
function createTransport() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

// Helper — format user + profile for response (mirrors Supabase user object)
function formatUser(user, profile) {
    return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        user_metadata: {
            name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '',
            prefix: profile?.prefix || null,
            first_name: profile?.first_name || null,
            last_name: profile?.last_name || null,
            gender: profile?.gender || null,
            designation: profile?.designation || null,
            phone_number: profile?.phone_number || null,
        },
    };
}

// ─────────────────────────────────────────
// POST /auth/signup
// ─────────────────────────────────────────
router.post('/signup', async (req, res) => {
    try {
        const { email, password, options } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'email and password are required' });
        }

        const meta = options?.data || {};

        // Check if email already exists
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'User already registered' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const userId = uuidv4();
        const firstName = meta.first_name || '';
        const lastName = meta.last_name || '';
        const fullName = meta.name || `${firstName} ${lastName}`.trim();

        // Insert user
        await pool.query(
            'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
            [userId, email, passwordHash]
        );

        // Insert profile
        await pool.query(
            `INSERT INTO profiles (id, name, email, first_name, last_name, gender, designation, phone_number, prefix)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, fullName, email, firstName, lastName, meta.gender || null,
                meta.designation || null, meta.phone_number || null, meta.prefix || null]
        );

        // Insert default 'user' role
        await pool.query(
            'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
            [uuidv4(), userId, 'user']
        );

        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
        const [profiles] = await pool.query('SELECT * FROM profiles WHERE id = ?', [userId]);
        const user = formatUser(users[0], profiles[0]);

        const token = signToken({ id: userId, email, role: 'user' });

        return res.status(201).json({ user, token });
    } catch (err) {
        console.error('Signup error:', err);
        return res.status(500).json({ error: 'Signup failed' });
    }
});

// ─────────────────────────────────────────
// POST /auth/login
// ─────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'email and password are required' });
        }

        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid login credentials' });
        }
        const dbUser = users[0];

        const valid = await bcrypt.compare(password, dbUser.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid login credentials' });
        }

        // Get role
        const [roles] = await pool.query(
            'SELECT role FROM user_roles WHERE user_id = ? ORDER BY created_at LIMIT 1',
            [dbUser.id]
        );
        const role = roles[0]?.role || 'user';

        const [profiles] = await pool.query('SELECT * FROM profiles WHERE id = ?', [dbUser.id]);
        const user = formatUser(dbUser, profiles[0]);

        const token = signToken({ id: dbUser.id, email: dbUser.email, role });

        return res.json({ user, token });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Login failed' });
    }
});

// ─────────────────────────────────────────
// GET /auth/user  (requires token)
// ─────────────────────────────────────────
router.get('/user', requireAuth, async (req, res) => {
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });

        const [profiles] = await pool.query('SELECT * FROM profiles WHERE id = ?', [req.user.id]);
        const user = formatUser(users[0], profiles[0]);
        return res.json({ user });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to get user' });
    }
});

// ─────────────────────────────────────────
// POST /auth/logout  (stateless — just acknowledges)
// ─────────────────────────────────────────
router.post('/logout', (req, res) => {
    return res.json({ success: true });
});

// ─────────────────────────────────────────
// POST /auth/reset-password  (send reset email)
// ─────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
    try {
        const { email, redirectTo } = req.body;
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        // Always return success to avoid email enumeration
        if (users.length === 0) return res.json({ success: true });

        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await pool.query(
            'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?',
            [token, expires, email]
        );

        const resetUrl = `${redirectTo || process.env.SITE_URL + '/reset-password'}?token=${token}&email=${encodeURIComponent(email)}`;

        try {
            const transporter = createTransport();
            await transporter.sendMail({
                from: `"NTS CIIL Learning" <${process.env.SMTP_USER}>`,
                to: email,
                subject: 'Reset your password — NTS CIIL Learning',
                html: `<p>Click below to reset your password (link expires in 1 hour):</p>
               <p><a href="${resetUrl}">${resetUrl}</a></p>`,
            });
        } catch (mailErr) {
            console.error('Email send error:', mailErr.message);
        }

        return res.json({ success: true });
    } catch (err) {
        console.error('Reset password error:', err);
        return res.status(500).json({ error: 'Failed to send reset email' });
    }
});

// ─────────────────────────────────────────
// POST /auth/update-password  (confirm reset)
// ─────────────────────────────────────────
router.post('/update-password', async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ? AND reset_token = ? AND reset_token_expires > NOW()',
            [email, token]
        );
        if (users.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);
        await pool.query(
            'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
            [passwordHash, users[0].id]
        );
        return res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to update password' });
    }
});

// ─────────────────────────────────────────
// GET /auth/has-role?role=admin  (requires token)
// ─────────────────────────────────────────
router.get('/has-role', requireAuth, async (req, res) => {
    try {
        const { role, user_id } = req.query;
        const targetUserId = user_id || req.user.id;
        const [rows] = await pool.query(
            'SELECT id FROM user_roles WHERE user_id = ? AND role = ?',
            [targetUserId, role]
        );
        return res.json({ has_role: rows.length > 0 });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to check role' });
    }
});

module.exports = router;
