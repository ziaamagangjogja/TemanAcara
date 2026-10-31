const mysql = require('mysql2/promise');

async function migrate() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'rentmate'
  });

  try {
    console.log('Checking columns for profiles table...');
    const [cols] = await pool.query('DESCRIBE profiles');
    const existingCols = cols.map(c => c.Field);

    const colsToAdd = [
      { name: 'experience_level', def: 'VARCHAR(50) DEFAULT "menengah"' },
      { name: 'price_expectation', def: 'VARCHAR(100) DEFAULT "Rp 50.000 - Rp 85.000"' },
      { name: 'social_media', def: 'VARCHAR(255) DEFAULT ""' },
      { name: 'rejection_reason', def: 'TEXT NULL' },
      { name: 'pricing_tier', def: 'VARCHAR(50) DEFAULT "tier2"' },
      { name: 'price_accepted', def: 'TINYINT DEFAULT 0' },
      { name: 'appeal_note', def: 'TEXT NULL' }
    ];

    for (const col of colsToAdd) {
      if (!existingCols.includes(col.name)) {
        console.log(`Adding column ${col.name}...`);
        await pool.query(`ALTER TABLE profiles ADD COLUMN ${col.name} ${col.def}`);
      } else {
        console.log(`Column ${col.name} already exists.`);
      }
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
