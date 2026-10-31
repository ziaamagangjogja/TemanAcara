import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface DeleteMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMyMessage: boolean;
  onDeleteForMe: () => void;
  onDeleteForEveryone?: () => void;
}

export function DeleteMessageModal({
  isOpen,
  onClose,
  isMyMessage,
  onDeleteForMe,
  onDeleteForEveryone,
}: DeleteMessageModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-6 rounded-2xl">
        <DialogHeader className="text-center sm:text-left">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-2 mx-auto sm:mx-0">
            <Trash2 className="w-6 h-6" />
          </div>
          <DialogTitle className="text-lg font-semibold">Hapus Pesan?</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            {isMyMessage
              ? "Pilih apakah Anda ingin menghapus pesan ini hanya untuk Anda sendiri atau untuk semua orang."
              : "Hapus pesan ini dari tampilan chat Anda."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2.5 mt-4">
          {isMyMessage && onDeleteForEveryone && (
            <Button
              type="button"
              variant="destructive"
              className="w-full justify-center rounded-xl py-2.5 font-medium shadow-sm active:scale-98 transition-all"
              onClick={() => {
                onDeleteForEveryone();
                onClose();
              }}
            >
              Hapus untuk Semua Orang
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full justify-center rounded-xl py-2.5 font-medium border-gray-300 text-gray-800 hover:bg-gray-100 active:scale-98 transition-all"
            onClick={() => {
              onDeleteForMe();
              onClose();
            }}
          >
            Hapus untuk Saya
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full justify-center rounded-xl py-2 text-muted-foreground hover:bg-gray-100"
            onClick={onClose}
          >
            Batal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
