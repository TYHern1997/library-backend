const express = require('express');
const pool = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// POST /borrows/:bookId — borrow a book
router.post('/:bookId', verifyToken, async (req, res) => {
    try {
        const bookId = req.params.bookId;
        const book = await pool.query('SELECT status FROM books WHERE id=$1', [bookId]);
        if (!book.rows.length) return res.status(404).json({ error: 'Book not found' });
        if (book.rows[0].status !== 'Available') {
            return res.status(400).json({ error: 'Book is not available' });
        }

        await pool.query(
            'INSERT INTO borrows (book_id, user_id) VALUES ($1, $2)',
            [bookId, req.user.id]
        );
        await pool.query("UPDATE books SET status='Not Available' WHERE id=$1", [bookId]);
        res.status(201).json({ message: 'Book borrowed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /borrows/:bookId/return — return a book
router.put('/:bookId/return', verifyToken, async (req, res) => {
    try {
        const bookId = req.params.bookId;
        const result = await pool.query(
            `UPDATE borrows SET returned_at = NOW()
       WHERE book_id=$1 AND returned_at IS NULL RETURNING *`,
            [bookId]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'No active borrow found' });

        await pool.query("UPDATE books SET status='Available' WHERE id=$1", [bookId]);
        res.json({ message: 'Book returned' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /borrows/:bookId (admin only) — who currently has this book
router.get('/:bookId', verifyToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.name, u.email, b.borrowed_at
       FROM borrows b JOIN users u ON b.user_id = u.id
       WHERE b.book_id=$1 AND b.returned_at IS NULL`,
            [req.params.bookId]
        );
        if (!result.rows.length) return res.json(null);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;