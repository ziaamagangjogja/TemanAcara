// vite.config.ts
import { defineConfig } from "file:///C:/Users/Admin/Downloads/teman-acara-main/teman-acara-main/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Admin/Downloads/teman-acara-main/teman-acara-main/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///C:/Users/Admin/Downloads/teman-acara-main/teman-acara-main/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\Admin\\Downloads\\teman-acara-main\\teman-acara-main";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Proxy configuration untuk backend
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        // Backend Node.js server
        changeOrigin: true,
        secure: false,
        // Untuk development
        rewrite: (path2) => path2.replace(/^\/api/, "")
        // Hapus '/api' dari awalan path
      },
      // Tambahkan proxy khusus untuk endpoint yang tidak menggunakan /api
      "/register-talent": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false
      },
      "/login": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false
      },
      "/send-approval": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false
      },
      "/send-reminder": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false
      },
      "/pending-talents": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false
      }
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBZG1pblxcXFxEb3dubG9hZHNcXFxcdGVtYW4tYWNhcmEtbWFpblxcXFx0ZW1hbi1hY2FyYS1tYWluXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBZG1pblxcXFxEb3dubG9hZHNcXFxcdGVtYW4tYWNhcmEtbWFpblxcXFx0ZW1hbi1hY2FyYS1tYWluXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9BZG1pbi9Eb3dubG9hZHMvdGVtYW4tYWNhcmEtbWFpbi90ZW1hbi1hY2FyYS1tYWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiBcIjo6XCIsXG4gICAgcG9ydDogODA4MCxcbiAgICAvLyBQcm94eSBjb25maWd1cmF0aW9uIHVudHVrIGJhY2tlbmRcbiAgICBwcm94eToge1xuICAgICAgJy9hcGknOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMScsIC8vIEJhY2tlbmQgTm9kZS5qcyBzZXJ2ZXJcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBzZWN1cmU6IGZhbHNlLCAvLyBVbnR1ayBkZXZlbG9wbWVudFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpLywgJycpLCAvLyBIYXB1cyAnL2FwaScgZGFyaSBhd2FsYW4gcGF0aFxuICAgICAgfSxcbiAgICAgIC8vIFRhbWJhaGthbiBwcm94eSBraHVzdXMgdW50dWsgZW5kcG9pbnQgeWFuZyB0aWRhayBtZW5nZ3VuYWthbiAvYXBpXG4gICAgICAnL3JlZ2lzdGVyLXRhbGVudCc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDozMDAxJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgfSxcbiAgICAgICcvbG9naW4nOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgICAnL3NlbmQtYXBwcm92YWwnOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgICAnL3NlbmQtcmVtaW5kZXInOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgICAnL3BlbmRpbmctdGFsZW50cyc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDozMDAxJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgcGx1Z2luczogW3JlYWN0KCksIG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIiAmJiBjb21wb25lbnRUYWdnZXIoKV0uZmlsdGVyKEJvb2xlYW4pLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxuICAgIH0sXG4gIH0sXG59KSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUE0VyxTQUFTLG9CQUFvQjtBQUN6WSxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsdUJBQXVCO0FBSGhDLElBQU0sbUNBQW1DO0FBTXpDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBO0FBQUEsSUFFTixPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFFBQVE7QUFBQTtBQUFBLFFBQ1IsU0FBUyxDQUFDQSxVQUFTQSxNQUFLLFFBQVEsVUFBVSxFQUFFO0FBQUE7QUFBQSxNQUM5QztBQUFBO0FBQUEsTUFFQSxvQkFBb0I7QUFBQSxRQUNsQixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxRQUFRO0FBQUEsTUFDVjtBQUFBLE1BQ0EsVUFBVTtBQUFBLFFBQ1IsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsUUFBUTtBQUFBLE1BQ1Y7QUFBQSxNQUNBLGtCQUFrQjtBQUFBLFFBQ2hCLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFFBQVE7QUFBQSxNQUNWO0FBQUEsTUFDQSxrQkFBa0I7QUFBQSxRQUNoQixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxRQUFRO0FBQUEsTUFDVjtBQUFBLE1BQ0Esb0JBQW9CO0FBQUEsUUFDbEIsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsUUFBUTtBQUFBLE1BQ1Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUyxDQUFDLE1BQU0sR0FBRyxTQUFTLGlCQUFpQixnQkFBZ0IsQ0FBQyxFQUFFLE9BQU8sT0FBTztBQUFBLEVBQzlFLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFDRixFQUFFOyIsCiAgIm5hbWVzIjogWyJwYXRoIl0KfQo=
