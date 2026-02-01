// Frontend React Application - Main App Component
// IIT Jodhpur Library Management System
// Built using React 18 with hooks

import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const AUTH_URL = process.env.REACT_APP_AUTH_URL || 'http://localhost:5001';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Login form state
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  // Books state
  const [books, setBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);

  // Borrowed books state
  const [borrowedBooks, setBorrowedBooks] = useState([]);

  // New book form (for librarians)
  const [newBook, setNewBook] = useState({
    title: '', author: '', isbn: '', category: '', total_copies: 1
  });

  // Check existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
      setView('dashboard');
    }
  }, []);

  // API helper with auth
  const apiCall = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    };
    
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }
    
    return data;
  };

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await apiCall(`${AUTH_URL}/api/auth/login`, {
        method: 'POST',
        body: JSON.stringify(loginData)
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setView('dashboard');
      setMessage('Login successful!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setView('login');
    setBooks([]);
    setBorrowedBooks([]);
    setMessage('Logged out successfully');
  };

  // Fetch all books
  const fetchBooks = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiCall(`${API_URL}/api/books`);
      setBooks(data.books || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Search books
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      fetchBooks();
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await apiCall(`${API_URL}/api/books/search?q=${encodeURIComponent(searchTerm)}`);
      setBooks(data.books || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Borrow book
  const handleBorrow = async (bookId) => {
    setLoading(true);
    setError('');
    try {
      await apiCall(`${API_URL}/api/books/${bookId}/borrow`, {
        method: 'POST',
        body: JSON.stringify({ user_id: user.id })
      });
      setMessage('Book borrowed successfully!');
      fetchBooks();
      if (view === 'mybooks') fetchBorrowedBooks();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Return book
  const handleReturn = async (bookId) => {
    setLoading(true);
    setError('');
    try {
      await apiCall(`${API_URL}/api/books/${bookId}/return`, {
        method: 'POST',
        body: JSON.stringify({ user_id: user.id })
      });
      setMessage('Book returned successfully!');
      fetchBorrowedBooks();
      if (view === 'books') fetchBooks();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch borrowed books
  const fetchBorrowedBooks = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiCall(`${API_URL}/api/books/borrowed/${user.id}`);
      setBorrowedBooks(data.borrowed || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add new book (librarian only)
  const handleAddBook = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiCall(`${API_URL}/api/books`, {
        method: 'POST',
        body: JSON.stringify(newBook)
      });
      setMessage('Book added successfully!');
      setNewBook({ title: '', author: '', isbn: '', category: '', total_copies: 1 });
      fetchBooks();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete book (librarian only)
  const handleDeleteBook = async (bookId) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;

    setLoading(true);
    setError('');
    try {
      await apiCall(`${API_URL}/api/books/${bookId}`, {
        method: 'DELETE'
      });
      setMessage('Book deleted successfully!');
      fetchBooks();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load data when switching views
  useEffect(() => {
    if (!user) return;

    if (view === 'books') {
      fetchBooks();
    } else if (view === 'mybooks') {
      fetchBorrowedBooks();
    }
    // eslint-disable-next-line
  }, [view, user]);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Login page
  if (!user) {
    return (
      <div className="app-container">
        <div className="login-page">
          <div className="login-card">
            <div className="login-header">
              <h1>IIT Jodhpur</h1>
              <h2>Library Management System</h2>
            </div>

            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  placeholder="your.email@iitj.ac.in"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
              </div>

              {error && <div className="alert alert-error">{error}</div>}
              {message && <div className="alert alert-success">{message}</div>}

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div className="login-footer">
              <p>Demo Credentials:</p>
              <small>Student: student@iitj.ac.in / Student@123</small><br />
              <small>Librarian: librarian@iitj.ac.in / Librarian@123</small>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="app-container">
      {/* Navigation bar */}
      <nav className="navbar">
        <div className="nav-brand">
          <h2>IIT Jodhpur Library</h2>
        </div>
        <div className="nav-menu">
          <button 
            className={view === 'dashboard' ? 'nav-link active' : 'nav-link'}
            onClick={() => setView('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={view === 'books' ? 'nav-link active' : 'nav-link'}
            onClick={() => setView('books')}
          >
            Browse Books
          </button>
          <button 
            className={view === 'mybooks' ? 'nav-link active' : 'nav-link'}
            onClick={() => setView('mybooks')}
          >
            My Books
          </button>
          {user.role === 'librarian' && (
            <button 
              className={view === 'manage' ? 'nav-link active' : 'nav-link'}
              onClick={() => setView('manage')}
            >
              Manage Books
            </button>
          )}
        </div>
        <div className="nav-user">
          <span className="user-name">{user.name}</span>
          <span className="user-role badge">{user.role}</span>
          <button onClick={handleLogout} className="btn btn-secondary btn-sm">
            Logout
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="main-content">
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {/* Dashboard view */}
        {view === 'dashboard' && (
          <div className="dashboard">
            <h1>Welcome, {user.name}!</h1>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Books</h3>
                <p className="stat-number">{books.length || '---'}</p>
              </div>
              <div className="stat-card">
                <h3>My Borrowed</h3>
                <p className="stat-number">{borrowedBooks.length || '---'}</p>
              </div>
              <div className="stat-card">
                <h3>Account Type</h3>
                <p className="stat-label">{user.role}</p>
              </div>
            </div>

            <div className="quick-actions">
              <h2>Quick Actions</h2>
              <button onClick={() => setView('books')} className="btn btn-primary">
                Browse Library
              </button>
              <button onClick={() => setView('mybooks')} className="btn btn-secondary">
                View My Books
              </button>
            </div>
          </div>
        )}

        {/* Browse books view */}
        {view === 'books' && (
          <div className="books-section">
            <div className="section-header">
              <h1>Browse Books</h1>
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Search by title, author, or ISBN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button onClick={handleSearch} className="btn btn-primary">
                  Search
                </button>
                {searchTerm && (
                  <button onClick={() => { setSearchTerm(''); fetchBooks(); }} className="btn btn-secondary">
                    Clear
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="loading">Loading books...</div>
            ) : books.length === 0 ? (
              <div className="empty-state">
                <p>No books found</p>
              </div>
            ) : (
              <div className="books-grid">
                {books.map(book => (
                  <div key={book.id} className="book-card">
                    <div className="book-header">
                      <h3>{book.title}</h3>
                      <span className={`badge ${book.available_copies > 0 ? 'badge-success' : 'badge-danger'}`}>
                        {book.available_copies > 0 ? 'Available' : 'Not Available'}
                      </span>
                    </div>
                    <div className="book-details">
                      <p><strong>Author:</strong> {book.author}</p>
                      <p><strong>ISBN:</strong> {book.isbn}</p>
                      <p><strong>Category:</strong> {book.category}</p>
                      <p><strong>Copies:</strong> {book.available_copies} / {book.total_copies}</p>
                    </div>
                    <div className="book-actions">
                      <button 
                        onClick={() => setSelectedBook(book)}
                        className="btn btn-secondary btn-sm"
                      >
                        View Details
                      </button>
                      {book.available_copies > 0 && (
                        <button 
                          onClick={() => handleBorrow(book.id)}
                          className="btn btn-primary btn-sm"
                          disabled={loading}
                        >
                          Borrow
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My borrowed books view */}
        {view === 'mybooks' && (
          <div className="borrowed-section">
            <h1>My Borrowed Books</h1>
            
            {loading ? (
              <div className="loading">Loading your books...</div>
            ) : borrowedBooks.length === 0 ? (
              <div className="empty-state">
                <p>You haven't borrowed any books yet</p>
                <button onClick={() => setView('books')} className="btn btn-primary">
                  Browse Library
                </button>
              </div>
            ) : (
              <div className="borrowed-list">
                {borrowedBooks.map(item => (
                  <div key={item.id} className="borrowed-card">
                    <div className="borrowed-info">
                      <h3>{item.title}</h3>
                      <p><strong>Author:</strong> {item.author}</p>
                      <p><strong>ISBN:</strong> {item.isbn}</p>
                      <p><strong>Borrowed:</strong> {new Date(item.borrowed_date).toLocaleDateString()}</p>
                      {item.due_date && (
                        <p><strong>Due:</strong> {new Date(item.due_date).toLocaleDateString()}</p>
                      )}
                    </div>
                    <div className="borrowed-actions">
                      <button 
                        onClick={() => handleReturn(item.book_id)}
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        Return Book
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Manage books (librarian only) */}
        {view === 'manage' && user.role === 'librarian' && (
          <div className="manage-section">
            <h1>Manage Books</h1>

            <div className="manage-grid">
              {/* Add new book form */}
              <div className="manage-card">
                <h2>Add New Book</h2>
                <form onSubmit={handleAddBook} className="add-book-form">
                  <div className="form-group">
                    <label>Title</label>
                    <input
                      type="text"
                      value={newBook.title}
                      onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label>Author</label>
                    <input
                      type="text"
                      value={newBook.author}
                      onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label>ISBN</label>
                    <input
                      type="text"
                      value={newBook.isbn}
                      onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label>Category</label>
                    <input
                      type="text"
                      value={newBook.category}
                      onChange={(e) => setNewBook({ ...newBook, category: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label>Total Copies</label>
                    <input
                      type="number"
                      min="1"
                      value={newBook.total_copies}
                      onChange={(e) => setNewBook({ ...newBook, total_copies: parseInt(e.target.value) })}
                      required
                      disabled={loading}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                    Add Book
                  </button>
                </form>
              </div>

              {/* All books list */}
              <div className="manage-card">
                <h2>All Books</h2>
                <button onClick={fetchBooks} className="btn btn-secondary btn-sm mb-2">
                  Refresh List
                </button>

                {loading ? (
                  <div className="loading">Loading...</div>
                ) : (
                  <div className="books-list">
                    {books.map(book => (
                      <div key={book.id} className="book-item">
                        <div className="book-item-info">
                          <strong>{book.title}</strong>
                          <small>{book.author} - {book.isbn}</small>
                          <small>Copies: {book.available_copies}/{book.total_copies}</small>
                        </div>
                        <button 
                          onClick={() => handleDeleteBook(book.id)}
                          className="btn btn-danger btn-sm"
                          disabled={loading}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Book details modal */}
      {selectedBook && (
        <div className="modal-overlay" onClick={() => setSelectedBook(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedBook.title}</h2>
              <button onClick={() => setSelectedBook(null)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <p><strong>Author:</strong> {selectedBook.author}</p>
              <p><strong>ISBN:</strong> {selectedBook.isbn}</p>
              <p><strong>Category:</strong> {selectedBook.category}</p>
              <p><strong>Total Copies:</strong> {selectedBook.total_copies}</p>
              <p><strong>Available:</strong> {selectedBook.available_copies}</p>
            </div>
            <div className="modal-footer">
              {selectedBook.available_copies > 0 && (
                <button 
                  onClick={() => {
                    handleBorrow(selectedBook.id);
                    setSelectedBook(null);
                  }}
                  className="btn btn-primary"
                  disabled={loading}
                >
                  Borrow This Book
                </button>
              )}
              <button onClick={() => setSelectedBook(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
