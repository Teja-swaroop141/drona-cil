const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /modules?course_id=X — all modules for a course (public)
router.get('/', async (req, res) => {
    try {
        const { course_id } = req.query;
        let query = 'SELECT * FROM course_modules';
        const params = [];
        if (course_id) { query += ' WHERE course_id = ?'; params.push(course_id); }
        query += ' ORDER BY order_number ASC';
        const [rows] = await pool.query(query, params);
        return res.json({ data: rows, error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

// GET /modules/:id — single module (public)
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM course_modules WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ data: null, error: 'Not found' });
        return res.json({ data: rows[0], error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

// GET /modules/:id/quiz-questions — quiz questions WITHOUT correct_answer (for students)
router.get('/:id/quiz-questions', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, module_id, question_text, option_a, option_b, option_c, option_d, order_number, created_at
       FROM quiz_questions WHERE module_id = ? ORDER BY order_number ASC`,
            [req.params.id]
        );
        return res.json({ data: rows, error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

// GET /modules/:id/quiz-questions/admin — WITH correct_answer (admin only)
router.get('/:id/quiz-questions/admin', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM quiz_questions WHERE module_id = ? ORDER BY order_number ASC',
            [req.params.id]
        );
        return res.json({ data: rows, error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

// POST /modules — admin only
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { course_id, title, description, order_number, duration, is_preview, video_url,
            has_quiz, pass_percentage, total_questions, requires_passing, allow_retries,
            show_score_after_submission } = req.body;
        const id = uuidv4();
        await pool.query(
            `INSERT INTO course_modules (id, course_id, title, description, order_number, duration,
        is_preview, video_url, has_quiz, pass_percentage, total_questions, requires_passing,
        allow_retries, show_score_after_submission)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, course_id, title, description || null, order_number, duration,
                is_preview ? 1 : 0, video_url || null, has_quiz ? 1 : 0,
                pass_percentage || 70, total_questions || 0, requires_passing ? 1 : 0,
                allow_retries !== false ? 1 : 0, show_score_after_submission !== false ? 1 : 0]
        );
        const [rows] = await pool.query('SELECT * FROM course_modules WHERE id = ?', [id]);
        return res.status(201).json({ data: rows[0], error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

// PUT /modules/:id — admin only
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const allowed = ['title', 'description', 'order_number', 'duration', 'is_preview',
            'video_url', 'has_quiz', 'pass_percentage', 'total_questions',
            'requires_passing', 'allow_retries', 'show_score_after_submission'];
        const updates = []; const values = [];
        for (const f of allowed) {
            if (req.body[f] !== undefined) {
                updates.push(`${f} = ?`);
                values.push(typeof req.body[f] === 'boolean' ? (req.body[f] ? 1 : 0) : req.body[f]);
            }
        }
        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
        values.push(req.params.id);
        await pool.query(`UPDATE course_modules SET ${updates.join(', ')} WHERE id = ?`, values);
        const [rows] = await pool.query('SELECT * FROM course_modules WHERE id = ?', [req.params.id]);
        return res.json({ data: rows[0], error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

// DELETE /modules/:id — admin only
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM course_modules WHERE id = ?', [req.params.id]);
        return res.json({ data: null, error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

module.exports = router;
