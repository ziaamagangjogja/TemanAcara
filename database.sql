CREATE DATABASE IF NOT EXISTS rentmate;
USE rentmate;

CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255),
    username VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    password VARCHAR(255),
    bio TEXT,
    city VARCHAR(255),
    hobbies TEXT,
    preference ENUM('online', 'offline', 'both') DEFAULT 'both',
    photo LONGTEXT,
    wallet DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE profiles (
    user_id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    full_name VARCHAR(255),
    phone VARCHAR(50),
    address VARCHAR(255),
    description TEXT,
    price DECIMAL(10,2) DEFAULT 0,
    category VARCHAR(100),
    photo LONGTEXT,
    ktp LONGTEXT,
    age INT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Note: bookingStore.ts references `mitra_accounts`.
-- It seems `profiles` and `mitra_accounts` might be conceptually the same thing.
-- I'll create `mitra_accounts` as a table just in case they used two tables.
CREATE TABLE mitra_accounts (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255),
    photo LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookings (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    user_name VARCHAR(255),
    talent_id VARCHAR(36),
    purpose VARCHAR(255),
    type VARCHAR(50),
    date DATE,
    time TIME,
    duration INT DEFAULT 1,
    total DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    payment_status VARCHAR(50) DEFAULT 'pending',
    approval_status VARCHAR(50) DEFAULT 'pending_approval',
    payment_method VARCHAR(50),
    payment_code VARCHAR(100),
    payment_proof LONGTEXT,
    transfer_amount DECIMAL(10,2),
    transfer_time VARCHAR(100),
    payment_split JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rating DECIMAL(2,1),
    rating_comment TEXT
);

CREATE TABLE chats (
    id VARCHAR(36) PRIMARY KEY,
    booking_id VARCHAR(36),
    user_id VARCHAR(36),
    talent_id VARCHAR(36),
    last_message TEXT,
    last_message_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id VARCHAR(36) PRIMARY KEY,
    chat_id VARCHAR(36),
    sender_id VARCHAR(36),
    sender_type VARCHAR(50),
    message TEXT,
    status VARCHAR(50) DEFAULT 'sent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
