import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useVoice } from "@/hooks/useVoice";
import WaveformVisualizer from "@/components/WaveformVisualizer";

const accents = ["US English", "UK English", "Indian English", "Australian English"];
const voiceTypes = ["Female", "Male"];

const VoiceDemoSection = () => {
  const { isSpeaking, isListening, isLoading, transcript, usage, error, speak, stopSpeaking, startListening, setTranscript } = useVoice();
  const [text, setText] = useState("");
  const [selectedAccent, setSelectedAccent] = useState(accents[0]);
  const [selectedVoice, setSelectedVoice] = useState(voiceTypes[0]);
  const [waveActive, setWaveActive] = useState(false);

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

  const handleGenerate = () => {
    if (!text.trim()) return;
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speak(text, selectedAccent, selectedVoice);
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
            Type or speak — hear AI bring your text to life with Murf AI
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-card rounded-3xl p-6 md:p-8 shadow-card border border-border/50"
        >
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
          </div>

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
              placeholder="Type something to convert to speech, or click the mic to speak..."
              className="min-h-[120px] text-base resize-none pr-14 rounded-xl border-border/60"
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
              onClick={handleGenerate}
              disabled={(!text.trim() && !isSpeaking) || isLoading}
              className="gradient-hero hover:opacity-90 text-primary-foreground rounded-xl px-6 gap-2"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Generating...
                </>
              ) : isSpeaking ? (
                <>
                  <VolumeX className="w-5 h-5" /> Stop
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
