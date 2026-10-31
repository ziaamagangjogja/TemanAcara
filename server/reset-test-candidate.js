const mysql = require('mysql2/promise');

async function reset() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'rentmate'
  });

  await pool.query(
    "UPDATE profiles SET status = 'pending', price = 0, price_accepted = 0 WHERE email = 'calonmitra@rentmate.test'"
  );
  console.log('Candidate calonmitra@rentmate.test reset to pending!');
  process.exit(0);
}

reset();
