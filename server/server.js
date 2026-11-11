const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const crypto = require('crypto');
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();
const MITRA_ACTIVITY_IDS = new Set([
  'nongkrong', 'traveling', 'hiking', 'event', 'olahraga', 'kuliner',
  'nonton', 'belanja', 'musik', 'gaming', 'fotografi', 'kerja-belajar',
  'ngopi', 'online-chat', 'lainnya',
]);
const LEGACY_ACTIVITY_KEYWORDS = {
  nongkrong: ['nongkrong', 'ngobrol', 'teman ngobrol', 'teman sosial'],
  traveling: ['traveling', 'travelling', 'travel', 'liburan', 'wisata', 'tour guide', 'pemandu', 'jalan jalan', 'trip'],
  hiking: ['hiking', 'mendaki', 'pendakian', 'naik gunung'],
  event: ['event', 'acara', 'kondangan', 'wisuda', 'pernikahan', 'wedding', 'ulang tahun', 'seminar', 'konferensi', 'gathering', 'reuni', 'konser', 'festival', 'pesta', 'party', 'mc', 'host acara'],
  olahraga: ['olahraga', 'gym', 'fitness', 'yoga', 'renang', 'basket', 'badminton', 'sepak bola', 'lari', 'workout', 'pelatih'],
  kuliner: ['kuliner', 'makan', 'memasak', 'masak', 'cooking', 'chef', 'barista', 'food'],
  nonton: ['nonton', 'film', 'bioskop', 'movie', 'cinema', 'series', 'drakor'],
  belanja: ['belanja', 'shopping', 'mall', 'fashion'],
  musik: ['musik', 'music', 'karaoke', 'konser', 'vokalis', 'gitar', 'musisi', 'penyanyi'],
  gaming: ['gaming', 'game', 'gamer', 'mabar', 'esport'],
  fotografi: ['fotografi', 'fotografer', 'photography', 'foto', 'videografer', 'editor'],
  'kerja-belajar': ['kerja', 'meeting', 'belajar', 'diskusi', 'networking', 'membaca', 'penerjemah'],
  ngopi: ['kopi', 'kafe', 'cafe', 'coffee', 'ngafe'],
  'online-chat': ['online', 'video call', 'chat', 'daring'],
};

function inferLegacyActivities(profile) {
  const legacyValues = [
    profile.category,
    profile.hobbies,
    profile.specialist_skills,
    profile.description,
  ];
  const text = legacyValues
    .map((value) => {
      if (typeof value !== 'string') return '';
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.join(' ') : value;
      } catch {
        return value;
      }
    })
    .join(' ')
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const activities = Object.entries(LEGACY_ACTIVITY_KEYWORDS)
    .filter(([, keywords]) => keywords.some((keyword) =>
      text.includes(keyword.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim())
    ))
    .map(([activity]) => activity);
  return activities.length > 0 ? activities : ['nongkrong'];
}

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
    cb(null, uploadsDir);
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
  const {
    email,
    password,
    name,
    phone,
    address,
    description,
    price,
    category,
    supported_activities,
    hobbies,
    specialist_skills,
    photo,
    ktp,
    age,
    experience_level,
    price_expectation,
    social_media,
    portfolio_file,
  } = req.body;
  
  try {
    if (!Array.isArray(supported_activities) ||
        supported_activities.length === 0 ||
        supported_activities.some((activity) => !MITRA_ACTIVITY_IDS.has(activity))) {
      return res.status(400).json({ message: 'Pilih minimal satu aktivitas yang bersedia Anda temani.' });
    }

    const userId = crypto.randomUUID();
    
    // Check if email exists
    const [existing] = await pool.query('SELECT email FROM profiles WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email sudah terdaftar.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO profiles (user_id, email, password, full_name, phone, address, description, price, category, supported_activities, hobbies, specialist_skills, photo, ktp, age, experience_level, price_expectation, social_media, portfolio_file, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        userId,
        email,
        hashedPassword,
        name,
        phone,
        address,
        description,
        price || 0,
        category,
        JSON.stringify(supported_activities),
        hobbies || '[]',
        JSON.stringify(Array.isArray(specialist_skills) ? specialist_skills : []),
        photo,
        ktp,
        age,
        experience_level || 'menengah',
        price_expectation || 'Rp 50.000 - Rp 85.000',
        social_media || '',
        portfolio_file || null,
      ]
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
    
    // Hapus password sebelum dikirim ke client (keamanan)
    const { password: _pw, ktp: _ktp, ...safeUser } = user;
    res.status(200).json({
      message: 'Login berhasil',
      user: {
        id: user.user_id,
        user_id: user.user_id,
        status: user.status,
        price_accepted: user.price_accepted,
        pricing_tier: user.pricing_tier,
        rejection_reason: user.rejection_reason,
        appeal_note: user.appeal_note,
        ...safeUser,
      },
      session: { access_token: 'dummy-token' }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat login.', error: error.message });
  }
});

// Endpoint terpadu login pengguna reguler & mitra dengan verifikasi bcrypt aman
app.post('/api/users/login', async (req, res) => {
  const { identifier, email, password } = req.body;
  const loginId = (identifier || email || '').trim();

  if (!loginId || !password) {
    return res.status(400).json({ message: 'Email/username dan kata sandi wajib diisi.' });
  }

  try {
    // 1. Coba cari di tabel users (bisa pakai email ATAU username)
    const [userRows] = await pool.query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [loginId, loginId]
    );

    if (userRows.length > 0) {
      const user = userRows[0];
      let isMatch = false;

      if (!user.password) {
        isMatch = true;
      } else if (user.password.startsWith('$2')) {
        isMatch = await bcrypt.compare(password, user.password);
      } else {
        isMatch = password === user.password;
      }

      if (isMatch) {
        const { password: _p, ...safeUser } = user;
        return res.status(200).json({
          success: true,
          type: 'user',
          user: safeUser,
        });
      }
    }

    // 2. Jika tidak cocok di users, coba cari di tabel profiles (mitra)
    const [profileRows] = await pool.query(
      'SELECT * FROM profiles WHERE email = ?',
      [loginId]
    );

    if (profileRows.length > 0) {
      const mitra = profileRows[0];
      let isMatch = false;

      if (!mitra.password) {
        isMatch = true;
      } else if (mitra.password.startsWith('$2')) {
        isMatch = await bcrypt.compare(password, mitra.password);
      } else {
        isMatch = password === mitra.password;
      }

      if (isMatch) {
        const { password: _p, ktp: _k, ...safeMitra } = mitra;
        return res.status(200).json({
          success: true,
          type: 'mitra',
          user: {
            ...safeMitra,
            id: mitra.user_id,
            talentId: mitra.user_id,
          },
        });
      }
    }

    // Jika sampai di sini, email/username tidak ditemukan atau kata sandi tidak cocok
    return res.status(401).json({ message: 'Kata sandi salah. Silakan coba lagi.' });
  } catch (error) {
    console.error('Error during /api/users/login:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan saat login.', error: error.message });
  }
});

app.get('/api/mitra/status', async (req, res) => {
  const { email, userId } = req.query;
  if (!email && !userId) {
    return res.status(400).json({ message: 'Email atau userId dibutuhkan.' });
  }
  try {
    let rows;
    if (userId) {
      [rows] = await pool.query(
        'SELECT user_id, email, full_name, phone, address, description, price, service_rates, pending_service_rates, pricing_tier, price_accepted, category, supported_activities, hobbies, specialist_skills, photo, age, experience_level, price_expectation, social_media, portfolio_file, status, rejection_reason, appeal_note, appeal_file, admin_price_note, created_at FROM profiles WHERE user_id = ?',
        [userId]
      );
    } else {
      [rows] = await pool.query(
        'SELECT user_id, email, full_name, phone, address, description, price, service_rates, pending_service_rates, pricing_tier, price_accepted, category, supported_activities, hobbies, specialist_skills, photo, age, experience_level, price_expectation, social_media, portfolio_file, status, rejection_reason, appeal_note, appeal_file, admin_price_note, created_at FROM profiles WHERE email = ?',
        [email]
      );
    }
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Data mitra tidak ditemukan.' });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error getting mitra status:', error);
    res.status(500).json({ message: 'Gagal memuat status mitra.', error: error.message });
  }
});

