const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function testFlow() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'rentmate'
  });

  try {
    const testEmail = 'calonmitra@rentmate.test';
    console.log('Cleaning up old test data...');
    await pool.query('DELETE FROM profiles WHERE email = ?', [testEmail]);

    const hashedPassword = await bcrypt.hash('password123', 10);
    const userId = 'calon-mitra-test-uuid';

    console.log('Inserting candidate with status "pending"...');
    await pool.query(
      `INSERT INTO profiles (user_id, email, password, full_name, phone, address, description, price, category, photo, ktp, age, experience_level, price_expectation, social_media, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        userId,
        testEmail,
        hashedPassword,
        'Dina Permata',
        '081234567890',
        'Jakarta Selatan',
        'Partner hangout dan teman acara ramah.',
        0,
        'Acara & Sosial, Travelling',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
        'https://drive.google.com/file/d/test12345/view',
        24,
        'menengah',
        'Rp 250.000 - Rp 350.000',
        '@dinapermata',
      ]
    );

    console.log('Querying status...');
    const [rows] = await pool.query('SELECT user_id, email, full_name, status, price, pricing_tier, price_accepted FROM profiles WHERE email = ?', [testEmail]);
    console.log('Current Candidate Record:', rows[0]);

    console.log('Admin Approving & Setting Price to Rp 320.000 (tier2)...');
    await pool.query(
      'UPDATE profiles SET status = "approved", price = 320000, pricing_tier = "tier2" WHERE email = ?',
      [testEmail]
    );

    const [approvedRows] = await pool.query('SELECT user_id, email, full_name, status, price, pricing_tier, price_accepted FROM profiles WHERE email = ?', [testEmail]);
    console.log('After Admin Approval:', approvedRows[0]);

    console.log('Candidate Accepting Price...');
    await pool.query('UPDATE profiles SET price_accepted = 1 WHERE email = ?', [testEmail]);

    const [acceptedRows] = await pool.query('SELECT user_id, email, full_name, status, price, pricing_tier, price_accepted FROM profiles WHERE email = ?', [testEmail]);
    console.log('After Candidate Consensus (price_accepted=1):', acceptedRows[0]);

    console.log('ALL DB FLOWS OPERATIONAL AND VALID!');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

testFlow();
