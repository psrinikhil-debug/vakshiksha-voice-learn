import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  image_url?: string | null;
  created_at: string;
}

export function useProChat(userId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load initial messages
  useEffect(() => {
    if (!userId) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from("pro_chat_messages")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (data) setMessages(data as ChatMessage[]);
    };

    loadMessages();
  }, [userId]);

  // Poll for new messages while sending (to capture assistant response)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPolling = useCallback(() => {
    if (!userId || pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      const { data } = await supabase
        .from("pro_chat_messages")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (data) {
        setMessages((prev) => {
          if (data.length !== prev.length) return data as ChatMessage[];
          return prev;
        });
      }
    }, 1500);
  }, [userId]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string, imageUrl?: string) => {
      if (!content.trim() || sending) return;
      setError(null);
      setSending(true);

      // Build conversation history (last 10 exchanges)
      const history = messages.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pro-chat`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: content.trim(),
              imageUrl: imageUrl || null,
              conversationHistory: history,
            }),
          }
        );

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || "Failed to send message");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to send");
      } finally {
        setSending(false);
      }
    },
    [messages, sending]
  );

  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      if (!userId) return null;
      const ext = file.name.split(".").pop();
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-uploads")
        .upload(path, file);

      if (uploadError) {
        setError("Image upload failed");
        return null;
      }

      const { data, error: signError } = await supabase.storage
        .from("chat-uploads")
        .createSignedUrl(path, 3600); // 1 hour TTL

      if (signError || !data?.signedUrl) {
        setError("Failed to get image URL");
        return null;
      }

      return data.signedUrl;
    },
    [userId]
  );

  const clearChat = useCallback(async () => {
    if (!userId) return;
    // Delete all messages for this user
    await supabase
      .from("pro_chat_messages")
      .delete()
      .eq("user_id", userId);
    setMessages([]);
  }, [userId]);

  return { messages, sending, error, sendMessage, uploadImage, clearChat, bottomRef };
}
