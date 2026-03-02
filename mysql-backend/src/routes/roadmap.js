const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /roadmap?course_id=X — all roadmap items for a course (public)
router.get('/', async (req, res) => {
    try {
        const { course_id } = req.query;
        let query = 'SELECT * FROM course_roadmap_items';
        const params = [];
        if (course_id) { query += ' WHERE course_id = ?'; params.push(course_id); }
        query += ' ORDER BY order_number ASC';
        const [rows] = await pool.query(query, params);
        return res.json({ data: rows, error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

// GET /roadmap/:id
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM course_roadmap_items WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ data: null, error: 'Not found' });
        return res.json({ data: rows[0], error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

// POST /roadmap — admin only
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { course_id, title, description, order_number, duration, item_type, icon, is_required, video_url } = req.body;
        const id = uuidv4();
        await pool.query(
            `INSERT INTO course_roadmap_items (id, course_id, title, description, order_number, duration, item_type, icon, is_required, video_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, course_id, title, description || null, order_number, duration || null,
                item_type || 'milestone', icon || 'circle', is_required !== false ? 1 : 0, video_url || null]
        );
        const [rows] = await pool.query('SELECT * FROM course_roadmap_items WHERE id = ?', [id]);
        return res.status(201).json({ data: rows[0], error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

// PUT /roadmap/:id — admin only
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const allowed = ['title', 'description', 'order_number', 'duration', 'item_type', 'icon', 'is_required', 'video_url'];
        const updates = []; const values = [];
        for (const f of allowed) {
            if (req.body[f] !== undefined) {
                updates.push(`${f} = ?`);
                values.push(typeof req.body[f] === 'boolean' ? (req.body[f] ? 1 : 0) : req.body[f]);
            }
        }
        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
        values.push(req.params.id);
        await pool.query(`UPDATE course_roadmap_items SET ${updates.join(', ')} WHERE id = ?`, values);
        const [rows] = await pool.query('SELECT * FROM course_roadmap_items WHERE id = ?', [req.params.id]);
        return res.json({ data: rows[0], error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

// DELETE /roadmap/:id — admin only
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM course_roadmap_items WHERE id = ?', [req.params.id]);
        return res.json({ data: null, error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

module.exports = router;
