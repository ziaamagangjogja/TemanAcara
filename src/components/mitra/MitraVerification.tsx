// src/components/mitra/MitraVerification.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentMitra, updateMitraVerification, getPendingVerifications } from '@/lib/mitraStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function MitraVerification() {
  const [documents, setDocuments] = useState({
    ktp: null,
    kk: null,
    selfie: null,
    sim: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState({
    ktp: null,
    kk: null,
    selfie: null,
    sim: null,
  });
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const currentMitra = getCurrentMitra();

  // Check if verification documents are already submitted
  useEffect(() => {
    if (currentMitra && currentMitra.verificationDocuments) {
      const hasDocuments = Object.values(currentMitra.verificationDocuments).some(doc => doc !== null);
      if (hasDocuments) {
        setIsAlreadySubmitted(true);
        setDocuments(currentMitra.verificationDocuments);
      }
    }
  }, [currentMitra]);

  const handleFileUpload = (docType, file) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File terlalu besar",
        description: "Ukuran file maksimal 5MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      setDocuments(prev => ({
        ...prev,
        [docType]: result
      }));
      setUploadedFiles(prev => ({
        ...prev,
        [docType]: file
      }));
    };
    reader.readAsDataURL(file);
  };

 // src/components/mitra/MitraVerification.tsx

// ... kode lainnya ...

  const handleSubmit = async () => {
    // Validate at least KTP is uploaded
    if (!documents.ktp) {
      toast({
        title: "KTP wajib diupload",
        description: "Upload KTP untuk verifikasi akun Anda",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Pastikan kita mengirim data yang benar
      const result = await updateMitraVerification(currentMitra.id, documents);
      
      if (result) {
        toast({
          title: "Dokumen berhasil diupload",
          description: "Silakan tunggu proses verifikasi dari admin",
        });
        setIsAlreadySubmitted(true);
        navigate('/mitra/dashboard');
      } else {
        throw new Error("Gagal mengupdate dokumen verifikasi");
      }
    } catch (error) {
      console.error("Error updating verification:", error);
      toast({
        title: "Terjadi kesalahan",
        description: "Gagal mengupload dokumen",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <Card className="p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-hero rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-orange">
            <CheckCircle className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Verifikasi Data Diri</h1>
          <p className="text-muted-foreground">
            Upload dokumen untuk verifikasi akun mitra Anda
          </p>
        </div>

        {isAlreadySubmitted && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Dokumen Sedang Diverifikasi</p>
                <p className="text-xs text-blue-700 mt-1">
                  Dokumen verifikasi Anda telah dikirim dan sedang ditinjau oleh admin. Anda akan menerima notifikasi setelah verifikasi selesai.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-6">
          {[
            { key: 'ktp', label: 'KTP (Kartu Tanda Penduduk)', required: true },
            { key: 'kk', label: 'KK (Kartu Keluarga)', required: false },
            { key: 'selfie', label: 'Foto Selfie dengan KTP', required: false },
            { key: 'sim', label: 'SIM (Surat Izin Mengemudi)', required: false }
          ].map(doc => (
            <div key={doc.key} className="space-y-2">
              <Label htmlFor={doc.key} className="flex items-center gap-2">
                {doc.label}
                {doc.required && <span className="text-red-500">*</span>}
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  id={doc.key}
                  accept="image/*"
                  onChange={(e) => handleFileUpload(doc.key, e.target.files?.[0])}
                  className="flex-1"
                  disabled={isAlreadySubmitted}
                />
                {documents[doc.key] && (
                  <div className="flex items-center gap-2">
                    <img 
                      src={documents[doc.key]} 
                      alt={doc.label}
                      className="w-16 h-16 object-cover rounded border"
                    />
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                )}
              </div>
              {uploadedFiles[doc.key] && (
                <p className="text-sm text-muted-foreground">
                  File: {uploadedFiles[doc.key].name} ({(uploadedFiles[doc.key].size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-4 mt-6">
          <h3 className="font-semibold mb-2">Petunjuk Upload:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Format file: JPG, PNG, atau PDF</li>
            <li>• Ukuran maksimal: 5MB per file</li>
            <li>• Pastikan dokumen terbaca dengan jelas</li>
            <li>• KTP wajib diupload untuk verifikasi</li>
          </ul>
        </div>

        {!isAlreadySubmitted && (
          <Button 
            onClick={handleSubmit} 
            className="w-full mt-6"
            disabled={isLoading}
          >
            {isLoading ? "Mengupload..." : "Kirim Verifikasi"}
          </Button>
        )}
      </Card>
    </div>
  );
}