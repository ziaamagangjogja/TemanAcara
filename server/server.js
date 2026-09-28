require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();

// Initialize MySQL pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rentmate',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Email transporter
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// =================================================================
// HEALTH CHECK
// =================================================================
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Server is running with MySQL' });
});

// =================================================================
// AUTH & PROFILES
// =================================================================
// Admin credentials stay on the backend and are never bundled into the browser.
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body || {};
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return res.status(503).json({ message: 'Login admin belum dikonfigurasi di server.' });
  }

  if (email !== adminEmail || password !== adminPassword) {
    return res.status(401).json({ message: 'Email atau password admin salah.' });
  }

  return res.status(200).json({ message: 'Login admin berhasil' });
});

app.post('/register-talent', async (req, res) => {
  const { email, password, name, phone, address, description, price, category, photo, ktp, age } = req.body;
  
  try {
    const userId = crypto.randomUUID();
    
    // Check if email exists
    const [existing] = await pool.query('SELECT email FROM profiles WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email sudah terdaftar.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO profiles (user_id, email, password, full_name, phone, address, description, price, category, photo, ktp, age, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, email, hashedPassword, name, phone, address, description, price, category, photo, ktp, age]
    );

    res.status(201).json({ message: 'Pendaftaran berhasil! Silakan tunggu persetujuan dari admin.' });
  } catch (error) {
    console.error('Error during talent registration:', error);
    res.status(500).json({ message: 'Pendaftaran gagal.', error: error.message });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM profiles WHERE email = ?', [email]);
    
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Email atau password salah.' });
    }
    
    const user = rows[0];
    
    let isMatch = false;
    if (user.password && user.password.startsWith('$2')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = password === user.password;
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Email atau password salah.' });
    }
    
    if (user.status !== 'approved') {
      return res.status(403).json({ message: 'Akun Anda belum disetujui oleh admin.' });
    }
    
    // Hapus password sebelum dikirim ke client (keamanan)
    const { password: _pw, ktp: _ktp, ...safeUser } = user;
    res.status(200).json({ message: 'Login berhasil', user: { id: user.user_id, ...safeUser }, session: { access_token: 'dummy-token' } });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat login.', error: error.message });
  }
});

app.get('/pending-talents', async (req, res) => {
  try {
    // Jangan kembalikan password/ktp ke frontend
    const [rows] = await pool.query(
      'SELECT user_id, email, full_name, phone, address, description, price, category, photo, age, status, created_at FROM profiles WHERE status = "pending"'
    );
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data talent.', error: error.message });
  }
});

// Endpoint reminder untuk mitra yang belum melengkapi verifikasi
app.post('/send-reminder', async (req, res) => {
  const { talentEmail, talentName, message } = req.body;
  try {
    // Log reminder (email bisa ditambahkan jika SMTP dikonfigurasi)
    console.log(`[REMINDER] Kirim ke ${talentEmail} (${talentName}): ${message || 'Harap segera lengkapi verifikasi Anda.'}`);
    // Coba kirim email jika konfigurasi tersedia
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
      try {
        const transporter = createEmailTransporter();
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: talentEmail,
          subject: 'Pengingat Verifikasi - RentMate',
          html: `<p>Halo <strong>${talentName}</strong>,</p><p>${message || 'Harap segera lengkapi proses verifikasi akun Anda di RentMate.'}</p><p>Terima kasih,<br>Tim RentMate</p>`
        });
      } catch (mailErr) {
        console.warn('Email reminder gagal dikirim:', mailErr.message);
      }
    }
    res.status(200).json({ message: 'Reminder berhasil dikirim.' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengirim reminder.', error: error.message });
  }
});

app.post('/send-approval', async (req, res) => {
  const { talentEmail, talentName, loginLink, price } = req.body;
  try {
    if (price !== undefined && price !== null && price !== '') {
      await pool.query('UPDATE profiles SET status = "approved", price = ? WHERE email = ?', [price, talentEmail]);
    } else {
      await pool.query('UPDATE profiles SET status = "approved" WHERE email = ?', [talentEmail]);
    }
    res.status(200).json({ message: 'Talent berhasil disetujui dan status telah diperbarui.' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menyetujui talent.', error: error.message });
  }
});

// =================================================================
// NEW API ENDPOINTS FOR FRONTEND STORES
// =================================================================

// Upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(200).json({ url: fileUrl });
});

// Users
app.get('/api/users-count', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM users');
    res.status(200).json({ count: rows[0].count });
  } catch (error) {
    res.status(500).json({ error: error.message, count: 0 });
  }
});

