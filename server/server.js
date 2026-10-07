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
    await expireOverduePendingBookings();
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

async function expireOverduePendingBookings() {
  const [overdueBookings] = await pool.query(`
    SELECT id, user_id, purpose, payment_status
    FROM bookings
    WHERE approval_status IN ('pending_approval', 'pending_mitra')
      AND date IS NOT NULL
      AND time IS NOT NULL
      AND DATE_ADD(TIMESTAMP(date, time), INTERVAL COALESCE(duration, 1) HOUR) <= NOW()
  `);

  for (const booking of overdueBookings) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query(`
        UPDATE bookings
        SET approval_status = 'expired',
            payment_status = CASE WHEN payment_status = 'paid' THEN 'refund_pending' ELSE payment_status END
        WHERE id = ?
          AND approval_status IN ('pending_approval', 'pending_mitra')
          AND DATE_ADD(TIMESTAMP(date, time), INTERVAL COALESCE(duration, 1) HOUR) <= NOW()
      `, [booking.id]);

      if (result.affectedRows === 0) {
        await connection.rollback();
        continue;
      }

      if (booking.user_id) {
        const refundMessage = booking.payment_status === 'paid'
          ? 'Pembayaran Anda tercatat. Pengembalian dana sedang menunggu penanganan Admin.'
          : 'Pesanan dibatalkan karena waktu jadwal sudah lewat sebelum mendapat persetujuan.';
        await connection.query(
          `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
           VALUES (?, ?, ?, ?, 'booking', 0, CURRENT_TIMESTAMP)`,
          [crypto.randomUUID(), booking.user_id, 'Pesanan Kedaluwarsa', refundMessage]
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error(`Gagal mengakhiri booking tertunda ${booking.id}:`, error.message);
    } finally {
      connection.release();
    }
  }
}

function startPendingBookingExpiryWorker() {
  void expireOverduePendingBookings().catch(error => {
    console.error('Gagal memeriksa booking kedaluwarsa:', error.message);
  });
  setInterval(() => {
    void expireOverduePendingBookings().catch(error => {
      console.error('Gagal memeriksa booking kedaluwarsa:', error.message);
    });
  }, 60 * 1000);
}

app.post('/api/bookings', async (req, res) => {
  try {
    const { id, user_id, user_name, talent_id, purpose, type, date, time, duration, total, meeting_city, payment_status, approval_status, payment_code, created_at, notes } = req.body;
    const bookingId = id || crypto.randomUUID();
    await pool.query(
      `INSERT INTO bookings (id, user_id, user_name, talent_id, purpose, type, date, time, duration, total, meeting_city, payment_status, approval_status, payment_code, created_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [bookingId, user_id, user_name, talent_id, purpose, type, date, time, duration, total, meeting_city || "", payment_status, approval_status, payment_code, created_at || new Date(), notes || ""]
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
      'rating_comment', 'meeting_city', 'notes'
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
      const completingBooking = req.body.approval_status === 'completed';
      updateValues.push(req.params.id);
      const whereClause = completingBooking
        ? ' WHERE id = ? AND approval_status = ?'
        : ' WHERE id = ?';
      if (completingBooking) updateValues.push('approved');
      const [result] = await pool.query(
        `UPDATE bookings SET ${updateFields.join(', ')}${whereClause}`,
        updateValues
      );
      return res.status(200).json({
        message: 'Booking updated',
        changed: !completingBooking || result.affectedRows > 0,
      });
    }
    
    res.status(200).json({ message: 'Booking updated', changed: false });
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
  let connection;
  let autoResponseLock;
  try {
    const { id, chat_id, sender_id, sender_type, message, status, created_at, is_auto_response } = req.body;
    const isBookingWelcome = is_auto_response === true &&
      sender_type === 'talent' &&
      String(message || '').startsWith('Halo! Terima kasih sudah booking untuk ');

    if (isBookingWelcome) {
      connection = await pool.getConnection();
      autoResponseLock = `welcome:${chat_id}`;
      const [locks] = await connection.query('SELECT GET_LOCK(?, 10) AS acquired', [autoResponseLock]);
      if (locks[0]?.acquired !== 1) {
        return res.status(503).json({ message: 'Greeting chat sedang diproses. Silakan coba lagi.' });
      }

      const [existing] = await connection.query(
        `SELECT id FROM messages
         WHERE chat_id = ? AND sender_id = ? AND sender_type = 'talent' AND message = ?
         LIMIT 1`,
        [chat_id, sender_id, message]
      );
      if (existing.length > 0) {
        return res.status(200).json({ message: 'Greeting sudah ada.', duplicate: true });
      }
    }

    const query = isBookingWelcome ? connection.query.bind(connection) : pool.query.bind(pool);
    await query(
      `INSERT INTO messages (id, chat_id, sender_id, sender_type, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, chat_id, sender_id, sender_type, message, status, created_at]
    );
    res.status(201).json({ message: 'Message created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) {
      if (autoResponseLock) {
        await connection.query('SELECT RELEASE_LOCK(?)', [autoResponseLock]).catch(() => {});
      }
      connection.release();
    }
  }
});

async function removeDuplicateBookingWelcomeMessages() {
  const [result] = await pool.query(`
    DELETE duplicate_message
    FROM messages AS duplicate_message
    INNER JOIN messages AS kept_message
      ON kept_message.chat_id = duplicate_message.chat_id
      AND kept_message.sender_id = duplicate_message.sender_id
      AND kept_message.sender_type = 'talent'
      AND duplicate_message.sender_type = 'talent'
      AND kept_message.message = duplicate_message.message
      AND kept_message.message LIKE 'Halo! Terima kasih sudah booking untuk %'
      AND (
        kept_message.created_at < duplicate_message.created_at OR
        (kept_message.created_at = duplicate_message.created_at AND kept_message.id < duplicate_message.id)
      )
    WHERE duplicate_message.message LIKE 'Halo! Terima kasih sudah booking untuk %'
  `);
  if (result.affectedRows > 0) {
    console.log(`Removed ${result.affectedRows} duplicate booking welcome messages`);
  }
}

// Customer complaints
app.get('/api/complaints', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM complaints ORDER BY created_at DESC');
    res.status(200).json(rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      userPhone: row.user_phone,
      bookingId: row.booking_id,
      talentId: row.talent_id,
      talentName: row.talent_name,
      subject: row.subject,
      description: row.description,
      urgency: row.urgency,
      status: row.status,
      source: 'user',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })));
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil komplain.', error: error.message });
  }
});

