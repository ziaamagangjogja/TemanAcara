import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Proxy configuration untuk backend
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // Backend Node.js server
        changeOrigin: true,
        secure: false, // Untuk development
        rewrite: (path) => path.replace(/^\/api/, ''), // Hapus '/api' dari awalan path
      },
      // Tambahkan proxy khusus untuk endpoint yang tidak menggunakan /api
      '/register-talent': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/login': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
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