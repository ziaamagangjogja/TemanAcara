-- Hapus tabel lama jika ada agar tidak bentrok
DROP TABLE IF EXISTS public.messages;
DROP TABLE IF EXISTS public.chats;

-- Buat tabel chats
CREATE TABLE public.chats (
    booking_id text PRIMARY KEY,
    user_id text NOT NULL,
    talent_id text NOT NULL,
    last_message text,
    last_message_time timestamptz,
    unread_count_user integer DEFAULT 0,
    unread_count_mitra integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Buat tabel messages
CREATE TABLE public.messages (
    id text PRIMARY KEY,
    booking_id text REFERENCES public.chats(booking_id) ON DELETE CASCADE,
    sender_id text NOT NULL,
    sender_type text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'sent',
    timestamp timestamptz DEFAULT now(),
    read_by_user boolean DEFAULT false,
    read_by_mitra boolean DEFAULT false,
    read_by_mitra_as_booker boolean DEFAULT false,
    is_auto_response boolean DEFAULT false
);

-- Buka akses untuk public (karena ini tanpa RLS yang ketat untuk demo)
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on chats" ON public.chats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);
