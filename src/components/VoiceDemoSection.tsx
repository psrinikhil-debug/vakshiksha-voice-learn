import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, VolumeX, Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useVoice } from "@/hooks/useVoice";
import WaveformVisualizer from "@/components/WaveformVisualizer";

const accents = ["US English", "UK English", "Indian English", "Australian English"];
const voiceTypes = ["Female", "Male"];

type Mode = "tts" | "qa";

const VoiceDemoSection = () => {
  const {
    isSpeaking, isListening, isLoading, transcript, usage, error, conversation,
    speak, askQuestion, stopSpeaking, startListening, setTranscript, clearConversation,
  } = useVoice();

  const [text, setText] = useState("");
  const [selectedAccent, setSelectedAccent] = useState(accents[0]);
  const [selectedVoice, setSelectedVoice] = useState(voiceTypes[0]);
  const [mode, setMode] = useState<Mode>("qa");
  const [waveActive, setWaveActive] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWaveActive(isSpeaking || isListening);
  }, [isSpeaking, isListening]);

  const [, setTick] = useState(0);
  useEffect(() => {
    if (!waveActive) return;
    const interval = setInterval(() => setTick(t => t + 1), 150);
    return () => clearInterval(interval);
  }, [waveActive]);

  useEffect(() => {
    if (transcript) setText(transcript);
  }, [transcript]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const handleSubmit = () => {
    if (isSpeaking || isLoading) {
      stopSpeaking();
      return;
    }
    if (!text.trim()) return;
    if (mode === "qa") {
      askQuestion(text, selectedAccent, selectedVoice);
      setText("");
    } else {
      speak(text, selectedAccent, selectedVoice);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <section id="demo" className="py-24 px-4 bg-muted/30">
      <div className="container max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Try It Now
          </span>
          <h2 className="text-3xl md:text-5xl font-bold font-display mb-4">
            Experience <span className="text-gradient-warm">Voice Learning</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Ask any question and hear AI answer — or convert text to natural speech
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-card rounded-3xl p-6 md:p-8 shadow-card border border-border/50"
        >
          {/* Mode Toggle */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setMode("qa")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                mode === "qa"
                  ? "gradient-hero text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageCircle className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Ask AI
            </button>
            <button
              onClick={() => setMode("tts")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                mode === "tts"
                  ? "gradient-hero text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Volume2 className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Text to Speech
            </button>
          </div>

          {/* Controls Row */}
          <div className="flex flex-wrap gap-3 mb-4">
            <select
              value={selectedAccent}
              onChange={e => setSelectedAccent(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium focus:ring-2 focus:ring-primary/30 outline-none"
            >
              {accents.map(a => <option key={a}>{a}</option>)}
            </select>
            <select
              value={selectedVoice}
              onChange={e => setSelectedVoice(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium focus:ring-2 focus:ring-primary/30 outline-none"
            >
              {voiceTypes.map(v => <option key={v}>{v}</option>)}
            </select>
            {mode === "qa" && conversation.length > 0 && (
              <button
                onClick={clearConversation}
                className="ml-auto px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>

          {/* Conversation Area (QA mode) */}
          {mode === "qa" && conversation.length > 0 && (
            <div className="mb-4 max-h-64 overflow-y-auto rounded-xl bg-muted/30 border border-border/40 p-4 space-y-3">
              <AnimatePresence>
                {conversation.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "gradient-hero text-primary-foreground rounded-br-md"
                          : "bg-card border border-border/50 text-foreground rounded-bl-md"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Text Area */}
          <div className="relative mb-4">
            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === "qa"
                  ? "Ask any question — e.g. 'What is photosynthesis?' or 'Explain gravity'..."
                  : "Type something to convert to speech..."
              }
              className="min-h-[80px] text-base resize-none pr-14 rounded-xl border-border/60"
            />
            <button
              onClick={isListening ? undefined : startListening}
              className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isListening
                  ? "bg-destructive mic-pulse"
                  : "bg-primary hover:bg-primary/90"
              }`}
            >
              {isListening ? (
                <MicOff className="w-5 h-5 text-primary-foreground" />
              ) : (
                <Mic className="w-5 h-5 text-primary-foreground" />
              )}
            </button>
          </div>

          {/* Waveform */}
          <div className="mb-4 bg-muted/50 rounded-xl overflow-hidden">
            <WaveformVisualizer isPlaying={waveActive} barCount={48} />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Button
              onClick={handleSubmit}
              disabled={!text.trim() && !isSpeaking && !isLoading}
              className="gradient-hero hover:opacity-90 text-primary-foreground rounded-xl px-6 gap-2"
              size="lg"
            >
              {isLoading ? (
                <>
                  <VolumeX className="w-5 h-5" /> Stop
                </>
              ) : isSpeaking ? (
                <>
                  <VolumeX className="w-5 h-5" /> Stop
                </>
              ) : mode === "qa" ? (
                <>
                  <Send className="w-5 h-5" /> Ask & Listen
                </>
              ) : (
                <>
                  <Volume2 className="w-5 h-5" /> Generate Voice
                </>
              )}
            </Button>

            {/* Usage Tracker */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                <span>{usage.voiceMinutes.toFixed(1)}/{usage.maxVoiceMinutes} min</span>
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full gradient-hero rounded-full transition-all"
                    style={{ width: `${(usage.voiceMinutes / usage.maxVoiceMinutes) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                <span>{usage.transcriptionMinutes.toFixed(1)}/{usage.maxTranscriptionMinutes} min</span>
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full gradient-warm rounded-full transition-all"
                    style={{ width: `${(usage.transcriptionMinutes / usage.maxTranscriptionMinutes) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default VoiceDemoSection;
