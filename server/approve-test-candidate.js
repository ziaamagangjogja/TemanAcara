const mysql = require('mysql2/promise');

async function approve() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'rentmate'
  });

  await pool.query(
    "UPDATE profiles SET status = 'approved', price = 320000, pricing_tier = 'tier2' WHERE email = 'calonmitra@rentmate.test'"
  );
  console.log('Candidate calonmitra@rentmate.test approved by admin with price 320000!');
  process.exit(0);
}

approve();
