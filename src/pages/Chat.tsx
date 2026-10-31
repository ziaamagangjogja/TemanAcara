import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CameraModal } from '@/components/CameraModal';
import { DeleteMessageModal } from '@/components/DeleteMessageModal';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, Send, Loader2, Check, CheckCheck, Image as ImageIcon, MapPin, Camera, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser } from '@/lib/userStore';

import {
  sendUserMessage,
  getChatSessionByBookingId,
  subscribeToChats,
  markMessagesAsReadByUser,
  setUserTyping,
  ChatMessage,
  ChatSession,
  fetchChatsFromSupabase,
  isChatSessionActive,
  uploadChatImage,
  ChatAttachment,
  deleteMessageForMe,
  deleteMessageForEveryone,
  isMessageDeletedForMe,
} from '@/lib/chatStore';
import { refreshBookingsFromSupabase } from '@/lib/bookingStore';

export default function UserChat() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [session, setSession] = useState<ChatSession | null>(null);
  const [currentUser, setCurrentUser] = useState<Awaited<ReturnType<typeof getCurrentUser>> | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isCurrentlyTyping, setIsCurrentlyTyping] = useState(false);
  const [deletingMessage, setDeletingMessage] = useState<ChatMessage | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const isUserNearBottomRef = useRef(true);
  const prevMessagesCountRef = useRef(0);
  const initialScrollDoneRef = useRef(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    // Jika dalam jarak 120px dari bawah, anggap user berada di dasar chat
    isUserNearBottomRef.current = distanceFromBottom < 120;
  };

  const scrollToBottom = (force = false) => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') || scrollAreaRef.current;
      if (scrollElement) {
        if (force || isUserNearBottomRef.current) {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        }
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!bookingId) return;
    if (!isCurrentlyTyping) { setIsCurrentlyTyping(true); setUserTyping(bookingId, true); }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => { setIsCurrentlyTyping(false); setUserTyping(bookingId, false); }, 1000);
  };

  const loadChat = () => {
    const chatSession = getChatSessionByBookingId(bookingId!);
    if (chatSession) {
      setSession(chatSession);
      markMessagesAsReadByUser(bookingId!);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (!bookingId) { navigate('/'); return; }

    const init = async () => {
      await refreshBookingsFromSupabase();
      await fetchChatsFromSupabase();
      loadChat();
    };

    void init();

    const unsubscribe = subscribeToChats(loadChat);
    return () => { unsubscribe(); if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); };
  }, [bookingId, navigate]);

  const isTalentTyping = !!session?.isTalentTyping;

  useEffect(() => {
    const count = session?.messages?.length || 0;
    // 1. Pertama kali chat dibuka -> scroll ke bawah
    if (!initialScrollDoneRef.current && count > 0) {
      initialScrollDoneRef.current = true;
      prevMessagesCountRef.current = count;
      setTimeout(() => scrollToBottom(true), 150);
      return;
    }

    // 2. Pesan baru bertambah
    if (count > prevMessagesCountRef.current) {
      prevMessagesCountRef.current = count;
      // Hanya scroll jika user sedang di bawah (tidak sedang membaca chat lama di atas)
      if (isUserNearBottomRef.current) {
        setTimeout(() => scrollToBottom(true), 100);
      }
    }

    if (isTalentTyping && isUserNearBottomRef.current) {
      setTimeout(() => scrollToBottom(true), 100);
    }
  }, [session?.messages, isTalentTyping]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !bookingId) return;
    setIsSending(true);
    try {
      sendUserMessage(currentUser.id, newMessage.trim(), bookingId);
      setNewMessage('');
      setUserTyping(bookingId, false);
    } catch (err) {
      toast({ title: 'Gagal Mengirim', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setIsSending(false);
      setTimeout(() => scrollToBottom(true), 100);
    }
  };

  const handleSendLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Error", description: "Geolokasi tidak didukung browser ini.", variant: "destructive" });
      return;
    }
    setIsSending(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        try {
          const loc: ChatAttachment = { type: "location", latitude: position.coords.latitude, longitude: position.coords.longitude };
          sendUserMessage(currentUser!.id, "", bookingId!, "user", loc);
        } catch (err) {
          toast({ title: 'Gagal', description: (err as Error).message, variant: 'destructive' });
        } finally {
          setIsSending(false);
          setTimeout(scrollToBottom, 100);
        }
      },
      (error) => {
        toast({ title: "Gagal", description: "Tidak bisa mendapatkan lokasi. Pastikan izin lokasi aktif.", variant: "destructive" });
        setIsSending(false);
      }
    );
  };

    const handleCameraCapture = async (file: File) => {
    setIsSending(true);
    try {
      const url = await uploadChatImage(file);
      const attachment: ChatAttachment = { type: "image", url };
      sendUserMessage(currentUser!.id, "", bookingId!, "user", attachment);
    } catch (err) {
      toast({ title: 'Gagal Mengirim Gambar', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setIsSending(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsSending(true);
    try {
      const url = await uploadChatImage(file);
      const attachment: ChatAttachment = { type: "image", url };
      sendUserMessage(currentUser!.id, "", bookingId!, "user", attachment);
    } catch (err) {
      toast({ title: 'Gagal Mengirim Gambar', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setIsSending(false);
      e.target.value = '';
      setTimeout(scrollToBottom, 100);
    }
  };

  const formatTime = (timestamp: string) => new Date(timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  
  const MessageStatusIcon = ({ message }: { message: ChatMessage }) => {
    if (message.senderType !== 'user') return null;
    if (message.status === 'sent') return <Check className="w-4 h-4 text-gray-400" />;
    if (message.status === 'delivered') return <CheckCheck className="w-4 h-4 text-gray-400" />;
    if (message.status === 'read') return <CheckCheck className="w-4 h-4 text-blue-500" />;
    return null;
  };

  const handleDeleteForMe = () => {
    if (!deletingMessage || !currentUser || !bookingId) return;
    deleteMessageForMe(currentUser.id, bookingId, deletingMessage.id);
    toast({ title: "Pesan Dihapus", description: "Pesan telah dihapus dari tampilan Anda." });
  };

  const handleDeleteForEveryone = async () => {
    if (!deletingMessage || !bookingId) return;
    await deleteMessageForEveryone(bookingId, deletingMessage.id);
    toast({ title: "Pesan Dihapus", description: "Pesan telah dihapus untuk semua orang." });
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  if (!session) return <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4"><Card className="p-8 text-center"><h2 className="text-xl font-bold mb-2">Chat tidak ditemukan</h2><Button onClick={() => navigate('/')}>Kembali</Button></Card></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="container max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="flex items-center gap-3">
            <img src={session.talentPhoto} alt={session.talentName} className="w-10 h-10 rounded-full object-cover border" />
            <div><h3 className="font-semibold">{session.talentName}</h3><p className="text-sm text-muted-foreground">{session.purpose} • {session.duration} jam</p></div>
          </div>
        </div>
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-lg">{session.talentName}</CardTitle><div className="text-sm text-muted-foreground">{session.date} • {session.time}</div></div></CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3" ref={scrollAreaRef} onScroll={handleScroll}>
            {session.messages
              .filter(msg => !isMessageDeletedForMe(currentUser?.id || '', msg.id))
              .map(msg => {
                const isMe = msg.senderType === 'user';
                return (
                  <div key={msg.id} className={`flex items-center gap-1.5 group ${isMe ? 'justify-end' : 'justify-start'}`}>
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

                    <div className={`max-w-[70%] p-3 rounded-2xl ${isMe ? 'bg-orange-500 text-white rounded-br-none shadow-sm' : 'bg-gray-200 text-gray-900 rounded-bl-none'}`}>
                      {msg.attachment?.type === 'image' && (
                        <img src={msg.attachment.url} alt="Attachment" className="max-w-full rounded-md mb-2 max-h-64 object-contain bg-black/10" />
                      )}
                      {msg.attachment?.type === 'location' && (
                        <div className={`mb-2 p-2 rounded-md flex items-center gap-2 ${isMe ? 'bg-black/15' : 'bg-white border'}`}>
                          <MapPin className={`w-5 h-5 ${isMe ? 'text-white' : 'text-red-500'}`} />
                          <a href={`https://www.google.com/maps/search/?api=1&query=${msg.attachment.latitude},${msg.attachment.longitude}`} target="_blank" rel="noopener noreferrer" className={`text-sm underline font-semibold ${isMe ? 'text-white' : 'text-black'}`}>
                            Lihat Lokasi di Peta
                          </a>
                        </div>
                      )}
                      {msg.message && <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>}
                      
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <p className={`text-[11px] ${isMe ? 'text-orange-100' : 'text-gray-500'}`}>{formatTime(msg.timestamp)}</p>
                        <MessageStatusIcon message={msg} />
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
            {isTalentTyping && (<div className="flex justify-start"><div className="max-w-[70%] p-3 rounded-lg bg-gray-200"><div className="flex space-x-1"><div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div><div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div><div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div></div></div></div>)}
          </CardContent>
          <div className="p-4 border-t">
            {isChatSessionActive(session) ? (
              <div className="flex gap-2 items-center">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                
                <Popover open={isAttachMenuOpen} onOpenChange={setIsAttachMenuOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={isSending}
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
                        disabled={isSending}
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
                        disabled={isSending}
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
                        disabled={isSending}
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
                  value={newMessage}
                  onChange={handleInputChange}
                  placeholder="Ketik pesan..."
                  onKeyPress={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  className="flex-1 rounded-full px-4"
                  disabled={isSending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={(!newMessage.trim() && !isSending) || isSending}
                  className="rounded-full w-10 h-10 p-0 shrink-0 bg-orange-500 hover:bg-orange-600"
                >
                  {isSending ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground p-2 bg-gray-100 rounded-md">
                Sesi pesan ini telah berakhir (hanya aktif hingga 1 jam setelah waktu booking).
              </div>
            )}
          </div>
        </Card>
        <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={handleCameraCapture} />
        <DeleteMessageModal
          isOpen={!!deletingMessage}
          onClose={() => setDeletingMessage(null)}
          isMyMessage={deletingMessage?.senderType === 'user'}
          onDeleteForMe={handleDeleteForMe}
          onDeleteForEveryone={handleDeleteForEveryone}
        />
      </div>
    </div>
  );
}