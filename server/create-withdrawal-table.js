const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/../.env' });

async function createWithdrawalTable() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rentmate'
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        user_email VARCHAR(255),
        user_photo LONGTEXT,
        role VARCHAR(20) DEFAULT 'user',
        amount DECIMAL(10,2) NOT NULL,
        bank_name VARCHAR(50) NOT NULL,
        account_number VARCHAR(100) NOT NULL,
        account_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        proof_image LONGTEXT NULL,
        admin_note TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP NULL,
        INDEX idx_withdrawals_user (user_id),
        INDEX idx_withdrawals_status (status)
      )
    `);
    console.log('withdrawal_requests table created or verified successfully!');
  } catch (err) {
    console.error('Error creating withdrawal_requests table:', err);
  } finally {
    await pool.end();
  }
}

createWithdrawalTable();