app.post('/api/mitra/accept-price', async (req, res) => {
  const { email, userId } = req.body;
  if (!email && !userId) {
    return res.status(400).json({ message: 'Email atau userId dibutuhkan.' });
  }
  try {
    await pool.query(
      'UPDATE profiles SET price_accepted = 1 WHERE email = ? OR user_id = ?',
      [email || '', userId || '']
    );
    res.status(200).json({ message: 'Tarif berhasil disetujui! Akun Anda aktif.' });
  } catch (error) {
    console.error('Error accepting price:', error);
    res.status(500).json({ message: 'Gagal menyetujui tarif.', error: error.message });
  }
});

app.post('/api/mitra/appeal-price', async (req, res) => {
  const { email, userId, note, appeal_file } = req.body;
  if (!email && !userId) {
    return res.status(400).json({ message: 'Email atau userId dibutuhkan.' });
  }
  const requestedRates = req.body.requestedRates;
  if (!Array.isArray(requestedRates) || requestedRates.length === 0) {
    return res.status(400).json({ message: 'Usulan tarif minimal harus berisi satu layanan.' });
  }
  const serviceIds = new Set();
  for (const rate of requestedRates) {
    if (!rate || typeof rate.id !== 'string' || !rate.id.trim() || serviceIds.has(rate.id)) {
      return res.status(400).json({ message: 'Data layanan dalam usulan tarif tidak valid.' });
    }
    if (!Number.isFinite(Number(rate.price)) || Number(rate.price) <= 0) {
      return res.status(400).json({ message: `Tarif untuk ${rate.category || rate.id} harus lebih besar dari nol.` });
    }
    serviceIds.add(rate.id);
  }
  const serializedRates = JSON.stringify(requestedRates.map((rate) => ({
    id: rate.id,
    category: String(rate.category || rate.id),
    price: Number(rate.price),
    unit: String(rate.unit || 'jam'),
    unitLabel: String(rate.unitLabel || '/ jam'),
    durationHint: String(rate.durationHint || ''),
    description: String(rate.description || ''),
    isActive: rate.isActive !== false,
  })));
  try {
    const [result] = await pool.query(
      'UPDATE profiles SET pending_service_rates = ?, appeal_note = ?, appeal_file = ?, admin_price_note = NULL WHERE (email = ? OR user_id = ?) AND status = "approved"',
      [serializedRates, String(note || 'Pengajuan perubahan tarif layanan').trim(), appeal_file || null, email || '', userId || '']
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Profil mitra yang disetujui tidak ditemukan.' });
    }
    res.status(200).json({ message: 'Permohonan banding tarif Anda telah dikirim ke admin.' });
  } catch (error) {
    console.error('Error submitting appeal:', error);
    res.status(500).json({ message: 'Gagal mengirim banding.', error: error.message });
  }
});

app.post('/api/admin/approve-service-prices', async (req, res) => {
  const { email, userId } = req.body || {};
  if (!email && !userId) {
    return res.status(400).json({ message: 'Email atau userId dibutuhkan.' });
  }
  try {
    const [result] = await pool.query(
      `UPDATE profiles
       SET service_rates = pending_service_rates,
           pending_service_rates = NULL,
           appeal_note = NULL,
           appeal_file = NULL,
           admin_price_note = 'Usulan tarif layanan disetujui admin.'
       WHERE (email = ? OR user_id = ?) AND pending_service_rates IS NOT NULL`,
      [email || '', userId || '']
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Tidak ada usulan tarif layanan yang menunggu persetujuan.' });
    }
    res.status(200).json({ message: 'Tarif layanan yang diajukan berhasil disetujui.' });
  } catch (error) {
    console.error('Error approving service price proposal:', error);
    res.status(500).json({ message: 'Gagal menyetujui usulan tarif layanan.', error: error.message });
  }
});

