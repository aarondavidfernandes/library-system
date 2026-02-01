// Backend API Server - Main Server File
// Handles all book operations, borrowing, returns, and management
// CORS was initially a headache but working now

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Database connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// Middleware setup
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// JWT verification middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-server' });
});

// Get all books
app.get('/api/books', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, author, isbn, category, 
             total_copies, available_copies, created_at
      FROM books
      ORDER BY title
    `);

    res.json({ books: result.rows });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ message: 'Failed to fetch books' });
  }
});

// Search books - verifyinf the query works properly
app.get('/api/books/search', verifyToken, async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ message: 'Search query required' });
  }

  try {
    const result = await pool.query(`
      SELECT id, title, author, isbn, category, 
             total_copies, available_copies, created_at
      FROM books
      WHERE title ILIKE $1 OR author ILIKE $1 OR isbn ILIKE $1
      ORDER BY title
    `, [`%${q}%`]);

    res.json({ books: result.rows });
  } catch (error) {
    console.error('Error searching books:', error);
    res.status(500).json({ message: 'Search failed' });
  }
});

// Get book by ID
app.get('/api/books/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT id, title, author, isbn, category, 
             total_copies, available_copies, created_at
      FROM books
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json({ book: result.rows[0] });
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({ message: 'Failed to fetch book' });
  }
});

// Add new book (librarian only)
app.post('/api/books', verifyToken, async (req, res) => {
  if (req.user.role !== 'librarian') {
    return res.status(403).json({ message: 'Access denied' });
  }

  const { title, author, isbn, category, total_copies } = req.body;

  if (!title || !author || !isbn || !category || !total_copies) {
    return res.status(400).json({ message: 'All fields required' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO books (title, author, isbn, category, total_copies, available_copies)
      VALUES ($1, $2, $3, $4, $5, $5)
      RETURNING id, title, author, isbn, category, total_copies, available_copies
    `, [title, author, isbn, category, total_copies]);

    res.status(201).json({
      message: 'Book added successfully',
      book: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding book:', error);
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Book with this ISBN already exists' });
    }
    res.status(500).json({ message: 'Failed to add book' });
  }
});

// Update book (librarian only)
app.put('/api/books/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'librarian') {
    return res.status(403).json({ message: 'Access denied' });
  }

  const { id } = req.params;
  const { title, author, isbn, category, total_copies } = req.body;

  try {
    const result = await pool.query(`
      UPDATE books
      SET title = COALESCE($1, title),
          author = COALESCE($2, author),
          isbn = COALESCE($3, isbn),
          category = COALESCE($4, category),
          total_copies = COALESCE($5, total_copies)
      WHERE id = $6
      RETURNING id, title, author, isbn, category, total_copies, available_copies
    `, [title, author, isbn, category, total_copies, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json({
      message: 'Book updated successfully',
      book: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ message: 'Failed to update book' });
  }
});

// Delete book (librarian only)
app.delete('/api/books/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'librarian') {
    return res.status(403).json({ message: 'Access denied' });
  }

  const { id } = req.params;

  try {
    // Check if book has active borrowings
    const borrowCheck = await pool.query(`
      SELECT COUNT(*) as count
      FROM borrowings
      WHERE book_id = $1 AND return_date IS NULL
    `, [id]);

    if (parseInt(borrowCheck.rows[0].count) > 0) {
      return res.status(400).json({
        message: 'Cannot delete book with active borrowings'
      });
    }

    const result = await pool.query(`
      DELETE FROM books WHERE id = $1 RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ message: 'Failed to delete book' });
  }
});

// Borrow book - BORROWING of BOOks endpoint
// Borrow book - BORROWING of BOOks endpoint
app.post('/api/books/:id/borrow', verifyToken, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id; // Get from token, not body

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check book availability
    const bookCheck = await client.query(`
      SELECT available_copies FROM books WHERE id = $1 FOR UPDATE
    `, [id]);

    if (bookCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Book not found' });
    }

    if (bookCheck.rows[0].available_copies <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Book not available' });
    }

    // Check if user already borrowed this book
    const alreadyBorrowed = await client.query(`
      SELECT id FROM issued_books
      WHERE user_id = $1 AND book_id = $2 AND return_date IS NULL
    `, [user_id, id]);

    if (alreadyBorrowed.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'You already borrowed this book' });
    }

    // Create borrowing record
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14); // 14 days loan period

    await client.query(`
      INSERT INTO issued_books (user_id, book_id, due_date, status)
      VALUES ($1, $2, $3, 'issued')
    `, [user_id, id, dueDate]);

    // Update available copies
    await client.query(`
      UPDATE books
      SET available_copies = available_copies - 1
      WHERE id = $1
    `, [id]);

    await client.query('COMMIT');

    res.json({
      message: 'Book borrowed successfully',
      due_date: dueDate
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error borrowing book:', error);
    res.status(500).json({ message: 'Failed to borrow book' });
  } finally {
    client.release();
  }
});


// Return book
app.post('/api/books/:id/return', verifyToken, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id; // Getting from token, not body

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Finding active borrowing
    const borrowing = await client.query(`
      SELECT id FROM issued_books
      WHERE user_id = $1 AND book_id = $2 AND return_date IS NULL
      FOR UPDATE
    `, [user_id, id]);

    if (borrowing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'No active borrowing found' });
    }

    // Updating borrowing record
    await client.query(`
      UPDATE issued_books
      SET return_date = NOW(), status = 'returned'
      WHERE id = $1
    `, [borrowing.rows[0].id]);

    // Updating of available copies
    await client.query(`
      UPDATE books
      SET available_copies = available_copies + 1
      WHERE id = $1
    `, [id]);

    await client.query('COMMIT');

    res.json({ message: 'Book returned successfully' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error returning book:', error);
    res.status(500).json({ message: 'Failed to return book' });
  } finally {
    client.release();
  }
});


// Get borrowed books for a user
app.get('/api/books/borrowed/:userId', verifyToken, async (req, res) => {
  const { userId } = req.params;

  // Verify user can only see their own borrowed books (unless librarian)
  if (req.user.role !== 'librarian' && req.user.id !== userId) {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const result = await pool.query(`
      SELECT b.id as borrowing_id, bk.id as book_id, bk.title, bk.author,
             bk.isbn, b.issue_date as borrowed_date, b.due_date, b.return_date
      FROM issued_books b
      JOIN books bk ON b.book_id = bk.id
      WHERE b.user_id = $1 AND b.return_date IS NULL
      ORDER BY b.issue_date DESC
    `, [userId]);

    res.json({ borrowed: result.rows });
  } catch (error) {
    console.error('Error fetching borrowed books:', error);
    res.status(500).json({ message: 'Failed to fetch borrowed books' });
  }
});


// Get all borrowings (librarian only)
app.get('/api/borrowings', verifyToken, async (req, res) => {
  if (req.user.role !== 'librarian') {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const result = await pool.query(`
      SELECT b.id, b.borrowed_date, b.due_date, b.return_date,
             bk.title as book_title, bk.author,
             u.name as user_name, u.email as user_email
      FROM borrowings b
      JOIN books bk ON b.book_id = bk.id
      JOIN users u ON b.user_id = u.id
      ORDER BY b.borrowed_date DESC
    `);

    res.json({ borrowings: result.rows });
  } catch (error) {
    console.error('Error fetching borrowings:', error);
    res.status(500).json({ message: 'Failed to fetch borrowings' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});
