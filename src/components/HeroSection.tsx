import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const HeroSection = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [statusText, setStatusText] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const stopAll = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    speechSynthesis.cancel();
    setIsListening(false);
    setIsProcessing(false);
    setIsSpeaking(false);
    setStatusText("");
  }, []);

  const handleMicClick = useCallback(() => {
    if (isListening || isProcessing || isSpeaking) {
      stopAll();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatusText("Speech recognition not supported");
      setTimeout(() => setStatusText(""), 3000);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setStatusText("Listening...");
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (!transcript) {
        setIsListening(false);
        setStatusText("");
        return;
      }

      setIsListening(false);
      setIsProcessing(true);
      setStatusText(`"${transcript}" — Thinking...`);

      try {
        const { data, error } = await supabase.functions.invoke("voice-qa", {
          body: { question: transcript, voiceId: "en-US-natalie" },
        });

        if (error || data?.error) throw new Error(data?.error || error?.message);

        const answer = data?.answer || "I couldn't find an answer.";
        setIsProcessing(false);
        setIsSpeaking(true);
        setStatusText(answer);

        if (data?.audioFile) {
          const audio = new Audio(data.audioFile);
          audioRef.current = audio;
          audio.onended = () => {
            setIsSpeaking(false);
            setTimeout(() => setStatusText(""), 5000);
          };
          audio.onerror = () => {
            setIsSpeaking(false);
            setStatusText("Audio playback failed");
          };
          await audio.play();
        } else {
          const utterance = new SpeechSynthesisUtterance(answer);
          utterance.rate = 0.95;
          utterance.onend = () => {
            setIsSpeaking(false);
            setTimeout(() => setStatusText(""), 5000);
          };
          speechSynthesis.speak(utterance);
        }
      } catch (err: unknown) {
        setIsProcessing(false);
        setStatusText(err instanceof Error ? err.message : "Something went wrong");
        setTimeout(() => setStatusText(""), 4000);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setStatusText("Could not hear you, try again");
      setTimeout(() => setStatusText(""), 3000);
    };

    recognition.onend = () => {
      if (isListening) setIsListening(false);
    };

    recognition.start();
  }, [isListening, isProcessing, isSpeaking, stopAll]);

  const isActive = isListening || isProcessing || isSpeaking;

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden px-4">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-accent/15 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="relative z-10 text-center max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20">
            🎤 AI-Powered Voice Learning
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl font-bold font-display leading-tight mb-6"
        >
          <span className="text-gradient-hero">VakSiksha</span>
          <br />
          <span className="text-foreground">Learn Through Voice</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
        >
          Empowering education using AI voices. Speak, listen, and learn in any language — powered by intelligent voice technology.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Button
            size="lg"
            className="gradient-hero text-primary-foreground rounded-full px-8 py-6 text-lg font-semibold shadow-glow hover:opacity-90 transition-opacity gap-2"
            onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
          >
            <Mic className="w-5 h-5" />
            Start Learning
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="rounded-full px-8 py-6 text-lg border-border/60 hover:bg-muted/50"
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
          >
            Explore Features
          </Button>
        </motion.div>

        {/* Functional floating mic */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-16 flex flex-col items-center"
        >
          <button
            onClick={handleMicClick}
            className="relative group cursor-pointer focus:outline-none"
            aria-label={isActive ? "Stop" : "Tap to ask a question"}
          >
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center shadow-glow transition-all duration-300 ${
                isListening
                  ? "bg-destructive animate-pulse"
                  : isProcessing
                  ? "gradient-warm"
                  : isSpeaking
                  ? "gradient-hero animate-pulse"
                  : "gradient-hero animate-float group-hover:scale-110"
              }`}
            >
              {isProcessing ? (
                <Loader2 className="w-10 h-10 text-primary-foreground animate-spin" />
              ) : isActive ? (
                <Square className="w-8 h-8 text-primary-foreground" />
              ) : (
                <Mic className="w-10 h-10 text-primary-foreground" />
              )}
            </div>
            {/* Sound waves — only when idle */}
            {!isActive &&
              [1, 2, 3].map(i => (
                <div
                  key={i}
                  className="absolute inset-0 rounded-full border-2 border-primary/20"
                  style={{
                    animation: `ping ${2 + i * 0.5}s cubic-bezier(0, 0, 0.2, 1) infinite`,
                    animationDelay: `${i * 0.4}s`,
                  }}
                />
              ))}
            {/* Active rings for listening */}
            {isListening &&
              [1, 2].map(i => (
                <div
                  key={`listen-${i}`}
                  className="absolute inset-0 rounded-full border-2 border-destructive/30"
                  style={{
                    animation: `ping ${1.5 + i * 0.3}s cubic-bezier(0, 0, 0.2, 1) infinite`,
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
          </button>

          {/* Status text */}
          <AnimatePresence mode="wait">
            {statusText ? (
              <motion.p
                key="status"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`mt-4 text-sm max-w-md px-4 py-2 rounded-xl ${
                  isListening
                    ? "text-destructive bg-destructive/10"
                    : isProcessing
                    ? "text-accent bg-accent/10"
                    : isSpeaking
                    ? "text-foreground bg-card border border-border/50 shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {statusText}
              </motion.p>
            ) : (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-4 text-sm text-muted-foreground"
              >
                Tap the mic to ask anything
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-6 text-sm text-muted-foreground italic"
        >
          "Education that speaks your language"
        </motion.p>
      </div>
    </section>
  );
};

export default HeroSection;
