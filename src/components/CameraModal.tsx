import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, Check, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const { toast } = useToast();

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  }, []);

  // Effect HANYA dipicu saat isOpen berubah (buka / tutup dialog)
  // Tidak akan re-trigger saat parent re-render, sehingga kamera tidak kedip-kedip (blinking loop)
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    let isMounted = true;
    setCapturedImage(null);
    setIsCameraReady(false);

    const initCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
          title: "Kamera Tidak Didukung",
          description: "Browser tidak mendukung akses kamera secara langsung.",
          variant: "destructive"
        });
        onCloseRef.current();
        return;
      }

      try {
        let mediaStream: MediaStream;
        try {
          // Preferensi ideal environment (HP) atau webcam laptop
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
          });
        } catch {
          // Fallback laptop jika constraint ditolak
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }

        if (!isMounted) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play().catch(() => {});
        }
        setIsCameraReady(true);
      } catch (err) {
        console.error("Camera access error:", err);
        if (isMounted) {
          toast({
            title: "Izin Kamera Dibutuhkan",
            description: "Pastikan Anda mengizinkan akses kamera di browser Anda.",
            variant: "destructive"
          });
          onCloseRef.current();
        }
      }
    };

    void initCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, stopCamera, toast]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        if (dataUrl && dataUrl.length > 200) {
          setCapturedImage(dataUrl);
        }
      } catch (err) {
        console.error("Failed to capture image:", err);
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const confirmPhoto = () => {
    if (!capturedImage) return;

    fetch(capturedImage)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        stopCamera();
        onCapture(file);
        onClose();
      })
      .catch((err) => {
        console.error("Error confirming photo:", err);
        toast({
          title: "Gagal Mengambil Foto",
          description: "Terjadi kesalahan saat memproses foto.",
          variant: "destructive"
        });
      });
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      stopCamera();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-md p-4">
        <DialogHeader>
          <DialogTitle>Ambil Foto</DialogTitle>
          <DialogDescription>Gunakan kamera Anda untuk mengambil gambar.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
            {/* Video element tetap di DOM agar ref dan video stream tetap stabil tanpa kedip */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${capturedImage ? 'hidden' : 'block'}`}
            />
            {capturedImage && (
              <img
                src={capturedImage}
                alt="Hasil Foto"
                className="w-full h-full object-cover"
              />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="flex justify-center gap-2">
            {!capturedImage ? (
              <Button
                type="button"
                onClick={capturePhoto}
                disabled={!isCameraReady}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 rounded-xl shadow-md transition-all active:scale-95"
              >
                <Camera className="w-4 h-4 mr-2" /> Jepret
              </Button>
            ) : (
              <div className="flex gap-2 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={retakePhoto}
                  className="flex-1 rounded-xl py-2"
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> Ulangi
                </Button>
                <Button
                  type="button"
                  onClick={confirmPhoto}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl py-2 shadow-md"
                >
                  <Check className="w-4 h-4 mr-2" /> Gunakan Foto
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
