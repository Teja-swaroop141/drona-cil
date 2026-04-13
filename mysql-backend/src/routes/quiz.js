const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────
// POST /quiz/grade — grade a quiz attempt (replaces grade-quiz Edge Function)
// ─────────────────────────────────────────
router.post('/grade', requireAuth, async (req, res) => {
    try {
        const { moduleId, answers } = req.body;
        const userId = req.user.id;

        if (!moduleId || typeof moduleId !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid moduleId' });
        }
        if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
            return res.status(400).json({ error: 'Invalid answers format' });
        }
        const answerKeys = Object.keys(answers);
        if (answerKeys.length === 0 || answerKeys.length > 100) {
            return res.status(400).json({ error: 'Invalid number of answers' });
        }
        for (const [, answer] of Object.entries(answers)) {
            if (typeof answer !== 'string' || !['A', 'B', 'C', 'D'].includes(answer)) {
                return res.status(400).json({ error: 'Invalid answer value' });
            }
        }

        // Fetch correct answers (server-side, never sent to client)
        const [questions] = await pool.query(
            'SELECT id, correct_answer FROM quiz_questions WHERE module_id = ?',
            [moduleId]
        );
        if (!questions || questions.length === 0) {
            return res.status(404).json({ error: 'No questions found for this module' });
        }

        // Get pass percentage
        const [[moduleData]] = await pool.query(
            'SELECT pass_percentage FROM course_modules WHERE id = ?',
            [moduleId]
        );
        const passPercentage = moduleData?.pass_percentage || 70;

        // Grade
        let correctCount = 0;
        questions.forEach(q => {
            if (answers[q.id] === q.correct_answer) correctCount++;
        });
        const totalQuestions = questions.length;
        const scorePercentage = (correctCount / totalQuestions) * 100;
        const passed = scorePercentage >= passPercentage;

        // Save attempt
        const attemptId = uuidv4();
        await pool.query(
            `INSERT INTO quiz_attempts (id, user_id, module_id, score, total_questions, passed, answers)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [attemptId, userId, moduleId, correctCount, totalQuestions, passed ? 1 : 0, JSON.stringify(answers)]
        );

        return res.json({ score: correctCount, totalQuestions, passed, passPercentage, attemptId });
    } catch (err) {
        console.error('Quiz grade error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ─────────────────────────────────────────
// GET /quiz/attempts?module_id=X or ?module_id:in=X,Y — user's attempts
// ─────────────────────────────────────────
router.get('/attempts', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        let query = 'SELECT * FROM quiz_attempts WHERE user_id = ?';
        const params = [userId];

        // Single module_id filter
        if (req.query['module_id']) {
            query += ' AND module_id = ?';
            params.push(req.query['module_id']);
        }
        // module_id:in filter (comma-separated list from mysql client)
        const moduleIn = req.query['module_id:in'];
        if (moduleIn) {
            const ids = String(moduleIn).split(',').filter(Boolean);
            if (ids.length > 0) {
                query += ` AND module_id IN (${ids.map(() => '?').join(',')})`;
                params.push(...ids);
            }
        }
        // passed filter
        if (req.query['passed'] !== undefined) {
            query += ' AND passed = ?';
            params.push(req.query['passed'] === 'true' || req.query['passed'] === '1' ? 1 : 0);
        }

        query += ' ORDER BY created_at DESC';

        const limit = parseInt(req.query['_limit'] || '0', 10);
        if (limit > 0) query += ` LIMIT ${limit}`;

        const [rows] = await pool.query(query, params);
        return res.json({ data: rows, error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

// ─────────────────────────────────────────
// Admin: CRUD for quiz_questions
// ─────────────────────────────────────────
router.get('/questions', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { module_id } = req.query;
        const [rows] = await pool.query(
            'SELECT * FROM quiz_questions WHERE module_id = ? ORDER BY order_number ASC',
            [module_id]
        );
        return res.json({ data: rows, error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

router.post('/questions', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { module_id, question_text, option_a, option_b, option_c, option_d, correct_answer, order_number } = req.body;
        const id = uuidv4();
        await pool.query(
            `INSERT INTO quiz_questions (id, module_id, question_text, option_a, option_b, option_c, option_d, correct_answer, order_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, module_id, question_text, option_a, option_b, option_c, option_d, correct_answer, order_number]
        );
        const [rows] = await pool.query('SELECT * FROM quiz_questions WHERE id = ?', [id]);
        return res.status(201).json({ data: rows[0], error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

router.put('/questions/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const fields = ['question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'order_number'];
        const updates = []; const values = [];
        for (const f of fields) {
            if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
        }
        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
        values.push(req.params.id);
        await pool.query(`UPDATE quiz_questions SET ${updates.join(', ')} WHERE id = ?`, values);
        const [rows] = await pool.query('SELECT * FROM quiz_questions WHERE id = ?', [req.params.id]);
        return res.json({ data: rows[0], error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

router.delete('/questions/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM quiz_questions WHERE id = ?', [req.params.id]);
        return res.json({ data: null, error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

module.exports = router;