// Endpoint untuk mengambil semua permohonan banding tarif mitra
app.get('/api/admin/appeals', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT user_id, email, full_name, phone, address, description, price, service_rates, pending_service_rates, pricing_tier, price_accepted, category, supported_activities, hobbies, specialist_skills, photo, ktp, age, experience_level, price_expectation, social_media, portfolio_file, status, appeal_note, appeal_file, admin_price_note, created_at
       FROM profiles
       WHERE pending_service_rates IS NOT NULL
          OR (appeal_note IS NOT NULL AND TRIM(appeal_note) != '' AND (price_accepted = 0 OR price_accepted IS NULL))
       ORDER BY created_at DESC`
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error getting appeals:', error);
    res.status(500).json({ message: 'Gagal mengambil data banding.', error: error.message });
  }
});

// Endpoint untuk menolak banding tarif mitra (HANYA tolak banding harga, TIDAK menolak calon mitra)
app.post('/api/admin/reject-appeal', async (req, res) => {
  const { talentEmail, talentId, reason } = req.body;
  if (!talentEmail && !talentId) {
    return res.status(400).json({ message: 'Email atau ID talent dibutuhkan.' });
  }
  try {
    const reasonText = reason && reason.trim() ? reason.trim() : 'Permohonan penyesuaian tarif belum dapat disetujui. Tarif tetap sesuai penetapan awal.';
    const rejectionNote = `[BANDING DITOLAK] ${reasonText}`;

    // PERHATIKAN: status tetap "approved", price_accepted tetap 0, HANYA appeal_note yang direset ke NULL dan admin_price_note diisi alasan
    await pool.query(
      'UPDATE profiles SET appeal_note = NULL, pending_service_rates = NULL, admin_price_note = ? WHERE email = ? OR user_id = ?',
      [rejectionNote, talentEmail || '', talentId || '']
    );

    res.status(200).json({
      message: 'Banding tarif berhasil ditolak. Tarif awal dipertahankan dan pendaftaran mitra tetap disetujui.',
    });
  } catch (error) {
    console.error('Error rejecting appeal:', error);
    res.status(500).json({ message: 'Gagal menolak banding.', error: error.message });
  }
});

app.get('/pending-talents', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT user_id, email, full_name, phone, address, description, price, category, supported_activities, hobbies, specialist_skills, photo, ktp, age, experience_level, price_expectation, social_media, portfolio_file, status, appeal_note, appeal_file, admin_price_note, created_at FROM profiles WHERE status = "pending"'
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
  const { talentEmail, talentName, loginLink, price, pricing_tier, admin_price_note, service_rates } = req.body;
  try {
    const tier = pricing_tier || 'tier2';
    const serializedRates = Array.isArray(service_rates) ? JSON.stringify(service_rates) : null;
    if (price !== undefined && price !== null && price !== '') {
      await pool.query(
        'UPDATE profiles SET status = "approved", price = ?, service_rates = COALESCE(?, service_rates), pending_service_rates = NULL, pricing_tier = ?, admin_price_note = ?, appeal_note = NULL WHERE email = ?',
        [price, serializedRates, tier, admin_price_note || null, talentEmail]
      );
    } else {
      await pool.query(
        'UPDATE profiles SET status = "approved", service_rates = COALESCE(?, service_rates), pending_service_rates = NULL, pricing_tier = ?, admin_price_note = ?, appeal_note = NULL WHERE email = ?',
        [serializedRates, tier, admin_price_note || null, talentEmail]
      );
    }
    res.status(200).json({ message: 'Talent berhasil disetujui dan status telah diperbarui.' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menyetujui talent.', error: error.message });
  }
});

const handleRejectTalent = async (req, res) => {
  const { talentEmail, talentId, reason } = req.body;
  try {
    const finalReason = reason || 'Dokumen belum memenuhi persyaratan verifikasi.';
    await pool.query(
      'UPDATE profiles SET status = "rejected", rejection_reason = ? WHERE (email IS NOT NULL AND email = ?) OR (user_id IS NOT NULL AND user_id = ?)',
      [finalReason, talentEmail || '', talentId || '']
    );

    // Kirim notifikasi resmi ke user jika profil terhubung dengan akun user
    try {
      const [profiles] = await pool.query(
        'SELECT user_id, full_name FROM profiles WHERE (email IS NOT NULL AND email = ?) OR (user_id IS NOT NULL AND user_id = ?)',
        [talentEmail || '', talentId || '']
      );
      if (profiles.length > 0 && profiles[0].user_id) {
        await pool.query(
          `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
           VALUES (?, ?, ?, ?, 'danger', 0, CURRENT_TIMESTAMP)`,
          [
            crypto.randomUUID(),
            profiles[0].user_id,
            'Pendaftaran Mitra Ditolak',
            `Pendaftaran Anda sebagai mitra belum dapat disetujui. Alasan: ${finalReason}`
          ]
        );
      }
    } catch (notifErr) {
      console.warn('Gagal mencatat notifikasi penolakan mitra:', notifErr.message);
    }

    res.status(200).json({ success: true, message: 'Pendaftaran talent ditolak dan status telah diperbarui.' });
  } catch (error) {
    console.error('Error rejecting talent:', error);
    res.status(500).json({ success: false, message: 'Gagal menolak talent.', error: error.message });
  }
};

app.post('/reject-talent', handleRejectTalent);
app.post('/api/reject-talent', handleRejectTalent);
app.post('/api/admin/reject-talent', handleRejectTalent);

// =================================================================
// NEW API ENDPOINTS FOR FRONTEND STORES
// =================================================================

// Upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  if (!req.file.mimetype.startsWith('image/')) {
    fs.unlink(path.join(uploadsDir, req.file.filename), () => {});
    return res.status(400).json({ message: 'Lampiran chat hanya menerima file gambar.' });
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

// Talents — HANYA talent yang sudah approved 100% dan sudah menyetujui tarif yang muncul ke publik!
app.get('/api/talents', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT user_id, email, full_name, phone, address, description, price, service_rates, category, supported_activities, hobbies, specialist_skills, photo, age, experience_level, portfolio_file, status, price_accepted, created_at FROM profiles WHERE status = "approved" AND price_accepted = 1'
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
    const allowedFields = ['full_name', 'photo', 'address', 'category', 'supported_activities', 'description', 'price', 'service_rates', 'age', 'phone'];
    if (req.body.supported_activities !== undefined &&
        (!Array.isArray(req.body.supported_activities) ||
          req.body.supported_activities.length === 0 ||
          req.body.supported_activities.some((activity) => !MITRA_ACTIVITY_IDS.has(activity)))) {
      return res.status(400).json({ message: 'Pilih minimal satu aktivitas layanan yang valid.' });
    }
    const updateFields = [];
    const updateValues = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(['service_rates', 'supported_activities'].includes(field) && Array.isArray(req.body[field])
          ? JSON.stringify(req.body[field])
          : req.body[field]);
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
    SELECT id, user_id, talent_id, purpose, total, payment_status, payment_method, approval_status
    FROM bookings
    WHERE ((
        approval_status = 'pending_mitra'
        AND (
          (mitra_response_deadline IS NOT NULL AND mitra_response_deadline <= NOW())
          OR (mitra_response_deadline IS NULL AND DATE_ADD(TIMESTAMP(date, time), INTERVAL COALESCE(duration, 1) HOUR) <= NOW())
        )
      ) OR (
        approval_status = 'pending_approval'
        AND DATE_ADD(TIMESTAMP(date, time), INTERVAL COALESCE(duration, 1) HOUR) <= NOW()
      ))
      AND date IS NOT NULL
      AND time IS NOT NULL
  `);

  for (const booking of overdueBookings) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query(`
        UPDATE bookings
        SET approval_status = 'expired',
            payment_status = CASE
              WHEN payment_status = 'paid' AND payment_method = 'saldo' THEN 'refunded'
              WHEN payment_status = 'paid' THEN 'refund_pending'
              ELSE payment_status
            END
        WHERE id = ?
          AND approval_status IN ('pending_approval', 'pending_mitra')
          AND (
            (approval_status = 'pending_mitra' AND (
              (mitra_response_deadline IS NOT NULL AND mitra_response_deadline <= NOW())
              OR (mitra_response_deadline IS NULL AND DATE_ADD(TIMESTAMP(date, time), INTERVAL COALESCE(duration, 1) HOUR) <= NOW())
            )) OR
            (approval_status = 'pending_approval' AND DATE_ADD(TIMESTAMP(date, time), INTERVAL COALESCE(duration, 1) HOUR) <= NOW())
          )
      `, [booking.id]);

      if (result.affectedRows === 0) {
        await connection.rollback();
        continue;
      }

      if (booking.approval_status === 'pending_mitra' && booking.talent_id) {
        const [strikeResult] = await connection.query(
          `INSERT IGNORE INTO mitra_booking_violations (id, booking_id, mitra_id, reason, created_at)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [crypto.randomUUID(), booking.id, booking.talent_id, 'Tidak merespons booking sampai batas waktu.']
        );

        if (strikeResult.affectedRows > 0) {
          const [[counts]] = await connection.query(
            `SELECT
               SUM(created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY)) AS strikes_60_days,
               COUNT(*) AS strikes_90_days
             FROM mitra_booking_violations
             WHERE mitra_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)`,
            [booking.talent_id]
          );
          const strikes60 = Number(counts.strikes_60_days || 0);
          const strikes90 = Number(counts.strikes_90_days || 0);
          const suspensionDays = strikes90 >= 5 ? 30 : strikes60 >= 3 ? 7 : 0;

          if (suspensionDays > 0) {
            await connection.query(
              `INSERT INTO mitra_sanctions (mitra_id, suspended_until)
               VALUES (?, DATE_ADD(NOW(), INTERVAL ${suspensionDays} DAY))
               ON DUPLICATE KEY UPDATE
                 suspended_until = GREATEST(COALESCE(suspended_until, NOW()), DATE_ADD(NOW(), INTERVAL ${suspensionDays} DAY))`,
              [booking.talent_id]
            );
          }
        }
      }

      if (booking.payment_status === 'paid' && booking.payment_method === 'saldo' && booking.user_id) {
        const [walletUpdate] = await connection.query(
          'UPDATE users SET wallet = wallet + ? WHERE id = ?',
          [booking.total, booking.user_id]
        );
        if (walletUpdate.affectedRows === 0) {
          throw new Error(`Saldo user ${booking.user_id} tidak ditemukan untuk refund booking ${booking.id}`);
        }
      }

      if (booking.user_id) {
        const refundMessage = booking.payment_status === 'paid' && booking.payment_method === 'saldo'
          ? 'Pesanan kedaluwarsa. Saldo aplikasi sudah dikembalikan ke dompet Anda.'
          : booking.payment_status === 'paid'
            ? 'Pembayaran Anda tercatat. Pengembalian dana transfer sedang menunggu penanganan Admin.'
          : 'Pesanan dibatalkan karena waktu jadwal sudah lewat sebelum mendapat persetujuan.';
        await connection.query(
          `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
           VALUES (?, ?, ?, ?, 'booking', 0, CURRENT_TIMESTAMP)`,
          [crypto.randomUUID(), booking.user_id, 'Pesanan Kedaluwarsa', refundMessage]
        );
      }

      if (booking.talent_id && booking.approval_status === 'pending_mitra') {
        await connection.query(
          `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
           VALUES (?, ?, ?, ?, 'admin', 0, CURRENT_TIMESTAMP)`,
          [crypto.randomUUID(), booking.talent_id, 'Booking Terlewat', 'Booking kedaluwarsa karena belum direspons. Pelanggaran tercatat pada akun Anda.',]
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

function getMitraResponseDeadline(date, time) {
  const now = new Date();
  const bookingStart = new Date(`${String(date).slice(0, 10)}T${String(time).slice(0, 8)}`);
  if (Number.isNaN(bookingStart.getTime())) return new Date(now.getTime() + 30 * 60 * 1000);

  const hoursUntilBooking = (bookingStart.getTime() - now.getTime()) / (60 * 60 * 1000);
  const responseWindow = hoursUntilBooking <= 4 ? 30 * 60 * 1000 : 12 * 60 * 60 * 1000;
  const beforeStartWindow = hoursUntilBooking <= 4 ? 0 : 2 * 60 * 60 * 1000;
  const deadline = Math.min(
    now.getTime() + responseWindow,
    bookingStart.getTime() - beforeStartWindow
  );
  return new Date(Math.max(now.getTime(), deadline));
}

async function getMitraConductStatus(mitraId) {
  const [[counts]] = await pool.query(
    `SELECT
       COALESCE(SUM(created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY)), 0) AS strikes_60_days,
       COUNT(*) AS strikes_90_days
     FROM mitra_booking_violations
     WHERE mitra_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)`,
    [mitraId]
  );
  const [[sanction]] = await pool.query(
    `SELECT suspended_until, suspended_until > NOW() AS is_suspended
     FROM mitra_sanctions WHERE mitra_id = ?`,
    [mitraId]
  );
  return {
    strikes60Days: Number(counts.strikes_60_days || 0),
    strikes90Days: Number(counts.strikes_90_days || 0),
    suspendedUntil: sanction?.suspended_until || null,
    isSuspended: Boolean(sanction?.is_suspended),
  };
}

app.get('/api/mitra-conduct/:mitraId', async (req, res) => {
  try {
    res.status(200).json(await getMitraConductStatus(req.params.mitraId));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const { id, user_id, user_name, talent_id, purpose, type, date, time, duration, total, meeting_city, payment_status, approval_status, payment_code, created_at, notes } = req.body;
    const [talentRows] = await pool.query(
      'SELECT supported_activities FROM profiles WHERE user_id = ? AND status = "approved" AND price_accepted = 1',
      [talent_id]
    );
    if (talentRows.length > 0) {
      let supportedActivities = [];
      try {
        const storedActivities = talentRows[0].supported_activities;
        supportedActivities = Array.isArray(storedActivities)
          ? storedActivities
          : JSON.parse(storedActivities || '[]');
      } catch {
        supportedActivities = [];
      }

      const purposeKey = String(purpose || '').startsWith('Lainnya:')
        ? 'Lainnya'
        : String(purpose || '');
      const purposeActivities = {
        'Nongkrong / Ngobrol': ['nongkrong', 'ngopi', 'online-chat'],
        'Dinner / Makan Malam': ['kuliner', 'ngopi', 'nongkrong'],
        'Traveling / Liburan': ['traveling'],
        Hiking: ['hiking'],
        'Event / Acara': ['event'],
        'Event / Wisuda atau Kelulusan': ['event'],
        'Event / Pernikahan atau Kondangan': ['event'],
        'Event / Ulang Tahun': ['event'],
        'Event / Seminar atau Konferensi': ['event'],
        'Event / Gathering atau Reuni': ['event'],
        'Event / Konser atau Festival': ['event', 'musik'],
        'Event / Acara Kantor': ['event'],
        'Event / Acara Lainnya': ['event'],
        'Nonton Film': ['nonton'],
        Belanja: ['belanja'],
        'Olahraga Bareng': ['olahraga'],
        'Kerja / Meeting': ['kerja-belajar'],
        'Pesta / Party': ['event', 'musik'],
        'Jasa Fotografi': ['fotografi'],
        Lainnya: ['lainnya'],
        'Main Game Online': ['gaming'],
        'Nonton Bareng Online': ['nonton'],
        'Karaoke Online': ['musik'],
        'Belajar / Diskusi': ['kerja-belajar', 'online-chat'],
      };
      const allowedActivities = purposeActivities[purposeKey] || [];
      if (!Array.isArray(supportedActivities) || !allowedActivities.some((activity) => supportedActivities.includes(activity))) {
        return res.status(400).json({ message: 'Aktivitas ini tidak termasuk layanan yang dipilih mitra.' });
      }
    }

    const [[sanction]] = await pool.query(
      'SELECT suspended_until FROM mitra_sanctions WHERE mitra_id = ? AND suspended_until > NOW()',
      [talent_id]
    );
    if (sanction) {
      return res.status(423).json({
        message: `Mitra sementara tidak menerima booking sampai ${new Date(sanction.suspended_until).toLocaleString('id-ID')}.`,
      });
    }

    // Validasi jam operasional mitra (08:00 - 22:00 WIB)
    if (time) {
      const [startH, startM] = String(time).slice(0, 5).split(':').map(Number);
      const startMin = (startH || 0) * 60 + (startM || 0);
      const endMin = startMin + (Number(duration) || 1) * 60;
      if (startMin < 8 * 60 || endMin > 22 * 60) {
        const endHourFormatted = String(Math.floor(endMin / 60) % 24).padStart(2, '0');
        const endMinuteFormatted = String(endMin % 60).padStart(2, '0');
        const isNextDay = Math.floor(endMin / 60) >= 24;
        return res.status(400).json({
          message: `Waktu layanan melebihi jam operasional mitra (08:00–22:00). Pemesanan dari pukul ${time} selama ${duration} jam akan selesai pukul ${endHourFormatted}:${endMinuteFormatted}${isNextDay ? ' (besok)' : ''} WIB.`,
        });
      }
    }

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

    if (req.body.approval_status === 'pending_mitra') {
      const [bookings] = await pool.query('SELECT date, time FROM bookings WHERE id = ?', [req.params.id]);
      if (bookings.length > 0) {
        updateFields.push('mitra_response_deadline = ?');
        updateValues.push(getMitraResponseDeadline(bookings[0].date, bookings[0].time));
      }
    } else if (['approved', 'rejected'].includes(req.body.approval_status)) {
      updateFields.push('mitra_response_deadline = NULL');
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

app.post('/api/mitra-bookings/:id/reject', async (req, res) => {
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    const mitraId = String(req.body.mitraId || '');
    const reason = String(req.body.reason || '').trim();
    if (!mitraId || reason.length < 5) {
      return res.status(400).json({ message: 'Alasan penolakan wajib diisi (minimal 5 karakter).' });
    }

    await connection.beginTransaction();
    transactionStarted = true;
    const [rows] = await connection.query(
      'SELECT * FROM bookings WHERE id = ? FOR UPDATE',
      [req.params.id]
    );
    if (rows.length === 0) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ message: 'Booking tidak ditemukan.' });
    }

    const booking = rows[0];
    if (String(booking.talent_id) !== mitraId) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(403).json({ message: 'Booking ini bukan milik akun mitra tersebut.' });
    }
    if (!['pending_mitra', 'pending_approval'].includes(booking.approval_status)) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({ message: 'Booking sudah tidak menunggu respons.' });
    }

    let paymentStatus = booking.payment_status;
    if (booking.payment_status === 'paid' && booking.payment_method === 'saldo') {
      const [walletUpdate] = await connection.query(
        'UPDATE users SET wallet = wallet + ? WHERE id = ?',
        [booking.total, booking.user_id]
      );
      if (walletUpdate.affectedRows === 0) throw new Error('Saldo user gagal dikembalikan.');
      paymentStatus = 'refunded';
    } else if (booking.payment_status === 'paid') {
      paymentStatus = 'refund_pending';
    }

    await connection.query(
      `UPDATE bookings
       SET approval_status = 'rejected', payment_status = ?, rejection_reason = ?, mitra_response_deadline = NULL
       WHERE id = ?`,
      [paymentStatus, reason, req.params.id]
    );
    await connection.query(
      `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
       VALUES (?, ?, ?, ?, 'booking', 0, CURRENT_TIMESTAMP)`,
      [
        crypto.randomUUID(),
        booking.user_id,
        'Pesanan Ditolak Mitra',
        `Mitra menolak pesanan. Alasan: ${reason}.${paymentStatus === 'refunded' ? ' Dana saldo sudah dikembalikan.' : paymentStatus === 'refund_pending' ? ' Pengembalian dana transfer menunggu admin.' : ''}`,
      ]
    );

    // Kirim notifikasi ke Admin jika pesanan yang ditolak mitra sudah berbayar
    if (booking.payment_status === 'paid') {
      const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
      const isManualRefund = paymentStatus === 'refund_pending';
      await connection.query(
        `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
         VALUES (?, 'admin', ?, ?, 'payment', 0, CURRENT_TIMESTAMP)`,
        [
          crypto.randomUUID(),
          isManualRefund ? 'Perhatian: Ada Booking Ditolak Mitra Perlu Refund ⚠️' : 'Booking Berbayar Ditolak Mitra (Auto Refund Saldo) ℹ️',
          `Mitra (${booking.talent_name || 'Mitra'}) menolak pesanan berbayar ${fmt(booking.total)} dari ${booking.user_name || 'Pengguna'}. Alasan: "${reason}". ${isManualRefund ? 'Pembayaran via transfer memerlukan pengembalian dana manual oleh Admin di tab Persetujuan.' : 'Dana telah otomatis dikembalikan ke saldo dompet pengguna.'}`
        ]
      ).catch((err) => console.warn('Gagal mencatat notifikasi admin refund:', err.message));
    }

    await connection.commit();
    transactionStarted = false;
    res.status(200).json({ success: true, paymentStatus });
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    res.status(500).json({ message: error.message || 'Gagal menolak booking.' });
  } finally {
    connection.release();
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
    const {
      id, chat_id, sender_id, sender_type, message, status, created_at,
      is_auto_response, attachment_type, attachment_url, latitude, longitude,
    } = req.body;
    const hasImage = attachment_type === 'image' && typeof attachment_url === 'string' && attachment_url.includes('/uploads/');
    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);
    const hasLocation = attachment_type === 'location' &&
      Number.isFinite(latNum) && Number.isFinite(lonNum) &&
      Math.abs(latNum) <= 90 && Math.abs(lonNum) <= 180;
    if (attachment_type && !hasImage && !hasLocation) {
      return res.status(400).json({ message: 'Data lampiran chat tidak valid.' });
    }
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
      `INSERT INTO messages (id, chat_id, sender_id, sender_type, message, status, created_at, attachment_type, attachment_url, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, chat_id, sender_id, sender_type, message, status, created_at,
        hasImage ? 'image' : hasLocation ? 'location' : null,
        hasImage ? attachment_url : null,
        hasLocation ? Number(latitude) : null,
        hasLocation ? Number(longitude) : null,
      ]
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

