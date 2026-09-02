import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Send, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Report() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    category: "",
    subject: "",
    description: "",
    urgency: "normal"
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simpan laporan ke localStorage untuk demo
      const reports = JSON.parse(localStorage.getItem("lovable_reports") || "[]");
      const newReport = {
        id: Date.now().toString(),
        ...formData,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      reports.push(newReport);
      localStorage.setItem("lovable_reports", JSON.stringify(reports));
      
      // Kirim notifikasi ke admin (dalam implementasi nyata, ini akan mengirim ke backend)
      window.dispatchEvent(new CustomEvent('newReport', { detail: { report: newReport } }));
      
      toast({
        title: "Laporan Terkirim",
        description: "Laporan Anda telah berhasil dikirim dan akan ditinjau oleh tim admin.",
      });
      
      // Redirect kembali ke halaman bantuan
      navigate("/mitra/help");
    } catch (error) {
      console.error("Error submitting report:", error);
      toast({
        title: "Gagal Mengirim Laporan",
        description: "Terjadi kesalahan saat mengirim laporan. Silakan coba lagi.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm pt-20 pb-16">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/mitra/help")}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Buat Laporan</h1>
            <p className="text-muted-foreground">Laporkan masalah atau keluhan Anda kepada tim admin</p>
          </div>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informasi Pribadi */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Informasi Pribadi
              </h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Lengkap</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Masukkan nama lengkap Anda"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="nama@example.com"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Nomor Telepon</Label>
                <Input
  id="phone"
  name="phone"
  type="tel"
  value={formData.phone}
  onChange={(e) => {
    const onlyNumbers = e.target.value.replace(/[^0-9]/g, "");
    setFormData(prev => ({
      ...prev,
      phone: onlyNumbers
    }));
  }}
  placeholder="081234567890"
  required
/>

              </div>
            </div>

            {/* Detail Laporan */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Detail Laporan</h2>
              
              <div className="space-y-2">
                <Label htmlFor="category">Kategori Laporan</Label>
                <Select onValueChange={(value) => handleSelectChange("category", value)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori laporan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Masalah Teknis</SelectItem>
                    <SelectItem value="user">Keluhan Pengguna</SelectItem>
                    <SelectItem value="payment">Masalah Pembayaran</SelectItem>
                    <SelectItem value="account">Akun Mitra</SelectItem>
                    <SelectItem value="safety">Keamanan & Keselamatan</SelectItem>
                    <SelectItem value="other">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subject">Subjek Laporan</Label>
                <Input
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="Judul singkat masalah Anda"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="urgency">Tingkat Urgensi</Label>
                <Select onValueChange={(value) => handleSelectChange("urgency", value)} defaultValue="normal">
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tingkat urgensi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Rendah</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Tinggi</SelectItem>
                    <SelectItem value="critical">Kritis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi Laporan</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Jelaskan secara detail masalah atau keluhan Anda..."
                  rows={5}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate("/mitra/help")}
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Kirim Laporan
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}