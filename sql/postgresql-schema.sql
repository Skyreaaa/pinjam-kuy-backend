-- PostgreSQL Schema for Pinjam Kuy
DROP TABLE IF EXISTS loan_fine_payments CASCADE;
DROP TABLE IF EXISTS user_notifications CASCADE;
DROP TABLE IF EXISTS loan CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;
DROP TYPE IF EXISTS loan_status_type CASCADE;

CREATE TABLE "user" (
    id_user SERIAL PRIMARY KEY,
    fullname VARCHAR(255),
    username VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    nohp VARCHAR(20),
    role VARCHAR(50) DEFAULT 'user',
    denda_unpaid INTEGER DEFAULT 0,
    reset_token VARCHAR(255),
    reset_token_expiry BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE books (
    id_buku SERIAL PRIMARY KEY,
    isbn VARCHAR(50) UNIQUE,
    judul VARCHAR(255),
    pengarang VARCHAR(255),
    penerbit VARCHAR(255),
    tahunTerbit INTEGER,
    kategori VARCHAR(100),
    stok INTEGER DEFAULT 0,
    photo TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE loan_status_type AS ENUM ('pending', 'dipinjam', 'dikembalikan', 'ditolak');

CREATE TABLE loan (
    id_pinjam SERIAL PRIMARY KEY,
    id_user INTEGER REFERENCES "user"(id_user) ON DELETE CASCADE,
    id_buku INTEGER REFERENCES books(id_buku) ON DELETE CASCADE,
    tanggal_pinjam DATE,
    tanggal_kembali DATE,
    kodePinjam VARCHAR(50) UNIQUE,
    purpose TEXT,
    status loan_status_type DEFAULT 'pending',
    returnProofPhoto TEXT,
    returnProofUploadedAt TIMESTAMP,
    returnProofOriginalName VARCHAR(255),
    rejectionReason TEXT,
    rejectedBy INTEGER REFERENCES "user"(id_user),
    rejectedAt TIMESTAMP,
    fineDueDateExpiry INTEGER DEFAULT 0,
    fineForLostBook INTEGER DEFAULT 0,
    totalFine INTEGER DEFAULT 0,
    finePaymentStatus VARCHAR(20) DEFAULT 'unpaid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_fine_payment_status CHECK (finePaymentStatus IN ('unpaid', 'pending_approval', 'paid'))
);

CREATE TABLE user_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id_user) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_notif ON user_notifications(user_id, is_read);

CREATE TABLE loan_fine_payments (
    id SERIAL PRIMARY KEY,
    id_pinjam INTEGER NOT NULL REFERENCES loan(id_pinjam) ON DELETE CASCADE,
    amount_paid INTEGER NOT NULL,
    proof_photo TEXT,
    proof_original_name VARCHAR(255),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by INTEGER REFERENCES "user"(id_user),
    approved_at TIMESTAMP
);
