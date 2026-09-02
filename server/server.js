require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Inisialisasi Supabase dengan benar
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Fungsi helper untuk membuat transporter email
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
// ENDPOINT UNTUK HEALTH CHECK
// =================================================================
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Server is running' });
});

// =================================================================
// ROUTE UNTUK PENDAFTARAN TALENT BARU
// =================================================================
app.post('/register-talent', async (req, res) => {
  const { email, password, name, phone, address, description, price, category, photo, ktp, age } = req.body;

  try {
    // 1. Buat user di tabel auth.users Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (authError) {
      throw authError;
    }

    // 2. Tambahkan data ke tabel 'profiles' kita dengan status 'pending'
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          user_id: authData.user.id,
          email: email,
          full_name: name,
          phone: phone,
          address: address,
          description: description,
          price: price,
          category: category,
          photo: photo, // Simpan foto profil sebagai base64
          ktp: ktp, // Simpan KTP sebagai link Google Drive
          age: age,
          status: 'pending', // Status awal adalah 'pending'
        },
      ]);

    if (profileError) {
      throw profileError;
    }

    console.log(`Talent baru dengan email ${email} berhasil mendaftar dan menunggu persetujuan.`);
    res.status(201).json({ message: 'Pendaftaran berhasil! Silakan tunggu persetujuan dari admin.' });

  } catch (error) {
    console.error('Error during talent registration:', error);
    res.status(400).json({ message: 'Pendaftaran gagal.', error: error.message });
  }
});

// =================================================================
// ROUTE UNTUK ADMIN: AMBIL DATA TALENT YANG MENUNGGU PERSETUJUAN
// =================================================================
app.get('/pending-talents', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'pending');
    
    if (error) throw error;
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching pending talents:', error);
    res.status(500).json({ message: 'Gagal mengambil data talent.', error: error.message });
  }
});

// =================================================================
// ROUTE UNTUK LOGIN
// =================================================================
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Lakukan autentikasi dengan Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return res.status(401).json({ message: 'Email atau password salah.' });
    }

    // 2. Setelah auth berhasil, periksa status di tabel profiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('status')
      .eq('user_id', authData.user.id)
      .single();

    if (profileError || profileData.status !== 'approved') {
      await supabase.auth.signOut();
      return res.status(403).json({ message: 'Akun Anda belum disetujui oleh admin.' });
    }
    
    // 3. Jika semua berhasil, kirim token atau data user
    res.status(200).json({ message: 'Login berhasil', user: authData.user, session: authData.session });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat login.', error: error.message });
  }
});

// =================================================================
// ROUTE UNTUK ADMIN: MENERIMA TALENT
// =================================================================
app.post('/send-approval', async (req, res) => {
  const { talentEmail, talentName, loginLink } = req.body;
  
  try {
    // 1. Kirim Email Persetujuan
    const transporter = createEmailTransporter();
    const mailOptions = {
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: talentEmail,
      subject: 'Pendaftaran Talent Disetujui - RentMate',
      html: `
        <h2>Selamat, ${talentName}!</h2>
        <p>Pendaftaran Anda sebagai talent di platform RentMate telah <strong>disetujui</strong>.</p>
        <p>Anda sekarang dapat login dan mulai menerima pesanan.</p>
        <br>
        <a href="${loginLink}" style="background-color: #4CAF50; color: white; padding: 14px 25px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px;">
          Login ke Dashboard
        </a>
        <br><br>
        <p>Terima kasih,</p>
        <p>Tim RentMate</p>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Email persetujuan berhasil dikirim ke ${talentEmail}`);

    // 2. PERBARUI STATUS DI SUPABASE
    const { data, error } = await supabase
      .from('profiles')
      .update({ status: 'approved' })
      .eq('email', talentEmail);

    if (error) {
      console.error('Gagal memperbarui status di Supabase:', error);
      throw error;
    }

    console.log(`Status talent ${talentEmail} berhasil diperbarui menjadi 'approved'.`);

    res.status(200).json({ message: 'Talent berhasil disetujui. Email telah dikirim dan status telah diperbarui.' });
  } catch (error) {
    console.error('Error in approval process:', error);
    res.status(500).json({ message: 'Gagal menyetujui talent.', error: error.message });
  }
});

// =================================================================
// ROUTE UNTUK KONFIRMASI PENDAFTARAN
// =================================================================
app.post('/send-confirmation', async (req, res) => {
  const { talentEmail, talentName, confirmationLink } = req.body;
  
  try {
    const transporter = createEmailTransporter();
    const mailOptions = {
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: talentEmail,
      subject: 'Konfirmasi Pendaftaran Talent - RentMate',
      html: `
        <h2>Halo, ${talentName}!</h2>
        <p>Terima kasih telah mendaftar sebagai talent di platform RentMate.</p>
        <p>Silakan klik link di bawah ini untuk mengkonfirmasi pendaftaran Anda:</p>
        <br>
        <a href="${confirmationLink}" style="background-color: #4CAF50; color: white; padding: 14px 25px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px;">
          Konfirmasi Pendaftaran
        </a>
        <br><br>
        <p>Terima kasih,</p>
        <p>Tim RentMate</p>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Email konfirmasi berhasil dikirim ke ${talentEmail}`);
    res.status(200).json({ message: 'Email konfirmasi berhasil dikirim' });
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    res.status(500).json({ message: 'Gagal mengirim email konfirmasi.', error: error.message });
  }
});

// =================================================================
// ROUTE UNTUK APPROVAL BOOKING
// =================================================================
app.post('/approve-booking', async (req, res) => {
  const { bookingId, status } = req.body;
  
  try {
    // Di sini seharusnya ada logika untuk memperbarui status booking di database
    // Karena kita menggunakan localStorage di frontend, kita akan mengirim notifikasi
    
    // Kirim notifikasi ke semua client yang terhubung
    res.status(200).json({ 
      message: `Booking ${bookingId} telah ${status === 'approved' ? 'disetujui' : 'ditolak'}.`,
      bookingId,
      status
    });
  } catch (error) {
    console.error('Error approving booking:', error);
    res.status(500).json({ message: 'Gagal memperbarui status booking.', error: error.message });
  }
});

// =================================================================
// ROUTE LAINNYA (TIDAK DIUBAH)
// =================================================================
app.post('/send-reminder', async (req, res) => {
  const { talentEmail, talentName, reminderType } = req.body;
  
  try {
    const transporter = createEmailTransporter();
    await transporter.verify();
    console.log("Server is ready to take our messages");

    const subject = reminderType === 'verification' 
      ? 'Pengingat Verifikasi - RentMate' 
      : 'Pengingat dari RentMate';

    const mailOptions = {
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: talentEmail,
      subject: subject,
      html: `
        <h2>Halo, ${talentName}!</h2>
        <p>Ini adalah pengingat dari RentMate.</p>
        <p>Silakan lengkapi proses verifikasi akun Anda untuk dapat mulai menggunakan platform.</p>
        <br>
        <p>Terima kasih,</p>
        <p>Tim RentMate</p>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Email pengingat berhasil dikirim ke ${talentEmail}`);
    res.status(200).json({ message: 'Email pengingat berhasil dikirim' });
  } catch (error) {
    console.error('Error sending reminder email:', error);
    res.status(500).json({ message: 'Gagal mengirim email pengingat.', error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});