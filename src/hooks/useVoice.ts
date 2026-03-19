import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UsageStats {
  voiceMinutes: number;
  maxVoiceMinutes: number;
  transcriptionMinutes: number;
  maxTranscriptionMinutes: number;
}

// Map UI selections to Murf voice IDs
const VOICE_MAP: Record<string, Record<string, string>> = {
  "US English": {
    Female: "en-US-natalie",
    Male: "en-US-marcus",
  },
  "UK English": {
    Female: "en-UK-hazel",
    Male: "en-UK-ethan",
  },
  "Indian English": {
    Female: "en-IN-isha",
    Male: "en-IN-arjun",
  },
  "Australian English": {
    Female: "en-AU-evie",
    Male: "en-AU-liam",
  },
};

export const useVoice = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [usage, setUsage] = useState<UsageStats>({
    voiceMinutes: 0,
    maxVoiceMinutes: 10,
    transcriptionMinutes: 0,
    maxTranscriptionMinutes: 10,
  });

  const speak = useCallback(async (text: string, accent?: string, voiceType?: string) => {
    if (!text || isSpeaking || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const voiceId = VOICE_MAP[accent || "US English"]?.[voiceType || "Female"] || "en-US-natalie";

      const { data, error: fnError } = await supabase.functions.invoke("murf-tts", {
        body: { text, voiceId, format: "MP3" },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      const audioUrl = data?.audioFile;
      if (!audioUrl) throw new Error("No audio returned from Murf API");

      // Play the audio
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsSpeaking(true);
        setIsLoading(false);
      };
      audio.onended = () => {
        setIsSpeaking(false);
        const duration = audio.duration || 0;
        setUsage(prev => ({
          ...prev,
          voiceMinutes: Math.min(prev.voiceMinutes + duration / 60, prev.maxVoiceMinutes),
        }));
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        setIsLoading(false);
        setError("Failed to play audio");
      };

      await audio.play();
    } catch (err: unknown) {
      console.error("Murf TTS error:", err);
      setError(err instanceof Error ? err.message : "Voice generation failed");
      setIsLoading(false);

      // Fallback to browser TTS
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        setUsage(prev => ({
          ...prev,
          voiceMinutes: Math.min(prev.voiceMinutes + 0.5, prev.maxVoiceMinutes),
        }));
      };
      speechSynthesis.speak(utterance);
    }
  }, [isSpeaking, isLoading]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const result = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      setTranscript(result);
    };
    recognition.onend = () => {
      setIsListening(false);
      setUsage(prev => ({
        ...prev,
        transcriptionMinutes: Math.min(prev.transcriptionMinutes + 0.5, prev.maxTranscriptionMinutes),
      }));
    };
    recognition.onerror = () => {
      setIsListening(false);
      setError("Speech recognition error");
    };

    recognition.start();
  }, []);

  return {
    isSpeaking,
    isListening,
    isLoading,
    transcript,
    usage,
    error,
    speak,
    stopSpeaking,
    startListening,
    setTranscript,
  };
};
