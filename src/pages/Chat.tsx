// src/pages/UserChat.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Loader2, Check, CheckCheck } from 'lucide-react';
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
} from '@/lib/chatStore';
import { refreshBookingsFromSupabase } from '@/lib/bookingStore';

export default function UserChat() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [session, setSession] = useState<ChatSession | null>(null);
  const [currentUser, setCurrentUser] = useState<Awaited<ReturnType<typeof getCurrentUser>> | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isCurrentlyTyping, setIsCurrentlyTyping] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) scrollElement.scrollTop = scrollElement.scrollHeight;
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
    setTimeout(scrollToBottom, 100);
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

  useEffect(() => { scrollToBottom(); }, [session?.messages, isTalentTyping]);

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
    }
  };

  const formatTime = (timestamp: string) => new Date(timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  
  // Perbarui komponen MessageStatusIcon untuk menampilkan status dengan benar
  const MessageStatusIcon = ({ message }: { message: ChatMessage }) => {
    if (message.senderType !== 'user') return null;
    
    // Status sent: satu centang abu-abu
    if (message.status === 'sent') return <Check className="w-4 h-4 text-gray-400" />;
    
    // Status delivered: dua centang abu-abu
    if (message.status === 'delivered') return <CheckCheck className="w-4 h-4 text-gray-400" />;
    
    // Status read: dua centang biru
    if (message.status === 'read') return <CheckCheck className="w-4 h-4 text-blue-500" />;
    
    return null;
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
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3" ref={scrollAreaRef}>
            {session.messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] p-3 rounded-lg ${msg.senderType === 'user' ? 'bg-orange-500 text-white' : 'bg-gray-200'}`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <p className={`text-xs ${msg.senderType === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>{formatTime(msg.timestamp)}</p>
                    <MessageStatusIcon message={msg} />
                  </div>
                </div>
              </div>
            ))}
            {isTalentTyping && (<div className="flex justify-start"><div className="max-w-[70%] p-3 rounded-lg bg-gray-200"><div className="flex space-x-1"><div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div><div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div><div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div></div></div></div>)}
          </CardContent>
          <div className="p-4 border-t"><div className="flex gap-2"><Input value={newMessage} onChange={handleInputChange} placeholder="Ketik pesan..." onKeyPress={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} className="flex-1" disabled={isSending} /><Button onClick={handleSendMessage} disabled={!newMessage.trim() || isSending}>{isSending ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}</Button></div></div>
        </Card>
      </div>
    </div>
  );
}