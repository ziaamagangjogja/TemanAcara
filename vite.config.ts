import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Jangan biarkan Vite berpindah port otomatis. Jika 8080 terpakai,
    // Vite akan gagal start dengan pesan jelas, bukan diam-diam pindah ke
    // port lain (yang sebelumnya membuat URL mitra/user tidak bisa diakses).
    strictPort: true,
    // Proxy configuration untuk backend
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // Backend Node.js server
        changeOrigin: true,
        secure: false, // Untuk development
      },
      // Tambahkan proxy khusus untuk endpoint yang tidak menggunakan /api
      '/register-talent': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      // Catatan penting: route SPA "/login" (halaman login user) harus dilayani
      // Vite sebagai halaman. Proxy HANYA meneruskan POST /login (endpoint login
      // mitra di backend). Tanpa pembatasan method ini, membuka /login langsung
      // akan diproxy ke backend dan mengembalikan 404 "Cannot GET /login",
      // sehingga halaman login user tidak pernah bisa diakses.
      '/login': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        bypass: (req) => {
          if (req.method !== 'POST') return req.url; // biarkan SPA yang menangani GET
          return null;
        },
      },
      '/send-approval': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/send-reminder': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/pending-talents': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));