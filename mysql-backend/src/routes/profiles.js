const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /profiles/:id — get profile (own only or admin could extend)
router.get('/:id', requireAuth, async (req, res) => {
    try {
        // Allow users to only get their own profile
        if (req.user.id !== req.params.id && req.user.role !== 'admin') {
            return res.status(403).json({ data: null, error: 'Forbidden' });
        }
        const [rows] = await pool.query('SELECT * FROM profiles WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ data: null, error: 'Not found' });
        return res.json({ data: rows[0], error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

// PUT /profiles/:id — update own profile
router.put('/:id', requireAuth, async (req, res) => {
    try {
        if (req.user.id !== req.params.id && req.user.role !== 'admin') {
            return res.status(403).json({ data: null, error: 'Forbidden' });
        }
        const allowed = ['name', 'first_name', 'last_name', 'gender', 'designation', 'phone_number', 'prefix'];
        const updates = []; const values = [];
        for (const f of allowed) {
            if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
        }
        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
        values.push(req.params.id);
        await pool.query(`UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`, values);
        const [rows] = await pool.query('SELECT * FROM profiles WHERE id = ?', [req.params.id]);
        return res.json({ data: rows[0], error: null });
    } catch (err) {
        return res.status(500).json({ data: null, error: err.message });
    }
});

module.exports = router;
