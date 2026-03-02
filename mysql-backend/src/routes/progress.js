const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /progress?module_id=X — get progress for a specific module
router.get('/', requireAuth, async (req, res) => {
    try {
        const { module_id, course_id } = req.query;
        const userId = req.user.id;

        if (module_id) {
            const [rows] = await pool.query(
                'SELECT * FROM user_module_progress WHERE user_id = ? AND module_id = ?',
                [userId, module_id]
            );
            return res.json({ data: rows[0] || null, error: null });
        }

        if (course_id) {
            const [rows] = await pool.query(
                `SELECT ump.* FROM user_module_progress ump
         JOIN course_modules cm ON ump.module_id = cm.id
         WHERE ump.user_id = ? AND cm.course_id = ?`,
                [userId, course_id]
            );
            return res.json({ data: rows, error: null });
        }

        // Return all user's progress
        const [rows] = await pool.query(
            'SELECT * FROM user_module_progress WHERE user_id = ?',
            [userId]
        );
        return res.json({ data: rows, error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

// GET /progress/course/:courseId — calculate course completion percentage
router.get('/course/:courseId', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { courseId } = req.params;

        const [[{ totalModules }]] = await pool.query(
            'SELECT COUNT(*) AS totalModules FROM course_modules WHERE course_id = ?',
            [courseId]
        );
        const [[{ completedModules }]] = await pool.query(
            `SELECT COUNT(*) as completedModules
       FROM user_module_progress ump
       JOIN course_modules cm ON ump.module_id = cm.id
       WHERE ump.user_id = ? AND cm.course_id = ? AND ump.completed = 1`,
            [userId, courseId]
        );

        const percentage = totalModules > 0
            ? Math.round((completedModules / totalModules) * 100)
            : 0;

        return res.json({ data: { percentage, total: totalModules, completed: completedModules }, error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

// POST /progress — mark module as complete (upsert)
router.post('/', requireAuth, async (req, res) => {
    try {
        const { module_id, completed } = req.body;
        const userId = req.user.id;

        const [existing] = await pool.query(
            'SELECT * FROM user_module_progress WHERE user_id = ? AND module_id = ?',
            [userId, module_id]
        );

        if (existing.length > 0) {
            await pool.query(
                `UPDATE user_module_progress
         SET completed = ?, completed_at = ?
         WHERE user_id = ? AND module_id = ?`,
                [completed ? 1 : 0, completed ? new Date() : null, userId, module_id]
            );
            const [rows] = await pool.query(
                'SELECT * FROM user_module_progress WHERE user_id = ? AND module_id = ?',
                [userId, module_id]
            );
            return res.json({ data: rows[0], error: null });
        } else {
            const id = uuidv4();
            await pool.query(
                `INSERT INTO user_module_progress (id, user_id, module_id, completed, completed_at)
         VALUES (?, ?, ?, ?, ?)`,
                [id, userId, module_id, completed ? 1 : 0, completed ? new Date() : null]
            );
            const [rows] = await pool.query('SELECT * FROM user_module_progress WHERE id = ?', [id]);
            return res.status(201).json({ data: rows[0], error: null });
        }
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

module.exports = router;
