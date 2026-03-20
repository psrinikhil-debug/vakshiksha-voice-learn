import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, Languages, Loader2, CheckCircle, AlertCircle, Play, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAIDubbing, TARGET_LANGUAGES } from "@/hooks/useAIDubbing";

const DubbingSection = () => {
  const { status, progress, error, dubbedAudioUrl, startDubbing, reset } = useAIDubbing();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState("hi");
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setVideoPreviewUrl(null);
  }, [videoFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      reset();
    }
  };

  const handleDub = () => {
    if (!videoFile) return;
    startDubbing(videoFile, targetLang);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold font-display mb-2">AI Video Dubbing</h3>
        <p className="text-muted-foreground">Upload a video and translate its audio to any language</p>
      </div>

      {/* Upload Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-border/60 rounded-2xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium">
          {videoFile ? videoFile.name : "Click to upload video"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">MP4, MOV, WebM — max 100MB</p>
      </div>

      {/* Video Preview */}
      {videoPreviewUrl && (
        <div className="rounded-xl overflow-hidden border border-border/50">
          <video src={videoPreviewUrl} controls className="w-full max-h-64 object-contain bg-black" />
        </div>
      )}

      {/* Language Selection */}
      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-sm font-medium">Target Language:</label>
        <select
          value={targetLang}
          onChange={e => setTargetLang(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium focus:ring-2 focus:ring-primary/30 outline-none"
        >
          {TARGET_LANGUAGES.map(l => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </div>

      {/* Progress */}
      {(status === "uploading" || status === "processing") && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            {status === "uploading" ? "Uploading video..." : "AI is dubbing your video..."}
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full gradient-hero rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Done */}
      {status === "done" && dubbedAudioUrl && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-secondary">
            <CheckCircle className="w-4 h-4" /> Dubbing complete!
          </div>
          <audio src={dubbedAudioUrl} controls className="w-full" />
          <a href={dubbedAudioUrl} download={`dubbed_${targetLang}.mp3`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" /> Download Dubbed Audio
            </Button>
          </a>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleDub}
          disabled={!videoFile || status === "uploading" || status === "processing"}
          className="gradient-hero text-primary-foreground gap-2"
        >
          {status === "uploading" || status === "processing" ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
          ) : (
            <><Languages className="w-4 h-4" /> Start Dubbing</>
          )}
        </Button>
        {status !== "idle" && (
          <Button variant="outline" onClick={() => { reset(); setVideoFile(null); }}>
            Reset
          </Button>
        )}
      </div>
    </div>
  );
};

export default DubbingSection;
