const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /enrollments?user_id=X — user's enrollments (auth required, own only)
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id; // always use the authenticated user's id
        const [rows] = await pool.query(
            `SELECT ue.*, c.title, c.image_url, c.instructor, c.level, c.category, c.duration
       FROM user_enrollments ue
       JOIN courses c ON ue.course_id = c.id
       WHERE ue.user_id = ?
       ORDER BY ue.enrolled_at DESC`,
            [userId]
        );
        return res.json({ data: rows, error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

// GET /enrollments/:courseId/check — check if enrolled
router.get('/:courseId/check', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM user_enrollments WHERE user_id = ? AND course_id = ?',
            [req.user.id, req.params.courseId]
        );
        return res.json({ data: rows[0] || null, error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

// POST /enrollments — enroll in a course
router.post('/', requireAuth, async (req, res) => {
    try {
        const { course_id } = req.body;
        const user_id = req.user.id;
        const id = uuidv4();

        // Check if already enrolled
        const [existing] = await pool.query(
            'SELECT id FROM user_enrollments WHERE user_id = ? AND course_id = ?',
            [user_id, course_id]
        );
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Already enrolled in this course' });
        }

        await pool.query(
            'INSERT INTO user_enrollments (id, user_id, course_id) VALUES (?, ?, ?)',
            [id, user_id, course_id]
        );

        // Increment enrolled_count on the course
        await pool.query(
            'UPDATE courses SET enrolled_count = enrolled_count + 1 WHERE id = ?',
            [course_id]
        );

        const [rows] = await pool.query('SELECT * FROM user_enrollments WHERE id = ?', [id]);
        return res.status(201).json({ data: rows[0], error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

// PUT /enrollments/:id — update progress/completed
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { progress, completed } = req.body;
        const updates = []; const values = [];
        if (progress !== undefined) { updates.push('progress = ?'); values.push(progress); }
        if (completed !== undefined) { updates.push('completed = ?'); values.push(completed ? 1 : 0); }
        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
        values.push(req.params.id, req.user.id);
        await pool.query(
            `UPDATE user_enrollments SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
            values
        );
        const [rows] = await pool.query('SELECT * FROM user_enrollments WHERE id = ?', [req.params.id]);
        return res.json({ data: rows[0] || null, error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

module.exports = router;
