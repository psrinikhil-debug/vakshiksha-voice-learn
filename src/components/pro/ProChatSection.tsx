import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  ImagePlus,
  Trash2,
  AlertCircle,
  Bot,
  User,
  X,
  Mic,
  MicOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProChat, ChatMessage } from "@/hooks/useProChat";
import ReactMarkdown from "react-markdown";

interface ProChatSectionProps {
  userId: string;
}

const ChatBubble = ({ msg }: { msg: ChatMessage }) => {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "gradient-cool text-primary-foreground"
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted/60 text-foreground rounded-tl-sm"
        }`}
      >
        {msg.image_url && (
          <img
            src={msg.image_url}
            alt="Uploaded"
            className="rounded-lg mb-2 max-h-48 object-contain"
          />
        )}
        {isUser ? (
          <p>{msg.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const ProChatSection = ({ userId }: ProChatSectionProps) => {
  const { messages, sending, error, sendMessage, uploadImage, clearChat, bottomRef } =
    useProChat(userId);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<{
    file: File;
    preview: string;
  } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const supportsSTT = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const handleSend = async () => {
    if (!input.trim() && !pendingImage) return;

    let imageUrl: string | undefined;
    if (pendingImage) {
      const url = await uploadImage(pendingImage.file);
      if (url) imageUrl = url;
      URL.revokeObjectURL(pendingImage.preview);
      setPendingImage(null);
    }

    const msg = input;
    setInput("");
    await sendMessage(msg, imageUrl);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingImage({ file, preview: URL.createObjectURL(file) });
    }
    e.target.value = "";
  };

  return (
    <div className="flex flex-col h-[520px] sm:h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/30">
        <div>
          <h3 className="text-lg font-bold font-display flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" /> Pro AI Chat
          </h3>
          <p className="text-xs text-muted-foreground">
            Real-time conversation with your AI tutor
          </p>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            className="text-muted-foreground hover:text-destructive gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-thin"
      >
        {messages.length === 0 && !sending && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Bot className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Start a conversation</p>
            <p className="text-xs mt-1">
              Ask anything or upload an image for analysis
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <ChatBubble key={msg.id} msg={msg} />
          ))}
        </AnimatePresence>

        {sending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-2.5"
          >
            <div className="w-8 h-8 rounded-full gradient-cool flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="bg-muted/60 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce [animation-delay:0ms]" />
                <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce [animation-delay:150ms]" />
                <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs mb-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Pending image preview */}
      {pendingImage && (
        <div className="relative w-20 h-20 mb-2">
          <img
            src={pendingImage.preview}
            alt="Preview"
            className="w-full h-full object-cover rounded-lg border border-border"
          />
          <button
            onClick={() => {
              URL.revokeObjectURL(pendingImage.preview);
              setPendingImage(null);
            }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 pt-3 border-t border-border/30">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 text-muted-foreground hover:text-primary"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="w-5 h-5" />
        </Button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 outline-none min-h-[40px] max-h-[120px]"
        />
        <Button
          onClick={handleSend}
          disabled={sending || (!input.trim() && !pendingImage)}
          size="icon"
          className="flex-shrink-0 gradient-hero text-primary-foreground"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default ProChatSection;