app.get('/api/users/by-email/:email', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [req.params.email]);
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, username, email, phone, password, bio, city, hobbies, preference, photo, wallet } = req.body;
    const userId = crypto.randomUUID();
    const hashedPassword = password ? await bcrypt.hash(password, 10) : '';
    await pool.query(
      `INSERT INTO users (id, name, username, email, phone, password, bio, city, hobbies, preference, photo, wallet)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, username, email, phone, hashedPassword, bio, city, hobbies, preference, photo, wallet || 0]
    );
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/id/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:username', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [req.params.username]);
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:username', async (req, res) => {
  try {
    // Partial update: hanya field yang benar-benar dikirim (defined) yang diubah.
    // Ini mencegah field yang tidak dikirim (mis. email/password) tertimpa
    // menjadi NULL — bug lama yang membuat email user hilang setelah edit profil.
    const allowedFields = ['name', 'email', 'phone', 'password', 'bio', 'city', 'hobbies', 'preference', 'photo', 'wallet'];
    const updateFields = [];
    const updateValues = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        let val = req.body[field];
        if (field === 'password' && val) {
          val = await bcrypt.hash(val, 10);
        }
        updateValues.push(val);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'Tidak ada field yang dikirim untuk diubah.' });
    }

    updateValues.push(req.params.username);
    const [result] = await pool.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE username = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }

    res.status(200).json({ message: 'User updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Talents — JANGAN kembalikan password/ktp ke frontend!
app.get('/api/talents', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT user_id, email, full_name, phone, address, description, price, category, photo, age, status, created_at FROM profiles WHERE status = "approved"'
    );
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/talents/:id', async (req, res) => {
  try {
    // Partial update: hanya field yang benar-benar dikirim (defined) yang diubah.
    // Ini mencegah field yang tidak dikirim tertimpa menjadi kosong.
    const allowedFields = ['full_name', 'photo', 'address', 'category', 'description', 'price', 'age', 'phone'];
    const updateFields = [];
    const updateValues = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(req.body[field]);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'Tidak ada field yang dikirim untuk diubah.' });
    }

    updateValues.push(req.params.id);
    const [result] = await pool.query(
      `UPDATE profiles SET ${updateFields.join(', ')} WHERE user_id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Talent tidak ditemukan.' });
    }

    res.status(200).json({ message: 'Talent updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update harga talent saja (dipakai admin untuk koreksi harga)
app.patch('/api/talents/:id/price', async (req, res) => {
  try {
    const { price } = req.body;
    if (price === undefined || price === null || isNaN(Number(price))) {
      return res.status(400).json({ message: 'Harga tidak valid.' });
    }
    const [result] = await pool.query(
      'UPDATE profiles SET price = ? WHERE user_id = ?',
      [Number(price), req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Talent tidak ditemukan.' });
    }
    res.status(200).json({ message: 'Harga talent berhasil diperbarui.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
    // Normalize date fields to clean YYYY-MM-DD strings
    const cleaned = rows.map(row => {
      if (row.date) {
        const d = new Date(row.date);
        if (!isNaN(d.getTime())) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          row.date = `${yyyy}-${mm}-${dd}`;
        }
      }
      return row;
    });
    res.status(200).json(cleaned);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const { id, user_id, user_name, talent_id, purpose, type, date, time, duration, total, payment_status, approval_status, payment_code, created_at, notes } = req.body;
    const bookingId = id || crypto.randomUUID();
    await pool.query(
      `INSERT INTO bookings (id, user_id, user_name, talent_id, purpose, type, date, time, duration, total, payment_status, approval_status, payment_code, created_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [bookingId, user_id, user_name, talent_id, purpose, type, date, time, duration, total, payment_status, approval_status, payment_code, created_at || new Date(), notes || ""]
    );
    const [rows] = await pool.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/bookings/:id', async (req, res) => {
  try {
    const allowedFields = [
      'payment_method', 'payment_code', 'payment_proof', 'transfer_amount',
      'transfer_time', 'payment_status', 'approval_status', 'rating',
      'rating_comment', 'notes'
    ];
    const updateFields = [];
    const updateValues = [];

    for (const [key, value] of Object.entries(req.body)) {
      const dbKey = key === 'admin_message' ? 'notes' : key;
      if (!allowedFields.includes(dbKey)) continue;
      updateFields.push(`${dbKey} = ?`);
      updateValues.push(value);
    }
    
    if (updateFields.length > 0) {
      updateValues.push(req.params.id);
      await pool.query(`UPDATE bookings SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);
    }
    
    res.status(200).json({ message: 'Booking updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/bookings/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM bookings WHERE id = ?', [req.params.id]);
    res.status(200).json({ message: 'Booking deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chats
app.get('/api/chats', async (req, res) => {
  try {
    const [chats] = await pool.query('SELECT * FROM chats');
    const [messages] = await pool.query('SELECT * FROM messages ORDER BY created_at ASC');
    res.status(200).json({ chats, messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chats', async (req, res) => {
  try {
    const { booking_id, user_id, talent_id, last_message, last_message_time } = req.body;
    let [chats] = await pool.query('SELECT id FROM chats WHERE booking_id = ?', [booking_id]);
    
    let chatId;
    if (chats.length === 0) {
      chatId = crypto.randomUUID();
      await pool.query(
        `INSERT INTO chats (id, booking_id, user_id, talent_id, last_message, last_message_time) VALUES (?, ?, ?, ?, ?, ?)`,
        [chatId, booking_id, user_id, talent_id, last_message, last_message_time]
      );
    } else {
      chatId = chats[0].id;
      await pool.query(
        `UPDATE chats SET last_message = ?, last_message_time = ? WHERE id = ?`,
        [last_message, last_message_time, chatId]
      );
    }
    res.status(200).json({ id: chatId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { id, chat_id, sender_id, sender_type, message, status, created_at } = req.body;
    await pool.query(
      `INSERT INTO messages (id, chat_id, sender_id, sender_type, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, chat_id, sender_id, sender_type, message, status, created_at]
    );
    res.status(201).json({ message: 'Message created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});