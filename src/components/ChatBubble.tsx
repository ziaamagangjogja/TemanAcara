import { useState } from "react";
import { Check, CheckCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/data/mockData";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ChatBubbleProps {
  message: ChatMessage;
  senderPhoto?: string;
  senderName?: string;
  onDelete?: (messageId: string) => void;
}

export function ChatBubble({ message, senderPhoto, senderName, onDelete }: ChatBubbleProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isUser = message.senderType === "user";
  const time = new Date(message.timestamp).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleDelete = () => {
    setIsDeleting(true);
    // Wait for animation to complete before actually deleting
    setTimeout(() => {
      onDelete?.(message.id);
    }, 300);
  };

  return (
    <>
      <div
        className={cn(
          "group flex gap-2 max-w-[85%] transition-all duration-300",
          isUser ? "ml-auto flex-row-reverse" : "mr-auto",
          isDeleting 
            ? "opacity-0 scale-95 -translate-y-2" 
            : "opacity-100 scale-100 translate-y-0 animate-fade-in"
        )}
      >
        {senderPhoto && (
          <img
            src={senderPhoto}
            alt={senderName}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-1"
          />
        )}
        <div className={cn("space-y-1", isUser && "items-end")}>
          <div className="relative">
            <div
              className={cn(
                "px-4 py-3 rounded-2xl",
                isUser
                  ? "bg-chat-user text-chat-user-foreground rounded-br-md"
                  : "bg-chat-talent text-chat-talent-foreground rounded-bl-md"
              )}
            >
              <p className="text-sm leading-relaxed">{message.message}</p>
            </div>
            
            {/* Delete button - only for user messages */}
            {isUser && onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className={cn(
                  "absolute -left-8 top-1/2 -translate-y-1/2",
                  "w-6 h-6 rounded-full bg-destructive/10 hover:bg-destructive/20",
                  "flex items-center justify-center",
                  "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                  "text-destructive hover:text-destructive"
                )}
                aria-label="Hapus pesan"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div
            className={cn(
              "flex items-center gap-1 text-[10px] text-muted-foreground px-1",
              isUser && "justify-end"
            )}
          >
            <span>{time}</span>
            {isUser && (
              <>
                {message.status === "sent" && (
                  <Check className="w-3 h-3 text-muted-foreground" />
                )}
                {message.status === "delivered" && (
                  <CheckCheck className="w-3 h-3 text-muted-foreground" />
                )}
                {message.status === "read" && (
                  <CheckCheck className="w-3 h-3 text-primary" />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pesan?</AlertDialogTitle>
            <AlertDialogDescription>
              Pesan ini akan dihapus secara permanen dan tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
