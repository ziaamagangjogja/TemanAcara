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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CameraModal } from "@/components/CameraModal";
import { DeleteMessageModal } from "@/components/DeleteMessageModal";
import { ArrowLeft, Send, Loader2, Check, CheckCheck, Clock, Image as ImageIcon, MapPin, Camera, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import {
  getChatSessionsForTalent,
  sendMitraMessage,
  subscribeToChats,
  markMessagesAsReadByMitra,
  setTalentTyping,
  ChatMessage,
  fetchChatsFromSupabase,
  uploadChatImage,
  ChatAttachment,
  deleteMessageForMe,
  deleteMessageForEveryone,
  isMessageDeletedForMe,
} from "@/lib/chatStore";
import { getCurrentMitra } from "@/lib/mitraStore";
import { refreshBookingsFromSupabase } from "@/lib/bookingStore";

export default function MitraChatPage() {
  const navigate = useNavigate();
  const { bookingId } = useParams();

  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUserNearBottomRef = useRef(true);
  const prevMessagesCountRef = useRef(0);
  const initialScrollDoneRef = useRef(false);

  // STATE
  const [sessions, setSessions] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingMessage, setDeletingMessage] = useState<ChatMessage | null>(null);

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

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    isUserNearBottomRef.current = distanceFromBottom < 120;
  }, []);

  const scrollToBottom = useCallback((force = false) => {
    setTimeout(() => {
      if (!scrollRef.current) return;
      if (force || isUserNearBottomRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 100);
  }, []);

  useEffect(() => {
    initialScrollDoneRef.current = false;
    prevMessagesCountRef.current = 0;
    isUserNearBottomRef.current = true;
  }, [bookingId]);

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

  const handleSendLocation = useCallback(() => {
    if (!activeChat || isBookingExpired) return;
    if (!navigator.geolocation) {
      toast({ title: "Error", description: "Geolokasi tidak didukung browser ini.", variant: "destructive" });
      return;
    }
    setIsSending(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        try {
          const loc: ChatAttachment = { type: "location", latitude: position.coords.latitude, longitude: position.coords.longitude };
          sendMitraMessage(activeChat.bookingId, "", loc);
          loadSessions();
        } catch (err) {
          toast({ title: "Gagal", description: (err as Error).message, variant: "destructive" });
        } finally {
          setIsSending(false);
          setTimeout(scrollToBottom, 100);
        }
      },
      (error) => {
        toast({ title: "Gagal", description: "Tidak bisa mendapatkan lokasi.", variant: "destructive" });
        setIsSending(false);
      }
    );
  }, [activeChat, isBookingExpired, loadSessions, scrollToBottom, toast]);

    const handleCameraCapture = async (file: File) => {
    if (!activeChat || isBookingExpired) return;
    setIsSending(true);
    try {
      const url = await uploadChatImage(file);
      const attachment: ChatAttachment = { type: "image", url };
      sendMitraMessage(activeChat.bookingId, "", attachment);
      loadSessions();
    } catch (err) {
      toast({ title: "Gagal Mengirim Gambar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsSending(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeChat || isBookingExpired || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsSending(true);
    try {
      const url = await uploadChatImage(file);
      const attachment: ChatAttachment = { type: "image", url };
      sendMitraMessage(activeChat.bookingId, "", attachment);
      loadSessions();
    } catch (err) {
      toast({ title: "Gagal Mengirim Gambar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsSending(false);
      e.target.value = '';
      setTimeout(scrollToBottom, 100);
    }
  }, [activeChat, isBookingExpired, loadSessions, scrollToBottom, toast]);

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

  const handleDeleteForMe = useCallback(() => {
    if (!deletingMessage || !currentMitra || !activeChat) return;
    const mitraId = currentMitra.talentId || currentMitra.id || "mitra";
    deleteMessageForMe(mitraId, activeChat.bookingId, deletingMessage.id);
    loadSessions();
    toast({ title: "Pesan Dihapus", description: "Pesan telah dihapus dari tampilan Anda." });
  }, [deletingMessage, currentMitra, activeChat, loadSessions, toast]);

  const handleDeleteForEveryone = useCallback(async () => {
    if (!deletingMessage || !activeChat) return;
    await deleteMessageForEveryone(activeChat.bookingId, deletingMessage.id);
    loadSessions();
    toast({ title: "Pesan Dihapus", description: "Pesan telah dihapus untuk semua orang." });
  }, [deletingMessage, activeChat, loadSessions, toast]);

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
    const count = activeChat?.messages?.length || 0;
    if (!initialScrollDoneRef.current && count > 0) {
      initialScrollDoneRef.current = true;
      prevMessagesCountRef.current = count;
      scrollToBottom(true);
      return;
    }

    if (count > prevMessagesCountRef.current) {
      prevMessagesCountRef.current = count;
      if (isUserNearBottomRef.current) {
        scrollToBottom(true);
      }
    }
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
        <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={handleCameraCapture} />
      </div>
    );
  }

  console.log("MitraChat: Render State - message:", `"${message}"`, "isSending:", isSending);

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
      {/* CHAT LIST */}
      <Card className="lg:col-span-1 flex flex-col h-[calc(100vh-130px)] min-h-[550px] shadow-sm rounded-2xl overflow-hidden border bg-white">
        <CardHeader className="pb-3 border-b bg-white shrink-0">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span>Chat Klien</span>
            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-100">
              {sessions.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map((s) => {
            const isActive = bookingId === s.bookingId;
            return (
              <div
                key={s.bookingId}
                onClick={() => navigate(`/mitra/chat/${s.bookingId}`)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                  isActive
                    ? "bg-orange-50 border-orange-200 shadow-sm"
                    : "border-transparent hover:bg-gray-100 hover:border-gray-200"
                }`}
              >
                <img
                  src={s.userPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${s.userName}`}
                  alt={s.userName}
                  className="w-11 h-11 rounded-full object-cover border shrink-0 bg-gray-100"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <p className={`font-semibold text-sm truncate ${isActive ? "text-orange-950" : "text-gray-900"}`}>
                      {s.userName}
                    </p>
                  </div>
                  <p className={`text-xs truncate ${s.isUserTyping ? "text-orange-600 font-medium" : "text-muted-foreground"}`}>
                    {s.isUserTyping ? "Sedang mengetik..." : (s.lastMessage || "Mulai percakapan")}
                  </p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* CHAT AREA */}
      <Card className="lg:col-span-2 flex flex-col h-[calc(100vh-130px)] min-h-[550px] shadow-sm rounded-2xl overflow-hidden border bg-white">
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
                  src={activeChat.userPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${activeChat.userName}`}
                  alt={activeChat.userName}
                  className="w-10 h-10 rounded-full object-cover border bg-gray-100"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base">{activeChat.userName}</h3>
                    {/* Badge Sisa Waktu / Countdown */}
                    {timeLeft && (
                      <Badge variant={isBookingExpired ? "secondary" : "default"} className={`text-xs flex items-center gap-1 ${!isBookingExpired ? 'bg-orange-500 hover:bg-orange-600' : ''}`}>
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

            <CardContent ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
              {activeChat.messages
                .filter((msg) => !isMessageDeletedForMe(currentMitra?.talentId || currentMitra?.id || "mitra", msg.id))
                .map((msg) => {
                  const isMe = msg.senderType === "talent";
                  const hasContent = !!(msg.message?.trim() || msg.attachment);
                  if (!hasContent) return null; // Jangan render bubble kosong
                  return (
                    <div key={msg.id} className={`flex items-center gap-1.5 group ${isMe ? "justify-end" : "justify-start"}`}>
                      {/* Tombol Hapus untuk pesan saya (di kiri bubble) */}
                      {isMe && (
                        <button
                          type="button"
                          onClick={() => setDeletingMessage(msg)}
                          title="Hapus pesan"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-black/5 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div
                        className={`max-w-[75%] p-3 rounded-2xl ${
                          isMe
                            ? "bg-orange-500 text-white rounded-br-none shadow-sm"
                            : "bg-white text-gray-900 rounded-bl-none border border-gray-200/80 shadow-xs"
                        }`}
                      >
                        {msg.attachment?.type === 'image' && (
                          <img
                            src={msg.attachment.url}
                            alt="Attachment"
                            className="max-w-full rounded-xl mb-2 max-h-64 object-contain bg-black/10"
                          />
                        )}
                        {msg.attachment?.type === 'location' && (
                          <div className={`mb-2 p-2.5 rounded-xl flex items-center gap-2 ${isMe ? 'bg-black/15' : 'bg-orange-50 border border-orange-100'}`}>
                            <MapPin className={`w-5 h-5 shrink-0 ${isMe ? 'text-white' : 'text-orange-600'}`} />
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${msg.attachment.latitude},${msg.attachment.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`text-sm underline font-semibold ${isMe ? 'text-white' : 'text-orange-700'}`}
                            >
                              Lihat Lokasi di Peta
                            </a>
                          </div>
                        )}
                        {msg.message && <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>}
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <p className={`text-[11px] ${isMe ? "text-orange-100" : "text-gray-400"}`}>
                            {formatTime(msg.timestamp)}
                          </p>
                          <StatusIcon msg={msg} />
                        </div>
                      </div>

                      {/* Tombol Hapus untuk pesan lawan bicara (di kanan bubble) */}
                      {!isMe && (
                        <button
                          type="button"
                          onClick={() => setDeletingMessage(msg)}
                          title="Hapus pesan"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-black/5 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
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
              <div className="flex gap-2 items-center">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                
                <Popover open={isAttachMenuOpen} onOpenChange={setIsAttachMenuOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={isSending || isBookingExpired}
                      className={`rounded-full w-10 h-10 shrink-0 border-orange-200 text-orange-500 hover:bg-orange-50 hover:text-orange-600 transition-all ${
                        isAttachMenuOpen ? 'bg-orange-100 text-orange-600 rotate-45' : ''
                      }`}
                      title="Tambah Lampiran"
                    >
                      <Plus className="w-5 h-5 transition-transform duration-200" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" className="w-auto p-3 mb-2 rounded-2xl shadow-xl border bg-white/95 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                      {/* Buka Kamera */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsAttachMenuOpen(false);
                          setIsCameraOpen(true);
                        }}
                        disabled={isSending || isBookingExpired}
                        className="flex flex-col items-center gap-1.5 group focus:outline-none"
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-md group-hover:scale-105 group-active:scale-95 transition-all">
                          <Camera className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-medium text-gray-700 group-hover:text-rose-600 transition-colors">
                          Kamera
                        </span>
                      </button>

                      {/* Kirim Foto dari Galeri */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsAttachMenuOpen(false);
                          fileInputRef.current?.click();
                        }}
                        disabled={isSending || isBookingExpired}
                        className="flex flex-col items-center gap-1.5 group focus:outline-none"
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500 text-white flex items-center justify-center shadow-md group-hover:scale-105 group-active:scale-95 transition-all">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">
                          Galeri
                        </span>
                      </button>

                      {/* Kirim Lokasi */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsAttachMenuOpen(false);
                          handleSendLocation();
                        }}
                        disabled={isSending || isBookingExpired}
                        className="flex flex-col items-center gap-1.5 group focus:outline-none"
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-md group-hover:scale-105 group-active:scale-95 transition-all">
                          <MapPin className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-medium text-gray-700 group-hover:text-emerald-600 transition-colors">
                          Lokasi
                        </span>
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>

                <Input
                  value={message}
                  onChange={(e) => handleTyping(e.target.value)}
                  placeholder="Ketik pesan..."
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  disabled={isSending || isBookingExpired}
                  className="flex-1 rounded-full px-4"
                />
                <Button
                  onClick={handleSend}
                  disabled={(!message.trim() && !isSending) || isSending || isBookingExpired}
                  className="rounded-full w-10 h-10 p-0 shrink-0 bg-orange-500 hover:bg-orange-600"
                >
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
      <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={handleCameraCapture} />
      <DeleteMessageModal
        isOpen={!!deletingMessage}
        onClose={() => setDeletingMessage(null)}
        isMyMessage={deletingMessage?.senderType === "talent"}
        onDeleteForMe={handleDeleteForMe}
        onDeleteForEveryone={handleDeleteForEveryone}
      />
    </div>
  );
}