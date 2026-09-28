const mysql = require('mysql2/promise');

async function checkDb() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'rentmate'
  });

  try {
    const [users] = await pool.query('SELECT username, email, password FROM users');
    console.log("Users in DB:", users.length > 0 ? users : "Empty");
    const [profiles] = await pool.query('SELECT email, password FROM profiles');
    console.log("Profiles in DB:", profiles.length > 0 ? profiles : "Empty");
    process.exit(0);
  } catch(e) {
    console.error("DB error:", e);
    process.exit(1);
  }
}

checkDb();