app.post('/api/complaints', async (req, res) => {
  try {
    const { userId, bookingId, description, urgency = 'normal' } = req.body || {};
    if (!userId || !bookingId || !String(description || '').trim()) {
      return res.status(400).json({ message: 'Pelanggan, pesanan, dan deskripsi komplain wajib diisi.' });
    }
    if (String(description).trim().length > 10000) {
      return res.status(400).json({ message: 'Deskripsi komplain maksimal 10.000 karakter.' });
    }

    const [bookings] = await pool.query(
      'SELECT id, user_id, talent_id FROM bookings WHERE id = ?',
      [bookingId]
    );
    if (bookings.length === 0) return res.status(404).json({ message: 'Pesanan tidak ditemukan.' });
    if (String(bookings[0].user_id) !== String(userId)) {
      return res.status(403).json({ message: 'Pesanan ini bukan milik akun Anda.' });
    }

    const [users] = await pool.query('SELECT name, email, phone FROM users WHERE id = ?', [userId]);
    const [talents] = bookings[0].talent_id
      ? await pool.query('SELECT full_name FROM profiles WHERE user_id = ?', [bookings[0].talent_id])
      : [[]];
    const userName = users[0]?.name || 'Pelanggan';
    const talentName = talents[0]?.full_name || req.body.talentName || 'Mitra';
    const id = crypto.randomUUID();
    const subject = `Komplain pesanan dengan ${talentName}`;
    const safeUrgency = ['low', 'normal', 'high', 'critical'].includes(urgency) ? urgency : 'normal';

    await pool.query(
      `INSERT INTO complaints
        (id, user_id, user_name, user_email, user_phone, booking_id, talent_id, talent_name, subject, description, urgency, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [id, userId, userName, users[0]?.email || '', users[0]?.phone || '', bookingId, bookings[0].talent_id, talentName, subject, String(description).trim(), safeUrgency]
    );

    const [created] = await pool.query('SELECT * FROM complaints WHERE id = ?', [id]);
    const row = created[0];
    res.status(201).json({
      report: {
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        userEmail: row.user_email,
        userPhone: row.user_phone,
        bookingId: row.booking_id,
        talentId: row.talent_id,
        talentName: row.talent_name,
        subject: row.subject,
        description: row.description,
        urgency: row.urgency,
        status: row.status,
        source: 'user',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Komplain gagal disimpan.', error: error.message });
  }
});

app.put('/api/complaints/:id', async (req, res) => {
  try {
    const allowedStatuses = ['pending', 'in-progress', 'resolved'];
    const { status } = req.body || {};
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Status komplain tidak valid.' });
    }

    const [result] = await pool.query(
      'UPDATE complaints SET status = ? WHERE id = ?',
      [status, req.params.id]
    );
    if (result.affectedRows === 0) {
      const [rows] = await pool.query('SELECT id FROM complaints WHERE id = ?', [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ message: 'Komplain tidak ditemukan.' });
    }
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Status komplain gagal diperbarui.', error: error.message });
  }
});

// =================================================================
// TOPUP REQUESTS
// =================================================================
app.get('/api/topup-requests', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT topups.*, users.photo AS user_photo
       FROM topup_requests AS topups
       LEFT JOIN users ON users.id = topups.user_id
       ORDER BY topups.created_at DESC`
    );
    const formatted = rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      userEmail: r.user_email,
      userPhoto: r.user_photo || "",
      amount: Number(r.amount),
      proofImageBase64: r.proof_image,
      status: r.status,
      adminNote: r.admin_note,
      createdAt: r.created_at,
      processedAt: r.processed_at
    }));
    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/topup-requests', async (req, res) => {
  try {
    const { id, userId, userName, userEmail, amount, proofImageBase64, status, createdAt } = req.body;
    await pool.query(
      `INSERT INTO topup_requests (id, user_id, user_name, user_email, amount, proof_image, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, userName, userEmail, amount, proofImageBase64, status, createdAt]
    );
    res.status(201).json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/topup-requests/:id/approve', async (req, res) => {
  try {
    const { adminNote } = req.body;
    
    // 1. Get the topup request to find user_id and amount
    const [rows] = await pool.query('SELECT * FROM topup_requests WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    const topup = rows[0];
    
    // 2. Update topup status
    await pool.query(
      `UPDATE topup_requests SET status = 'approved', admin_note = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [adminNote || null, req.params.id]
    );
    
    // 3. Add wallet to user in DB
    await pool.query(
      `UPDATE users SET wallet = wallet + ? WHERE id = ?`,
      [topup.amount, topup.user_id]
    );
    
    // 4. Store notification for user
    const notifId = crypto.randomUUID();
    const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
    await pool.query(
      `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
      [notifId, topup.user_id, 'Saldo Berhasil Ditambahkan! 💰', `Permintaan isi saldo sebesar ${fmt(topup.amount)} telah disetujui oleh Admin. Saldo kamu sudah diperbarui!`, 'payment']
    );
    
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/topup-requests/:id/reject', async (req, res) => {
  try {
    const { adminNote } = req.body;
    const [rows] = await pool.query('SELECT * FROM topup_requests WHERE id = ?', [req.params.id]);
    if (rows.length > 0) {
      const topup = rows[0];
      const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
      const notifId = crypto.randomUUID();
      await pool.query(
        `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
        [notifId, topup.user_id, 'Permintaan Isi Saldo Ditolak', `Permintaan isi saldo sebesar ${fmt(topup.amount)} ditolak. Alasan: ${adminNote || 'Bukti tidak valid'}.`, 'admin']
      );
    }
    await pool.query(
      `UPDATE topup_requests SET status = 'rejected', admin_note = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [adminNote || null, req.params.id]
    );
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =================================================================
// NOTIFICATIONS API
// =================================================================
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.params.userId]
    );
    const formatted = rows.map(r => ({
      id: r.id,
      title: r.title,
      message: r.message,
      time: new Date(r.created_at).toLocaleString('id-ID'),
      read: r.is_read === 1,
      type: r.type
    }));
    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notifications', async (req, res) => {
  try {
    const { id, userId, title, message, type } = req.body;
    const notifId = id || crypto.randomUUID();
    await pool.query(
      `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
      [notifId, userId, title, message, type || 'admin']
    );
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/notifications/:userId/:notificationId/read', async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id = ?',
      [req.params.userId, req.params.notificationId]
    );
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/notifications/:userId/read-all', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.params.userId]);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pastikan tabel top-up tersedia sebelum endpoint dipakai. Sebelumnya, ketika
// tabel belum pernah dibuat, POST dari user gagal lalu diam-diam tersimpan di
// localStorage browser user saja sehingga tidak pernah terlihat di browser admin.
async function ensureTopUpTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS topup_requests (
      id VARCHAR(100) PRIMARY KEY,
      user_id VARCHAR(36),
      user_name VARCHAR(255),
      user_email VARCHAR(255),
      amount DECIMAL(10,2),
      proof_image LONGTEXT,
      status VARCHAR(50) DEFAULT 'pending',
      admin_note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      processed_at TIMESTAMP NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS complaints (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      user_name VARCHAR(255) NOT NULL,
      user_email VARCHAR(255),
      user_phone VARCHAR(50),
      booking_id VARCHAR(36) NOT NULL,
      talent_id VARCHAR(36),
      talent_name VARCHAR(255),
      subject VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      urgency VARCHAR(20) DEFAULT 'normal',
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_complaints_user_id (user_id),
      INDEX idx_complaints_booking_id (booking_id),
      INDEX idx_complaints_status (status)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT,
      type VARCHAR(50) DEFAULT 'admin',
      is_read TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_notifications_user_id (user_id)
    )
  `);

  await removeDuplicateBookingWelcomeMessages();

  // Database lama mungkin belum memiliki kolom lokasi pertemuan.
  try {
    await pool.query('ALTER TABLE bookings ADD COLUMN meeting_city VARCHAR(255) NULL');
  } catch (error) {
    // Error duplicate column berarti kolom sudah tersedia, aman diabaikan.
    if (!String(error.message || '').toLowerCase().includes('duplicate')) throw error;
  }
}

const PORT = process.env.PORT || 3001;
ensureTopUpTable()
  .then(() => {
    startPendingBookingExpiryWorker();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Gagal menyiapkan tabel aplikasi:', error.message);
    // Tetap jalankan server agar fitur lain tidak ikut mati; endpoint akan
    // mengembalikan error yang jelas jika koneksi database belum tersedia.
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (sebagian tabel belum siap)`);
    });
  });