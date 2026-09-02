// src/pages/mitra/MitraAsBookerChat.tsx

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Loader2, Check, CheckCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Import fungsi chat yang sama
import {
  getChatSessionByBookingId,
  sendUserMessage,
  subscribeToChats,
  markMessagesAsReadByUser,
  setUserTyping,
  ChatMessage,
} from "@/lib/chatStore";
import { getCurrentMitra } from "@/lib/mitraStore";

export default function MitraAsBookerChatPage() {
  const navigate = useNavigate();
  const { bookingId } = useParams<{ bookingId: string }>();
  const { toast } = useToast();

  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // STATE
  const [session, setSession] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Dapatkan data mitra yang sedang login
  const currentMitra = getCurrentMitra();

  // Fungsi untuk memuat sesi chat spesifik
  const loadSession = useCallback(() => {
    if (!bookingId) return;
    console.log("MitraAsBookerChat: Loading session for booking ID:", bookingId);
    
    const chatSession = getChatSessionByBookingId(bookingId);
    console.log("MitraAsBookerChat: Found session:", chatSession);
    
    setSession(chatSession);
    setIsLoading(false);
  }, [bookingId]);

  // Fungsi untuk scroll ke bawah
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 100);
  }, []);

  // Fungsi untuk menangani typing
  const handleTyping = useCallback((value: string) => {
    setMessage(value);
    if (!session) return;

    if (!isTyping) {
      setIsTyping(true);
      setUserTyping(session.bookingId, true);
    }

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      setIsTyping(false);
      setUserTyping(session.bookingId, false);
    }, 800);
  }, [session?.bookingId, isTyping]);

  // Fungsi untuk mengirim pesan
  const handleSend = useCallback(async () => {
    if (!session || !message.trim()) return;

    const text = message.trim();
    console.log("MitraAsBookerChat: Sending message...");
    setMessage("");
    setIsSending(true);

    try {
      // Gunakan sendUserMessage dengan parameter khusus untuk mitra sebagai booker
      // PERBAIKAN: Gunakan ID mitra yang sedang login dan tipe 'mitra-as-booker'
      const result = sendUserMessage(
        currentMitra?.talentId || '', 
        text, 
        session.bookingId, 
        'mitra-as-booker'
      );
      
      if (result) {
        console.log("MitraAsBookerChat: Message sent.");
      } else {
        toast({
          title: "Gagal Mengirim",
          description: "Pesan tidak terkirim. Silakan refresh halaman.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("MitraAsBookerChat: Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  }, [session, message, toast, currentMitra]);

  // Effects
  useEffect(() => {
    if (!currentMitra) {
      navigate('/mitra/login');
      return;
    }
    loadSession();
  }, [currentMitra?.id, navigate, loadSession]);

  useEffect(() => {
    const unsub = subscribeToChats(() => {
      console.log("MitraAsBookerChat: Chat update received, reloading session...");
      loadSession();
    });

    return () => unsub();
  }, [loadSession]);

  useEffect(() => {
    if (session) {
      // Tandai pesan sebagai telah dibaca oleh mitra (sebagai booker)
      markMessagesAsReadByUser(session.bookingId);
    }
    scrollToBottom();
  }, [session?.bookingId, scrollToBottom]);

  // Helper functions
  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

  // PERBAIKAN: Komponen StatusIcon yang diperbarui untuk menampilkan status pesan dengan benar
  const StatusIcon = ({ msg, isMe }: { msg: ChatMessage; isMe: boolean }) => {
    // Hanya tampilkan status untuk pesan dari pengguna saat ini
    if (!isMe) return null;
    
    // Status sent: satu centang abu-abu
    if (msg.status === "sent") return <Check className="w-4 h-4 text-gray-400" />;
    
    // Status delivered: dua centang abu-abu
    if (msg.status === "delivered")
      return <CheckCheck className="w-4 h-4 text-gray-400" />;
    
    // Status read: dua centang biru
    if (msg.status === "read")
      return <CheckCheck className="w-4 h-4 text-blue-500" />;
    
    return null;
  };

  // Render Logic
  if (!currentMitra) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-primary mx-auto mb-4" />
          <p>Memuat percakapan...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Percakapan tidak ditemukan</h2>
          <p className="text-muted-foreground">Percakapan untuk booking ini tidak tersedia.</p>
          <Button className="mt-4" onClick={() => navigate('/mitra/dashboard')}>Kembali ke Dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="container max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <img src={session.talentPhoto} alt={session.talentName} className="w-10 h-10 rounded-full object-cover border" />
            <div>
              <h3 className="font-semibold">{session.talentName}</h3>
              <p className="text-sm text-muted-foreground">{session.purpose} • {session.duration} jam</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground ml-auto">
            {session.date} • {session.time}
          </div>
        </div>
        <Card className="h-[600px] flex flex-col">
          <CardContent ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {session.messages.map((msg: ChatMessage) => {
              // PERUBAHAN KRUSIAL: Perbaikan logika penentuan pesan milik sendiri
              // Pesan milik sendiri jika:
              // 1. Tipe pengirim adalah 'user' DAN ID pengirim sama dengan ID mitra yang login
              // 2. ATAU tipe pengirim adalah 'mitra-as-booker' DAN ID pengirim sama dengan ID mitra yang login
              const isMe = (
                (msg.senderType === "user" && msg.senderId === currentMitra?.talentId) ||
                (msg.senderType === "mitra-as-booker" && msg.senderId === currentMitra?.talentId)
              );
              
              // Debugging
              console.log(`Message: ${msg.message}, Sender: ${msg.senderId}, Type: ${msg.senderType}, IsMe: ${isMe}`);
              
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] p-3 rounded-lg ${isMe ? "bg-orange-500 text-white" : "bg-gray-200"}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <p className={`text-xs ${isMe ? "text-blue-100" : "text-gray-500"}`}>
                        {formatTime(msg.timestamp)}
                      </p>
                      <StatusIcon msg={msg} isMe={isMe} />
                    </div>
                  </div>
                </div>
              );
            })}
            {session.isTalentTyping && (
              <div className="flex justify-start">
                <div className="max-w-[70%] p-3 rounded-lg bg-gray-200">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <div className="p-4 border-t shrink-0">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => handleTyping(e.target.value)}
                placeholder="Ketik pesan..."
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={isSending}
              />
              <Button onClick={handleSend} disabled={!message.trim() || isSending}>
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}