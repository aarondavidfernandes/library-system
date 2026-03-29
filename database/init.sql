-- IIT Jodhpur Library Management System - Database Schema
-- File: database/init.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables
DROP TABLE IF EXISTS issued_books CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'admin')),
    roll_number VARCHAR(50),
    department VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Books table
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    isbn VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    author VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    publisher VARCHAR(255),
    publication_year INTEGER,
    total_copies INTEGER NOT NULL DEFAULT 1,
    available_copies INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_copies CHECK (available_copies >= 0 AND available_copies <= total_copies)
);

-- Issued books table
CREATE TABLE issued_books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    return_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'returned', 'overdue')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_category ON books(category);
CREATE INDEX idx_issued_books_user_id ON issued_books(user_id);
CREATE INDEX idx_issued_books_book_id ON issued_books(book_id);
CREATE INDEX idx_issued_books_status ON issued_books(status);

-- Insert admin user (password will be set by setup-passwords.js)
INSERT INTO users (email, password, name, role) VALUES
('admin@iitj.ac.in', 'TEMP', 'Library Admin', 'admin');

-- Insert student users (passwords will be set by setup-passwords.js)
INSERT INTO users (email, password, name, role, roll_number, department) VALUES
('student@iitj.ac.in', 'TEMP', 'Raj Kumar', 'student', 'B21CS001', 'Computer Science'),
('priya.sharma@iitj.ac.in', 'TEMP', 'Priya Sharma', 'student', 'B21EE015', 'Electrical Engineering'),
('amit.patel@iitj.ac.in', 'TEMP', 'Amit Patel', 'student', 'B21ME042', 'Mechanical Engineering');

-- Insert sample books
INSERT INTO books (isbn, title, author, category, publisher, publication_year, total_copies, available_copies) VALUES
('978-0132350884', 'Clean Code', 'Robert C. Martin', 'Computer Science', 'Prentice Hall', 2008, 5, 5),
('978-0201633610', 'Design Patterns', 'Gang of Four', 'Computer Science', 'Addison-Wesley', 1994, 3, 3),
('978-0262033848', 'Introduction to Algorithms', 'Thomas H. Cormen', 'Computer Science', 'MIT Press', 2009, 10, 10),
('978-0134685991', 'Effective Java', 'Joshua Bloch', 'Computer Science', 'Addison-Wesley', 2017, 4, 4),
('978-1449355739', 'Designing Data-Intensive Applications', 'Martin Kleppmann', 'Computer Science', 'O Reilly', 2017, 6, 6),
('978-0070702080', 'Advanced Engineering Mathematics', 'Erwin Kreyszig', 'Mathematics', 'Wiley', 2011, 8, 8),
('978-0521558259', 'Linear Algebra Done Right', 'Sheldon Axler', 'Mathematics', 'Springer', 2015, 5, 5),
('978-0486458649', 'Introduction to Topology', 'Bert Mendelson', 'Mathematics', 'Dover', 1990, 3, 3),
('978-0201896831', 'The Feynman Lectures on Physics', 'Richard P. Feynman', 'Physics', 'Addison-Wesley', 2011, 7, 7),
('978-8126556014', 'Concepts of Physics Vol 1', 'H.C. Verma', 'Physics', 'Bharati Bhawan', 2010, 10, 9),
('978-8126556021', 'Concepts of Physics Vol 2', 'H.C. Verma', 'Physics', 'Bharati Bhawan', 2010, 10, 10),
('978-0553380163', 'A Brief History of Time', 'Stephen Hawking', 'Science', 'Bantam', 1998, 4, 4),
('978-0143442295', 'The Alchemist', 'Paulo Coelho', 'Fiction', 'HarperCollins', 2014, 5, 5);

-- Insert one issued book for demo
DO $$
DECLARE
    student_id UUID;
    book_id UUID;
BEGIN
    SELECT id INTO student_id FROM users WHERE email = 'student@iitj.ac.in';
    SELECT id INTO book_id FROM books WHERE isbn = '978-8126556014';
    
    IF student_id IS NOT NULL AND book_id IS NOT NULL THEN
        INSERT INTO issued_books (book_id, user_id, issue_date, due_date, status) VALUES
        (book_id, student_id, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '9 days', 'issued');
    END IF;
END $$;

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating timestamps
CREATE TRIGGER users_timestamp 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER books_timestamp 
    BEFORE UPDATE ON books 
    FOR EACH ROW 
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER issued_books_timestamp 
    BEFORE UPDATE ON issued_books 
    FOR EACH ROW 
    EXECUTE FUNCTION update_timestamp();

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO library_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO library_admin;