const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /courses — list all (public)
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM courses ORDER BY created_at DESC'
        );
        return res.json({ data: rows, error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

// GET /courses/:id — single course (public)
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM courses WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ data: null, error: 'Not found' });
        return res.json({ data: rows[0], error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

// POST /courses — admin only
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { title, description, image_url, instructor, duration, level, category, price, rating } = req.body;
        const id = uuidv4();
        await pool.query(
            `INSERT INTO courses (id, title, description, image_url, instructor, duration, level, category, price, rating)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, title, description, image_url || null, instructor, duration, level, category, price || 0, rating || 0]
        );
        const [rows] = await pool.query('SELECT * FROM courses WHERE id = ?', [id]);
        return res.status(201).json({ data: rows[0], error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

// PUT /courses/:id — admin only
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const fields = ['title', 'description', 'image_url', 'instructor', 'duration', 'level', 'category', 'price', 'rating', 'enrolled_count'];
        const updates = [];
        const values = [];
        for (const f of fields) {
            if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
        }
        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
        values.push(req.params.id);
        await pool.query(`UPDATE courses SET ${updates.join(', ')} WHERE id = ?`, values);
        const [rows] = await pool.query('SELECT * FROM courses WHERE id = ?', [req.params.id]);
        return res.json({ data: rows[0], error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

// DELETE /courses/:id — admin only
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM courses WHERE id = ?', [req.params.id]);
        return res.json({ data: null, error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

module.exports = router;
