import mysql from 'mysql2/promise';
import { talents } from './src/data/mockData';
import * as dotenv from 'dotenv';

dotenv.config();

async function seed() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rentmate',
  });

  console.log('Connecting to DB to insert talents...');

  for (const t of talents) {
    try {
      const category = t.skills.join(', ');
      
      const [existing] = await pool.query('SELECT email FROM profiles WHERE email = ?', [t.email]);
      if ((existing as any[]).length > 0) {
        console.log(`Email ${t.email} already exists, skipping...`);
        continue;
      }

      await pool.query(
        `INSERT INTO profiles (user_id, email, password, full_name, phone, address, description, price, category, photo, ktp, age, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
        [t.id, t.email, t.password, t.name, '081234567890', t.city, t.bio, t.pricePerHour, category, t.photo, '', t.age]
      );
      console.log(`Inserted ${t.name}`);
    } catch (err) {
      console.error(`Error inserting ${t.name}:`, err);
    }
  }
  
  console.log('Seeding complete.');
  process.exit(0);
}

seed();
