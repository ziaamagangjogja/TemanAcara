const mysql = require('mysql2/promise');
require('dotenv').config({path: './.env'});

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rentmate'
  });
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS topup_requests (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36),
      user_name VARCHAR(255),
      user_email VARCHAR(255),
      amount DECIMAL(10,2),
      proof_image LONGTEXT,
      status VARCHAR(50) DEFAULT 'pending',
      admin_note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      processed_at TIMESTAMP NULL
    );
  `);
  
  console.log('Table created!');
  process.exit(0);
}

run().catch(console.error);
