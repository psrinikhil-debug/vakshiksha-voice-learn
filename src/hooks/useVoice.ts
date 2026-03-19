import { useState, useCallback } from "react";

export interface UsageStats {
  voiceMinutes: number;
  maxVoiceMinutes: number;
  transcriptionMinutes: number;
  maxTranscriptionMinutes: number;
}

export const useVoice = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [usage, setUsage] = useState<UsageStats>({
    voiceMinutes: 0,
    maxVoiceMinutes: 10,
    transcriptionMinutes: 0,
    maxTranscriptionMinutes: 10,
  });

  const speak = useCallback((text: string, voice?: string) => {
    if (!text || isSpeaking) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices();
    
    if (voice && voices.length > 0) {
      const found = voices.find(v => v.name.toLowerCase().includes(voice.toLowerCase()));
      if (found) utterance.voice = found;
    }
    
    utterance.rate = 0.95;
    utterance.pitch = 1;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setUsage(prev => ({
        ...prev,
        voiceMinutes: Math.min(prev.voiceMinutes + 0.5, prev.maxVoiceMinutes),
      }));
    };
    
    speechSynthesis.speak(utterance);
  }, [isSpeaking]);

  const stopSpeaking = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
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
    recognition.onerror = () => setIsListening(false);
    
    recognition.start();
  }, []);

  return { isSpeaking, isListening, transcript, usage, speak, stopSpeaking, startListening, setTranscript };
};
