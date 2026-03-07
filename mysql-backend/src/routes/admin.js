const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────
// User Roles
// ─────────────────────────────────────────

// GET /admin/roles — list all user roles
router.get('/roles', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT ur.*, u.email, p.name FROM user_roles ur
       JOIN users u ON ur.user_id = u.id
       LEFT JOIN profiles p ON ur.user_id = p.id
       ORDER BY ur.created_at DESC`
        );
        return res.json({ data: rows, error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

// POST /admin/roles — assign role to user
router.post('/roles', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { user_id, role } = req.body;
        const id = uuidv4();
        // Remove existing role first (one role per user)
        await pool.query('DELETE FROM user_roles WHERE user_id = ?', [user_id]);
        await pool.query(
            'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
            [id, user_id, role]
        );
        const [rows] = await pool.query('SELECT * FROM user_roles WHERE id = ?', [id]);
        return res.status(201).json({ data: rows[0], error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

// DELETE /admin/roles/:id — remove a role assignment
router.delete('/roles/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM user_roles WHERE id = ?', [req.params.id]);
        return res.json({ data: null, error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

// ─────────────────────────────────────────
// Quiz Attempts (for admin)
// ─────────────────────────────────────────
router.get('/quiz-attempts', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT qa.*, u.email, p.name, cm.title as module_title
       FROM quiz_attempts qa
       JOIN users u ON qa.user_id = u.id
       LEFT JOIN profiles p ON qa.user_id = p.id
       JOIN course_modules cm ON qa.module_id = cm.id
       ORDER BY qa.created_at DESC
       LIMIT 500`
        );
        return res.json({ data: rows, error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

// ─────────────────────────────────────────
// Users list (for admin)
// ─────────────────────────────────────────
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT u.id, u.email, u.created_at, p.name, p.designation, p.phone_number, ur.role
       FROM users u
       LEFT JOIN profiles p ON u.id = p.id
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       ORDER BY u.created_at DESC`
        );
        return res.json({ data: rows, error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

module.exports = router;
