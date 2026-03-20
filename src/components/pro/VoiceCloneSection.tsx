import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Mic, Upload, Loader2, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVoiceClone } from "@/hooks/useVoiceClone";

const VoiceCloneSection = () => {
  const { clones, loading, cloning, error, fetchClones, cloneVoice } = useVoiceClone();
  const [name, setName] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchClones();
  }, [fetchClones]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], "voice_sample.webm", { type: "audio/webm" });
        setAudioFile(file);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      // Microphone permission denied
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleClone = async () => {
    if (!name.trim() || !audioFile) return;
    try {
      await cloneVoice(name, audioFile);
      setName("");
      setAudioFile(null);
    } catch {
      // Error handled in hook
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold font-display mb-2">Voice Cloning</h3>
        <p className="text-muted-foreground">Clone your voice and use it as your AI assistant's voice</p>
      </div>

      {/* Name */}
      <Input
        placeholder="Voice name — e.g. 'My Voice'"
        value={name}
        onChange={e => setName(e.target.value)}
      />

      {/* Audio Input */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          variant={isRecording ? "destructive" : "outline"}
          onClick={isRecording ? stopRecording : startRecording}
          className="gap-2"
        >
          <Mic className={`w-4 h-4 ${isRecording ? "animate-pulse" : ""}`} />
          {isRecording ? "Stop Recording" : "Record Voice Sample"}
        </Button>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={e => e.target.files?.[0] && setAudioFile(e.target.files[0])}
            className="hidden"
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full gap-2">
            <Upload className="w-4 h-4" />
            {audioFile ? audioFile.name : "Upload Audio"}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Record at least 30 seconds of clear speech for best results. Avoid background noise.
      </p>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <Button
        onClick={handleClone}
        disabled={!name.trim() || !audioFile || cloning}
        className="gradient-hero text-primary-foreground gap-2"
      >
        {cloning ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Cloning Voice...</>
        ) : (
          <><Mic className="w-4 h-4" /> Clone My Voice</>
        )}
      </Button>

      {/* Existing Clones */}
      {clones.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Your Cloned Voices</h4>
          {clones.map(clone => (
            <motion.div
              key={clone.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/40"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg gradient-cool flex items-center justify-center">
                  <Mic className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">{clone.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(clone.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <CheckCircle className="w-4 h-4 text-secondary" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VoiceCloneSection;
