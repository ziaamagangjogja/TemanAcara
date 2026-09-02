// src/utils/googleDrive.ts

// Fungsi untuk mengonversi URL Google Drive menjadi URL gambar langsung
export function convertGoogleDriveUrl(url: string): string {
  try {
    // Tangani berbagai format URL Google Drive
    // Format 1: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const fileId = match[1];
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    
    // Format 2: https://drive.google.com/open?id=FILE_ID
    match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const fileId = match[1];
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    
    // Format 3: https://lh3.googleusercontent.com/... (URL langsung gambar)
    if (url.includes("googleusercontent.com")) {
      return url;
    }
    
    // Jika URL sudah dalam format yang benar, kembalikan apa adanya
    if (url.includes("uc?export=view")) {
      return url;
    }
    
    // Jika tidak cocok dengan pola Google Drive, kembalikan URL asli
    return url;
  } catch (error) {
    console.error("Error converting Google Drive URL:", error);
    return url;
  }
}