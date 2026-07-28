import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { api } from "@/lib/api";
import { formatMessageTimeFa } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function TicketChat({ ticketId, initialComments = [] }) {
  const { user } = useAuth();
  const { joinTicket, leaveTicket, onNewMessage, markTicketRead } = useNotifications();
  const [messages, setMessages] = useState(initialComments);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    setMessages(initialComments);
  }, [initialComments]);

  useEffect(() => {
    joinTicket(ticketId);
    markTicketRead(ticketId).catch(() => {});

    const unsubscribe = onNewMessage((payload) => {
      if (Number(payload.ticketId) !== Number(ticketId)) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.message.id)) return prev;
        return [...prev, payload.message];
      });
      if (payload.message.author_id !== user?.id) {
        markTicketRead(ticketId).catch(() => {});
      }
    });

    return () => {
      leaveTicket(ticketId);
      unsubscribe();
    };
  }, [ticketId, joinTicket, leaveTicket, onNewMessage, markTicketRead, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      const message = await api.addComment(ticketId, body.trim());
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      setBody("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={listRef}
        className="flex max-h-[50vh] min-h-[180px] flex-col gap-3 overflow-y-auto rounded-[1.5rem] border border-white/60 bg-white/55 p-3 shadow-inner backdrop-blur-sm sm:max-h-[420px] sm:p-4"
      >
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            گفتگو را شروع کنید — پیام‌ها به‌صورت لحظه‌ای نمایش داده می‌شوند.
          </p>
        )}
        {messages.map((m) => {
          const isMine = m.author_id === user?.id;
          return (
            <div
              key={m.id}
              className={cn("flex", isMine ? "justify-start" : "justify-end")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm",
                  isMine
                    ? "rounded-br-md bg-gradient-to-l from-primary to-slate-800 text-primary-foreground"
                    : "rounded-bl-md border border-white/70 bg-white/90 backdrop-blur-sm"
                )}
              >
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className={cn("text-xs font-bold", isMine ? "text-primary-foreground/90" : "text-foreground")}>
                    {isMine ? "شما" : m.author_name}
                  </span>
                  <span className={cn("fa-num text-[10px]", isMine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {formatMessageTimeFa(m.created_at)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex flex-col gap-2">
        <Textarea
          placeholder="پیام خود را بنویسید..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[72px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
        />
        <Button type="submit" disabled={sending || !body.trim()} className="w-full self-stretch sm:w-auto sm:self-end">
          <Send className="h-4 w-4" />
          {sending ? "در حال ارسال..." : "ارسال"}
        </Button>
      </form>
    </div>
  );
}
