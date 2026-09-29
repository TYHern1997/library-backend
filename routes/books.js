const express = require('express');
const router = express.Router();
const pool = require('../db');

const validateBook = (b) => {
    const errors = [];
    if (!b.title?.trim()) errors.push('Title is required');
    if (!b.author?.trim()) errors.push('Author is required');
    const year = Number(b.year);
    if (!Number.isInteger(year)) errors.push('Year must be a number');
    else if (year < 1 || year > new Date().getFullYear()) errors.push('Year is out of range');
    return errors;
};

router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        const result = search
            ? await pool.query(
                `SELECT * FROM books
           WHERE title ILIKE $1 OR author ILIKE $1 OR category ILIKE $1
              OR CAST(id AS TEXT) = $2
           ORDER BY id`,
                [`%${search}%`, search]
            )
            : await pool.query('SELECT * FROM books ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


// POST /books
router.post('/', async (req, res) => {
    const errors = validateBook(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });

    try {
        const { title, author, category, year } = req.body;
        const result = await pool.query(
            `INSERT INTO books (title, author, category, year)
       VALUES ($1, $2, $3, $4) RETURNING *`,
            [title.trim(), author.trim(), category || null, year]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /books/:id
router.put('/:id', async (req, res) => {
    const errors = validateBook(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });

    try {
        const { title, author, category, year, status } = req.body;
        const result = await pool.query(
            `UPDATE books
       SET title=$1, author=$2, category=$3, year=$4, status=COALESCE($5, status)
       WHERE id=$6 RETURNING *`,
            [title.trim(), author.trim(), category || null, year, status, req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Book not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


// DELETE /books/:id
router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM books WHERE id=$1 RETURNING id', [req.params.id]);
        if (!result.rows.length) return res.status(404).json({ error: 'Book not found' });
        res.json({ message: 'Book deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;