import { Link } from "react-router-dom";
import { Search, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { getActiveChatSessions, subscribeToChats, ChatSession, fetchChatsFromSupabase } from "@/lib/chatStore";
import { subscribeToBookings, refreshBookingsFromSupabase } from "@/lib/bookingStore";

export default function ChatList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);

  // Load chat sessions from approved bookings
  useEffect(() => {
    const loadChats = () => {
      const sessions = getActiveChatSessions();
      setChatSessions(sessions);
    };

    void refreshBookingsFromSupabase();
    void fetchChatsFromSupabase();
    loadChats();

    // Subscribe to both chat and booking updates
    const unsubscribeChats = subscribeToChats(loadChats);
    const unsubscribeBookings = subscribeToBookings(loadChats);

    return () => {
      unsubscribeChats();
      unsubscribeBookings();
    };
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (days === 1) {
      return "Kemarin";
    } else if (days < 7) {
      return date.toLocaleDateString("id-ID", { weekday: "long" });
    } else {
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
    }
  };

  // Filter chat sessions based on search
  const filteredChatSessions = chatSessions.filter((session) => {
    const matchesSearch =
      session.talentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.purpose.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-warm pt-20 md:pt-24 pb-24 md:pb-8">
      <div className="container max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">Obrolan</h1>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Cari percakapan..."
            className="pl-12 h-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {filteredChatSessions.length > 0 ? (
          <div className="space-y-3">
            {filteredChatSessions.map((session) => (
              <Link key={session.id} to={`/chat/${session.bookingId}`}>
                <Card hover className="p-4 flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={session.talentPhoto}
                      alt={session.talentName}
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/10"
                    />
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-card" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold truncate">{session.talentName}</h3>
                        <Badge variant="success" className="text-[10px] px-1.5 py-0">
                          Aktif
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(session.lastMessageTime)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {session.purpose} • {session.duration} jam
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate pr-4">
                        {session.lastMessage}
                      </p>
                      {session.unreadCount > 0 && (
                        <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                          {session.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <MessageCircle className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">
              {searchQuery ? "Tidak Ditemukan" : "Belum Ada Obrolan"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? "Coba kata kunci lain atau cari teman baru"
                : "Obrolan akan muncul setelah pemesanan kamu disetujui oleh admin"}
            </p>
            <Link to="/talents">
              <button className="text-primary font-semibold hover:underline">
                Cari Teman Sekarang
              </button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