// Delete message endpoint (Hapus untuk Semua Orang)
app.delete('/api/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [msgRows] = await pool.query('SELECT chat_id FROM messages WHERE id = ?', [id]);
    if (msgRows.length > 0) {
      const chatId = msgRows[0].chat_id;
      await pool.query('DELETE FROM messages WHERE id = ?', [id]);

      // Update last_message di tabel chats
      const [latest] = await pool.query(
        'SELECT message, created_at, attachment_type FROM messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT 1',
        [chatId]
      );
      if (latest.length > 0) {
        const lastTxt = latest[0].message || (latest[0].attachment_type ? 'Lampiran' : '');
        await pool.query('UPDATE chats SET last_message = ?, last_message_time = ? WHERE id = ?', [
          lastTxt,
          latest[0].created_at,
          chatId
        ]);
      } else {
        await pool.query('UPDATE chats SET last_message = ?, last_message_time = NULL WHERE id = ?', [
          '',
          chatId
        ]);
      }
    } else {
      await pool.query('DELETE FROM messages WHERE id = ?', [id]);
    }
    res.status(200).json({ message: 'Pesan berhasil dihapus untuk semua orang.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      proofImage: row.proof_image,
      atFault: row.at_fault,
      adminNotes: row.admin_notes,
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
    const { userId, bookingId, description, urgency = 'normal', proofImage } = req.body || {};
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
        (id, user_id, user_name, user_email, user_phone, booking_id, talent_id, talent_name, subject, description, urgency, status, proof_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [id, userId, userName, users[0]?.email || '', users[0]?.phone || '', bookingId, bookings[0].talent_id, talentName, subject, String(description).trim(), safeUrgency, proofImage || null]
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
        proofImage: row.proof_image,
        atFault: row.at_fault,
        adminNotes: row.admin_notes,
        source: 'user',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Komplain gagal disimpan.', error: error.message });
  }
});

app.get('/api/complaints/:id/chat', async (req, res) => {
  try {
    const { id } = req.params;
    const [complaintRows] = await pool.query('SELECT * FROM complaints WHERE id = ?', [id]);
    if (complaintRows.length === 0) {
      return res.status(404).json({ message: 'Komplain tidak ditemukan.' });
    }
    const complaint = complaintRows[0];

    // Find chat: first by booking_id
    let chat = null;
    let messages = [];

    if (complaint.booking_id) {
      const [chatRows] = await pool.query('SELECT * FROM chats WHERE booking_id = ? LIMIT 1', [complaint.booking_id]);
      if (chatRows.length > 0) {
        chat = chatRows[0];
      }
    }

    // Fallback: search by user_id and talent_id
    if (!chat && complaint.user_id && complaint.talent_id) {
      const [chatRows] = await pool.query(
        'SELECT * FROM chats WHERE user_id = ? AND talent_id = ? ORDER BY last_message_time DESC LIMIT 1',
        [complaint.user_id, complaint.talent_id]
      );
      if (chatRows.length > 0) {
        chat = chatRows[0];
      }
    }

    if (chat) {
      const [msgRows] = await pool.query(
        'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC',
        [chat.id]
      );
      messages = msgRows;
    }

    // Fetch user details
    let user = null;
    if (complaint.user_id) {
      const [userRows] = await pool.query('SELECT id, name, username, email, phone, photo FROM users WHERE id = ?', [complaint.user_id]);
      if (userRows.length > 0) {
        user = userRows[0];
      }
    }

    // Fetch talent details
    let talent = null;
    if (complaint.talent_id) {
      const [talentRows] = await pool.query('SELECT user_id, full_name, email, phone, photo, category, price, address FROM profiles WHERE user_id = ?', [complaint.talent_id]);
      if (talentRows.length > 0) {
        talent = talentRows[0];
      }
    }

    // Fetch booking details
    let booking = null;
    if (complaint.booking_id) {
      const [bookingRows] = await pool.query('SELECT * FROM bookings WHERE id = ?', [complaint.booking_id]);
      if (bookingRows.length > 0) {
        booking = bookingRows[0];
      }
    }

    res.status(200).json({
      complaint: {
        id: complaint.id,
        userId: complaint.user_id,
        userName: complaint.user_name,
        userEmail: complaint.user_email,
        userPhone: complaint.user_phone,
        bookingId: complaint.booking_id,
        talentId: complaint.talent_id,
        talentName: complaint.talent_name,
        subject: complaint.subject,
        description: complaint.description,
        urgency: complaint.urgency,
        status: complaint.status,
        proofImage: complaint.proof_image,
        atFault: complaint.at_fault,
        adminNotes: complaint.admin_notes,
        createdAt: complaint.created_at,
        updatedAt: complaint.updated_at,
      },
      booking,
      chat,
      messages,
      user: user || {
        id: complaint.user_id,
        name: complaint.user_name,
        email: complaint.user_email,
        phone: complaint.user_phone,
      },
      talent: talent || {
        user_id: complaint.talent_id,
        full_name: complaint.talent_name,
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat riwayat percakapan komplain.', error: error.message });
  }
});

app.put('/api/complaints/:id', async (req, res) => {
  try {
    const allowedStatuses = ['pending', 'in-progress', 'resolved'];
    const { status, atFault, adminNotes } = req.body || {};
    
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Status komplain tidak valid.' });
    }

    const [rows] = await pool.query('SELECT * FROM complaints WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Komplain tidak ditemukan.' });
    
    const complaint = rows[0];

    const newStatus = status || complaint.status;
    const newAtFault = atFault !== undefined ? atFault : complaint.at_fault;
    const newAdminNotes = adminNotes !== undefined ? adminNotes : complaint.admin_notes;

    await pool.query(
      'UPDATE complaints SET status = ?, at_fault = ?, admin_notes = ? WHERE id = ?',
      [newStatus, newAtFault, newAdminNotes, req.params.id]
    );

    const bookingSnippet = complaint.booking_id ? `#${String(complaint.booking_id).slice(0, 8)}` : '';

    // If resolved and mitra is at fault, add strike and calculate sanction
    if (newStatus === 'resolved' && newAtFault === 'mitra') {
      const violationId = crypto.randomUUID();
      try {
        await pool.query(
          `INSERT INTO mitra_booking_violations (id, booking_id, mitra_id, reason, created_at)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [violationId, complaint.booking_id, complaint.talent_id, `Komplain Terbukti Bersalah: ${newAdminNotes || 'Pelanggaran tugas mitra'}`]
        );

        // Calculate strikes for mitra
        if (complaint.talent_id) {
          const [[counts]] = await pool.query(
            `SELECT
               SUM(created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY)) AS strikes_60_days,
               COUNT(*) AS strikes_90_days
             FROM mitra_booking_violations
             WHERE mitra_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)`,
            [complaint.talent_id]
          );
          const strikes60 = Number(counts.strikes_60_days || 0);
          const strikes90 = Number(counts.strikes_90_days || 0);
          const suspensionDays = strikes90 >= 5 ? 30 : strikes60 >= 3 ? 7 : 0;

          if (suspensionDays > 0) {
            await pool.query(
              `INSERT INTO mitra_sanctions (mitra_id, suspended_until)
               VALUES (?, DATE_ADD(NOW(), INTERVAL ${suspensionDays} DAY))
               ON DUPLICATE KEY UPDATE
                 suspended_until = GREATEST(COALESCE(suspended_until, NOW()), DATE_ADD(NOW(), INTERVAL ${suspensionDays} DAY))`,
              [complaint.talent_id]
            );
          }
        }
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') {
          console.error('Error inserting violation:', err);
        }
      }

      // Send notifications to both
      if (complaint.talent_id) {
        await pool.query(
          `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
           VALUES (?, ?, ?, ?, 'danger', 0, CURRENT_TIMESTAMP)`,
          [
            crypto.randomUUID(),
            complaint.talent_id,
            'Peringatan Pelanggaran Komplain',
            `Admin telah memeriksa bukti & riwayat chat pesanan ${bookingSnippet}. Anda dinyatakan bersalah (+1 Poin Pelanggaran). Catatan Admin: ${newAdminNotes || '-'}`
          ]
        ).catch(() => {});
      }

      if (complaint.user_id) {
        await pool.query(
          `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
           VALUES (?, ?, ?, ?, 'success', 0, CURRENT_TIMESTAMP)`,
          [
            crypto.randomUUID(),
            complaint.user_id,
            'Komplain Anda Telah Diterima & Diselesaikan',
            `Admin telah memverifikasi bukti dan riwayat pesan untuk pesanan ${bookingSnippet}. Mitra (${complaint.talent_name}) telah diberikan sanksi pelanggaran. Catatan Admin: ${newAdminNotes || '-'}`
          ]
        ).catch(() => {});
      }
    } else if (newStatus === 'resolved' && newAtFault === 'user') {
      // User is at fault!
      if (complaint.user_id) {
        await pool.query(
          `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
           VALUES (?, ?, ?, ?, 'warning', 0, CURRENT_TIMESTAMP)`,
          [
            crypto.randomUUID(),
            complaint.user_id,
            'Peringatan: Pelanggaran Pengguna',
            `Setelah meninjau bukti dan riwayat percakapan pada pesanan ${bookingSnippet}, laporan komplain Anda dinyatakan ditolak / terjadi pelanggaran oleh pihak pengguna. Catatan Admin: ${newAdminNotes || '-'}`
          ]
        ).catch(() => {});
      }

      if (complaint.talent_id) {
        await pool.query(
          `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
           VALUES (?, ?, ?, ?, 'success', 0, CURRENT_TIMESTAMP)`,
          [
            crypto.randomUUID(),
            complaint.talent_id,
            'Laporan Komplain Ditolak (Mitra Bebas Sanksi)',
            `Admin telah meninjau riwayat percakapan untuk pesanan ${bookingSnippet}. Anda dinyatakan tidak bersalah dan reputasi Anda tetap aman.`
          ]
        ).catch(() => {});
      }
    } else if (newStatus === 'resolved' && newAtFault === 'none') {
      // Neutral resolution
      const neutralMessage = `Komplain pesanan ${bookingSnippet} telah diselesaikan oleh Admin secara damai dan netral tanpa sanksi. Catatan Admin: ${newAdminNotes || '-'}`;
      if (complaint.user_id) {
        await pool.query(
          `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
           VALUES (?, ?, ?, ?, 'info', 0, CURRENT_TIMESTAMP)`,
          [crypto.randomUUID(), complaint.user_id, 'Komplain Telah Diselesaikan', neutralMessage]
        ).catch(() => {});
      }
      if (complaint.talent_id) {
        await pool.query(
          `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
           VALUES (?, ?, ?, ?, 'info', 0, CURRENT_TIMESTAMP)`,
          [crypto.randomUUID(), complaint.talent_id, 'Komplain Telah Diselesaikan', neutralMessage]
        ).catch(() => {});
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Status komplain gagal diperbarui.', error: error.message });
  }
});

// =================================================================
// ADMIN LOGIN AUTHENTICATION
// =================================================================
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body || {};
  const validEmails = ['admin@rentmate.com', 'admin@temanacara.com', 'admin'];
  const validPasswords = ['admin123', 'admin', 'admin@123', 'password'];

  if (
    (validEmails.includes(email?.trim()?.toLowerCase()) || email?.toLowerCase()?.includes('admin')) &&
    validPasswords.includes(password?.trim())
  ) {
    return res.status(200).json({ success: true, message: 'Login admin berhasil', token: 'admin_session_token' });
  }

  return res.status(401).json({ message: 'Email atau password admin salah!' });
});

// =================================================================
// FINANCIAL SUMMARY (STATISTIK KEUANGAN & DANA MENGENDAP USER)
// =================================================================
app.get('/api/admin/financial-summary', async (req, res) => {
  try {
    // 1. Total saldo mengendap di seluruh dompet pengguna saat ini
    const [userWalletRows] = await pool.query('SELECT COALESCE(SUM(wallet), 0) AS total_user_wallet, COUNT(id) AS total_users FROM users');
    const totalUserWallet = Number(userWalletRows[0]?.total_user_wallet || 0);
    const totalRegisteredUsers = Number(userWalletRows[0]?.total_users || 0);

    // 2. Total top-up disetujui (Kas masuk dari top-up)
    const [topupApprovedRows] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS total_approved_topup, COUNT(id) AS approved_count FROM topup_requests WHERE status = 'approved'");
    const totalApprovedTopup = Number(topupApprovedRows[0]?.total_approved_topup || 0);
    const approvedTopupCount = Number(topupApprovedRows[0]?.approved_count || 0);

    // 3. Pending top-up
    const [topupPendingRows] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS pending_amount, COUNT(id) AS pending_count FROM topup_requests WHERE status = 'pending'");
    const pendingTopupAmount = Number(topupPendingRows[0]?.pending_amount || 0);
    const pendingTopupCount = Number(topupPendingRows[0]?.pending_count || 0);

    // 4. Withdrawal approved & pending
    const [wdApprovedRows] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS total_approved_wd, COUNT(id) AS approved_count FROM withdrawal_requests WHERE status = 'approved'");
    const totalApprovedWithdrawal = Number(wdApprovedRows[0]?.total_approved_wd || 0);
    const approvedWithdrawalCount = Number(wdApprovedRows[0]?.approved_count || 0);

    const [wdPendingRows] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS pending_amount, COUNT(id) AS pending_count FROM withdrawal_requests WHERE status = 'pending'");
    const pendingWithdrawalAmount = Number(wdPendingRows[0]?.pending_amount || 0);
    const pendingWithdrawalCount = Number(wdPendingRows[0]?.pending_count || 0);

    // 5. Total komisi admin dari booking selesai (20%)
    const [bookingRows] = await pool.query("SELECT COALESCE(SUM(total), 0) AS total_gross_booking FROM bookings WHERE approval_status IN ('completed', 'approved')");
    const totalGrossBooking = Number(bookingRows[0]?.total_gross_booking || 0);
    const totalCommissionRevenue = Math.round(totalGrossBooking * 0.20);

    // 6. Total Kas Fisik di Rekening / QRIS Admin:
    // Dana Mengendap Pengguna (Saldo Dompet) + Total Komisi Platform (20%)
    const totalAdminTreasury = totalUserWallet + totalCommissionRevenue;

    res.status(200).json({
      totalUserWallet,
      totalRegisteredUsers,
      totalApprovedTopup,
      approvedTopupCount,
      pendingTopupAmount,
      pendingTopupCount,
      totalApprovedWithdrawal,
      approvedWithdrawalCount,
      pendingWithdrawalAmount,
      pendingWithdrawalCount,
      totalGrossBooking,
      totalCommissionRevenue,
      totalAdminTreasury
    });
  } catch (error) {
    console.error('Error getting financial summary:', error);
    res.status(500).json({ error: error.message });
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
// WITHDRAWAL REQUESTS (PENARIKAN SALDO)
// =================================================================
app.get('/api/withdrawal-requests', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT w.*, u.photo AS user_avatar
       FROM withdrawal_requests AS w
       LEFT JOIN users AS u ON u.id = w.user_id
       ORDER BY w.created_at DESC`
    );
    const formatted = rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      userEmail: r.user_email,
      userPhoto: r.user_photo || r.user_avatar || '',
      role: r.role || 'user',
      amount: Number(r.amount),
      bankName: r.bank_name,
      accountNumber: r.account_number,
      accountName: r.account_name,
      status: r.status,
      proofImageBase64: r.proof_image,
      adminNote: r.admin_note,
      createdAt: r.created_at,
      processedAt: r.processed_at
    }));
    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/withdrawal-requests/user/:userId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM withdrawal_requests WHERE user_id = ? ORDER BY created_at DESC`,
      [req.params.userId]
    );
    const formatted = rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      userEmail: r.user_email,
      userPhoto: r.user_photo || '',
      role: r.role || 'user',
      amount: Number(r.amount),
      bankName: r.bank_name,
      accountNumber: r.account_number,
      accountName: r.account_name,
      status: r.status,
      proofImageBase64: r.proof_image,
      adminNote: r.admin_note,
      createdAt: r.created_at,
      processedAt: r.processed_at
    }));
    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/withdrawal-requests', async (req, res) => {
  try {
    const { id, userId, userName, userEmail, userPhoto, role = 'user', amount, bankName, accountNumber, accountName } = req.body;
    
    const parsedAmount = Number(amount);
    if (!userId || !parsedAmount || parsedAmount <= 0 || !bankName || !accountNumber || !accountName) {
      return res.status(400).json({ error: 'Data penarikan saldo tidak lengkap atau nominal tidak valid' });
    }

    // 1. Cek saldo dompet jika role adalah user biasa dan terdaftar di database
    if (role === 'user') {
      const [userRows] = await pool.query('SELECT wallet FROM users WHERE id = ?', [userId]);
      if (userRows.length > 0) {
        const currentWallet = Number(userRows[0].wallet || 0);
        // Hitung total penarikan yang masih berstatus pending untuk user ini
        const [pendingRows] = await pool.query(
          "SELECT COALESCE(SUM(amount), 0) AS pending_total FROM withdrawal_requests WHERE user_id = ? AND status = 'pending'",
          [userId]
        );
        const pendingAmount = Number(pendingRows[0]?.pending_total || 0);
        const availableWallet = Math.max(0, currentWallet - pendingAmount);

        if (availableWallet < parsedAmount) {
          const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
          return res.status(400).json({
            error: `Saldo tidak mencukupi untuk penarikan ini. Saldo tersedia yang belum diajukan tarik: ${fmt(availableWallet)}.`
          });
        }
        // Catatan: Saldo dompet TIDAK langsung dipotong di sini, melainkan tetap utuh
        // dan baru dipotong setelah Admin memverifikasi dan menyetujui (transfer).
      }
    }

    const reqId = id || `wd_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const initialStatus = role === 'admin' ? 'approved' : 'pending';
    const processedAt = role === 'admin' ? new Date() : null;
    const adminNote = role === 'admin' ? 'Pencairan laba komisi platform (Admin Profit)' : null;

    // 2. Simpan permintaan penarikan
    await pool.query(
      `INSERT INTO withdrawal_requests 
       (id, user_id, user_name, user_email, user_photo, role, amount, bank_name, account_number, account_name, status, admin_note, created_at, processed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
      [reqId, userId, userName, userEmail, userPhoto || null, role, parsedAmount, bankName, accountNumber, accountName, initialStatus, adminNote, processedAt]
    );

    // 3. Buat notifikasi jika bukan pencairan profit admin mandiri
    if (role !== 'admin') {
      const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
      const notifId = crypto.randomUUID();
      try {
        await pool.query(
          `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
          [
            notifId,
            userId,
            role === 'mitra' ? 'Permintaan Pencairan Pendapatan Terkirim ⏳' : 'Permintaan Tarik Saldo Terkirim ⏳',
            `Permintaan penarikan saldo sebesar ${fmt(parsedAmount)} ke ${bankName} (${accountNumber} a.n ${accountName}) telah dikirim dan sedang menunggu transfer dari Admin. Saldo dompet akan dipotong setelah Admin menyetujui transfer.`,
            'payment'
          ]
        );
      } catch (notifErr) {
        console.warn('Gagal mencatat notifikasi penarikan:', notifErr.message);
      }
    }

    res.status(201).json({
      id: reqId,
      userId,
      userName,
      userEmail,
      userPhoto,
      role,
      amount: parsedAmount,
      bankName,
      accountNumber,
      accountName,
      status: initialStatus,
      adminNote,
      createdAt: new Date().toISOString(),
      processedAt: processedAt ? processedAt.toISOString() : undefined
    });
  } catch (error) {
    console.error('Error submitting withdrawal request:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/withdrawal-requests/:id/approve', async (req, res) => {
  try {
    const { adminNote, proofImageBase64 } = req.body;
    const [rows] = await pool.query('SELECT * FROM withdrawal_requests WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Permintaan penarikan tidak ditemukan' });

    const withdrawal = rows[0];
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: 'Permintaan ini sudah diproses sebelumnya' });
    }

    // 1. Update status ke approved
    await pool.query(
      `UPDATE withdrawal_requests SET status = 'approved', admin_note = ?, proof_image = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [adminNote || 'Penarikan telah berhasil ditransfer oleh Admin', proofImageBase64 || null, req.params.id]
    );

    // 2. Potong saldo dompet pengguna SEKARANG setelah disetujui Admin!
    if (withdrawal.role === 'user') {
      await pool.query(
        'UPDATE users SET wallet = GREATEST(0, wallet - ?) WHERE id = ?',
        [withdrawal.amount, withdrawal.user_id]
      );
    }

    // 3. Kirim notifikasi sukses ke user/mitra
    const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
    const notifId = crypto.randomUUID();
    try {
      await pool.query(
        `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
        [
          notifId,
          withdrawal.user_id,
          withdrawal.role === 'mitra' ? 'Pencairan Pendapatan Mitra Berhasil! 💸' : 'Penarikan Saldo Berhasil & Dipotong! 💸',
          `Dana penarikan sebesar ${fmt(withdrawal.amount)} telah berhasil ditransfer ke rekening ${withdrawal.bank_name} (${withdrawal.account_number} a.n ${withdrawal.account_name}). Saldo dompet Anda telah resmi dipotong.`,
          'payment'
        ]
      );
    } catch (notifErr) {
      console.warn('Gagal mencatat notifikasi approval:', notifErr.message);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/withdrawal-requests/:id/reject', async (req, res) => {
  try {
    const { adminNote } = req.body;
    const [rows] = await pool.query('SELECT * FROM withdrawal_requests WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Permintaan penarikan tidak ditemukan' });

    const withdrawal = rows[0];
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: 'Permintaan ini sudah diproses sebelumnya' });
    }

    // 1. Update status ke rejected
    await pool.query(
      `UPDATE withdrawal_requests SET status = 'rejected', admin_note = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [adminNote || 'Permintaan penarikan ditolak oleh Admin', req.params.id]
    );

    // 2. Karena saldo TIDAK dipotong saat pengajuan (masih utuh),
    // maka tidak perlu menambah/mengembalikan saldo lagi.

    // 3. Kirim notifikasi penolakan ke user/mitra
    const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
    const notifId = crypto.randomUUID();
    try {
      await pool.query(
        `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
        [
          notifId,
          withdrawal.user_id,
          withdrawal.role === 'mitra' ? 'Pencairan Pendapatan Ditolak ⚠️' : 'Penarikan Saldo Ditolak ⚠️',
          `Permintaan penarikan sebesar ${fmt(withdrawal.amount)} ditolak. Alasan: ${adminNote || 'Informasi rekening/tujuan tidak valid'}. Saldo dompet kamu tetap utuh dan tidak terpotong.`,
          'admin'
        ]
      );
    } catch (notifErr) {
      console.warn('Gagal mencatat notifikasi reject:', notifErr.message);
    }

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

  try {
    const [complaintCols] = await pool.query('DESCRIBE complaints');
    const cNames = complaintCols.map(c => c.Field);
    if (!cNames.includes('proof_image')) await pool.query('ALTER TABLE complaints ADD COLUMN proof_image LONGTEXT NULL AFTER status');
    if (!cNames.includes('at_fault')) await pool.query("ALTER TABLE complaints ADD COLUMN at_fault VARCHAR(50) DEFAULT 'none' AFTER status");
    if (!cNames.includes('admin_notes')) await pool.query('ALTER TABLE complaints ADD COLUMN admin_notes TEXT NULL AFTER at_fault');
  } catch (err) {
    console.error('Migration complaints error:', err.message);
  }

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mitra_booking_violations (
      id VARCHAR(36) PRIMARY KEY,
      booking_id VARCHAR(36) NOT NULL UNIQUE,
      mitra_id VARCHAR(36) NOT NULL,
      reason VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_mitra_violations_window (mitra_id, created_at)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mitra_sanctions (
      mitra_id VARCHAR(36) PRIMARY KEY,
      suspended_until DATETIME NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  for (const [column, definition] of [
    ['mitra_response_deadline', 'DATETIME NULL'],
    ['rejection_reason', 'TEXT NULL'],
  ]) {
    try {
      await pool.query(`ALTER TABLE bookings ADD COLUMN ${column} ${definition}`);
    } catch (error) {
      if (!String(error.message || '').toLowerCase().includes('duplicate')) throw error;
    }
  }

  for (const [column, definition] of [
    ['attachment_type', 'VARCHAR(20) NULL'],
    ['attachment_url', 'TEXT NULL'],
    ['latitude', 'DECIMAL(10,7) NULL'],
    ['longitude', 'DECIMAL(10,7) NULL'],
  ]) {
    try {
      await pool.query(`ALTER TABLE messages ADD COLUMN ${column} ${definition}`);
    } catch (error) {
      if (!String(error.message || '').toLowerCase().includes('duplicate')) throw error;
    }
  }

  await removeDuplicateBookingWelcomeMessages();

  // Database lama mungkin belum memiliki kolom lokasi pertemuan.
  try {
    await pool.query('ALTER TABLE bookings ADD COLUMN meeting_city VARCHAR(255) NULL');
  } catch (error) {
    // Error duplicate column berarti kolom sudah tersedia, aman diabaikan.
    if (!String(error.message || '').toLowerCase().includes('duplicate')) throw error;
  }
}

async function ensureMitraPricingColumns() {
  for (const column of ['service_rates', 'pending_service_rates', 'supported_activities', 'hobbies', 'specialist_skills']) {
    try {
      await pool.query(`ALTER TABLE profiles ADD COLUMN ${column} LONGTEXT NULL`);
    } catch (error) {
      if (!String(error.message || '').toLowerCase().includes('duplicate')) throw error;
    }
  }

  const [legacyProfiles] = await pool.query(
    `SELECT user_id, category, hobbies, specialist_skills, description
     FROM profiles
     WHERE supported_activities IS NULL
        OR supported_activities = ''
        OR supported_activities = '[]'`
  );
  for (const profile of legacyProfiles) {
    const activities = inferLegacyActivities(profile);
    await pool.query(
      `UPDATE profiles SET supported_activities = ?
       WHERE user_id = ?
         AND (supported_activities IS NULL OR supported_activities = '' OR supported_activities = '[]')`,
      [JSON.stringify(activities), profile.user_id]
    );
  }
}

const PORT = process.env.PORT || 3001;
ensureTopUpTable()
  .then(() => ensureMitraPricingColumns())
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