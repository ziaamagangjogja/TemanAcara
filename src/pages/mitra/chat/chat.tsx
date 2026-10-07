// src/pages/mitra/chat/chat.tsx
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
import { ArrowLeft, Send, Loader2, Check, CheckCheck, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import {
  getChatSessionsForTalent,
  sendMitraMessage,
  subscribeToChats,
  markMessagesAsReadByMitra,
  setTalentTyping,
  ChatMessage,
  fetchChatsFromSupabase,
} from "@/lib/chatStore";
import { getCurrentMitra } from "@/lib/mitraStore";
import { refreshBookingsFromSupabase } from "@/lib/bookingStore";

export default function MitraChatPage() {
  const navigate = useNavigate();
  const { bookingId } = useParams();

  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<any>(null);

  // STATE
  const [sessions, setSessions] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // STATE TAMBAHAN UNTUK COUNTDOWN TIMER REAL-TIME
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isBookingExpired, setIsBookingExpired] = useState<boolean>(false);

  // Dapatkan data mitra yang sedang login
  const currentMitra = getCurrentMitra();

  // ===============================
  // DERIVED STATE (harus ada sebelum fungsi yang menggunakannya)
  // ===============================
  const activeChat = useMemo(() => {
    if (!Array.isArray(sessions) || !bookingId) return null;
    console.log("MitraChat: Looking for chat with bookingId:", bookingId);
    const foundChat = sessions.find((s) => s.bookingId === bookingId) || null;
    console.log("MitraChat: Found chat:", foundChat);
    return foundChat;
  }, [sessions, bookingId]);

  // ===============================
  // FUNGSI COUNTDOWN / SISA WAKTU
  // ===============================
  useEffect(() => {
    if (!activeChat || !activeChat.date || !activeChat.time) {
      setTimeLeft("");
      return;
    }

    const calculateTimeLeft = () => {
      try {
          const bookingDate = String(activeChat.date).slice(0, 10);
          const bookingTime = String(activeChat.time).slice(0, 8);
          const bookingDateTimeStr = `${bookingDate}T${bookingTime}`;
        const startTimestamp = new Date(bookingDateTimeStr).getTime();
          if (Number.isNaN(startTimestamp)) {
            setTimeLeft("");
            setIsBookingExpired(false);
            return;
          }
        const durationHours = Number(activeChat.duration) || 1;
        // Padding 1 jam ekstra untuk chat
        const endTimestamp = startTimestamp + (durationHours + 1) * 60 * 60 * 1000;
        
        const now = new Date().getTime();
        const difference = endTimestamp - now;

        if (difference <= 0) {
          setTimeLeft("Selesai (Waktu Habis)");
          setIsBookingExpired(true);
        } else {
          setIsBookingExpired(false);
          const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((difference / 1000 / 60) % 60);
          const seconds = Math.floor((difference / 1000) % 60);

          if (hours > 0) {
            setTimeLeft(`Sisa waktu: ${hours}j ${minutes}m`);
          } else if (minutes > 0) {
            setTimeLeft(`Sisa waktu: ${minutes}m ${seconds}s`);
          } else {
            setTimeLeft(`Sisa waktu: ${seconds}s`);
          }
        }
      } catch (e) {
        setTimeLeft("");
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [activeChat]);

  // ===============================
  // FUNGSI YANG DIBUNGKUS DENGAN useCallback
  // ===============================

  const loadSessions = useCallback(() => {
    if (!currentMitra) return;
    console.log("MitraChat: Loading sessions for mitra ID:", currentMitra.talentId);
    const talentSessions = getChatSessionsForTalent(currentMitra.talentId!);
    console.log("MitraChat: Loaded sessions:", talentSessions);
    setSessions(talentSessions);
    setIsLoading(false);

    if (bookingId) {
      const currentActiveChat = talentSessions.find(s => s.bookingId === bookingId);
      if (currentActiveChat) {
        const hasUnreadMessages = currentActiveChat.messages.some(
          msg => msg.senderType === 'user' && !msg.readByMitra
        );
        if (hasUnreadMessages) {
          console.log("MitraChat: Pesan baru terdeteksi di chat aktif, menandai sebagai 'dibaca'.");
          markMessagesAsReadByMitra(bookingId);
        }
      }
    }
  }, [currentMitra?.talentId, bookingId]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 100);
  }, []);

  const handleTyping = useCallback((value: string) => {
    setMessage(value);
    if (!activeChat) return;

    if (!isTyping) {
      setIsTyping(true);
      setTalentTyping(activeChat.bookingId, true);
    }

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      setIsTyping(false);
      setTalentTyping(activeChat.bookingId, false);
    }, 800);
  }, [activeChat?.bookingId, isTyping]);

  const handleSend = useCallback(async () => {
    if (!activeChat || !message.trim() || isBookingExpired) return;

    const text = message.trim();
    setMessage("");
    setIsSending(true);

    try {
      const result = sendMitraMessage(activeChat.bookingId, text);

      if (result) {
        loadSessions();
      } else {
        toast({
          title: "Gagal Mengirim",
          description: "Pesan tidak terkirim. Sesi chat tidak ditemukan.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("MitraChat: Terjadi error saat mengirim pesan:", error);
    } finally {
      setIsSending(false);
    }
  }, [activeChat, message, toast, loadSessions, isBookingExpired]);

  // ===============================
  // EFFECTS
  // ===============================

  useEffect(() => {
    if (!currentMitra) {
      navigate('/mitra/login');
      return;
    }

    const init = async () => {
      await refreshBookingsFromSupabase();
      await fetchChatsFromSupabase();
      loadSessions();
    };

    void init();
  }, [currentMitra?.id, navigate, loadSessions]);

  useEffect(() => {
    if (!currentMitra) return;

    const unsub = subscribeToChats(() => {
      console.log("MitraChat: Update chat diterima, memuat ulang sesi...");
      loadSessions();
    });

    return () => unsub();
  }, [currentMitra?.id, loadSessions]);

  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages, scrollToBottom]);

  // ===============================
  // HELPER FUNCTIONS
  // ===============================
  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatBookingDate = (date: string) => {
    const parsedDate = new Date(String(date).slice(0, 10));
    return Number.isNaN(parsedDate.getTime())
      ? String(date)
      : parsedDate.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
  };

  const formatBookingTime = (time: string) => String(time).slice(0, 5);

  const StatusIcon = ({ msg }: { msg: ChatMessage }) => {
    if (msg.senderType !== "talent") return null;
    if (msg.status === "sent") return <Check className="w-4 h-4 text-gray-400" />;
    if (msg.status === "delivered")
      return <CheckCheck className="w-4 h-4 text-gray-400" />;
    if (msg.status === "read")
      return <CheckCheck className="w-4 h-4 text-blue-500" />;
    return null;
  };

  // ===============================
  // RENDER LOGIC
  // ===============================

  if (!currentMitra) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-primary mx-auto mb-4" />
          <p>Memuat data chat...</p>
        </div>
      </div>
    );
  }

  if (!sessions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Anda belum memiliki chat</h2>
          <p className="text-muted-foreground">Tunggu hingga klien melakukan booking dengan Anda.</p>
          <Button className="mt-4" onClick={() => navigate('/mitra/dashboard')}>
            Kembali ke Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  console.log("MitraChat: Render State - message:", `"${message}"`, "isSending:", isSending);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* CHAT LIST */}
      <Card className="lg:col-span-1 flex flex-col">
        <CardHeader>
          <CardTitle>Chat Klien</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-2">
          {sessions.map((s) => (
            <div
              key={s.bookingId}
              onClick={() => navigate(`/mitra/chat/${s.bookingId}`)}
              className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-100 transition-colors ${
                bookingId === s.bookingId ? "bg-gray-100" : ""
              }`}
            >
              <div className="flex justify-between items-center">
                <p className="font-medium">{s.userName}</p>
              </div>
              <p className="text-sm text-gray-500 truncate">
                {s.isUserTyping ? "Sedang mengetik..." : s.lastMessage}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* CHAT AREA */}
      <Card className="lg:col-span-2 flex flex-col h-[600px]">
        {!activeChat ? (
          <CardContent className="flex-1 flex items-center justify-center text-gray-500">
            Pilih chat untuk mulai percakapan
          </CardContent>
        ) : (
          <>
            {/* HEADER CHAT DENGAN TAMBAHAN COUNTDOWN SISA WAKTU */}
            <div className="p-4 border-b bg-white shrink-0">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => navigate("/mitra/chat")}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <img
                  src={activeChat.userPhoto}
                  alt={activeChat.userName}
                  className="w-10 h-10 rounded-full object-cover border"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{activeChat.userName}</h3>
                    {/* Badge Sisa Waktu / Countdown */}
                    {timeLeft && (
                      <Badge variant={isBookingExpired ? "secondary" : "default"} className="text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeLeft}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activeChat.purpose} • {activeChat.duration} jam
                  </p>
                </div>
                <div className="text-sm text-muted-foreground text-right">
                  <div>{formatBookingDate(activeChat.date)}</div>
                  <div className="text-xs">{formatBookingTime(activeChat.time)}</div>
                </div>
              </div>
            </div>

            <CardContent ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeChat.messages.map((msg) => {
                const isMe = msg.senderType === "talent";
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        isMe ? "bg-orange-500 text-white" : "bg-gray-200"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <p className={`text-xs ${isMe ? "text-blue-100" : "text-gray-500"}`}>
                          {formatTime(msg.timestamp)}
                        </p>
                        <StatusIcon msg={msg} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {activeChat.isUserTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[70%] p-3 rounded-lg bg-gray-200">
                    <div className="flex space-x-1">
                      <div
                        className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
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
                  disabled={isSending || isBookingExpired}
                />
                <Button onClick={handleSend} disabled={!message.trim() || isSending || isBookingExpired}>
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
              {isBookingExpired && (
                <p className="text-xs text-muted-foreground mt-2">Sesi booking sudah selesai. Riwayat chat tetap dapat dilihat.</p>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}