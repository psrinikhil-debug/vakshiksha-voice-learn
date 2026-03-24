import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, Languages, Loader2, CheckCircle, AlertCircle, Download, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAIDubbing, TARGET_LANGUAGES } from "@/hooks/useAIDubbing";

type InputMode = "file" | "url";

const DubbingSection = () => {
  const { status, progress, error, dubbedAudioUrl, startDubbing, startDubbingFromUrl, reset } = useAIDubbing();
  const [inputMode, setInputMode] = useState<InputMode>("url");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [targetLang, setTargetLang] = useState("hi");
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputMode === "file" && videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    if (inputMode === "url" && videoUrl) {
      setVideoPreviewUrl(videoUrl);
      return;
    }
    setVideoPreviewUrl(null);
  }, [videoFile, videoUrl, inputMode]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      reset();
    }
  };

  const handleDub = () => {
    if (inputMode === "file") {
      if (!videoFile) return;
      startDubbing(videoFile, targetLang);
    } else {
      if (!videoUrl.trim()) return;
      startDubbingFromUrl(videoUrl.trim(), targetLang);
    }
  };

  const canStart =
    (inputMode === "file" ? !!videoFile : !!videoUrl.trim()) &&
    status !== "uploading" &&
    status !== "processing";

  const handleReset = () => {
    reset();
    setVideoFile(null);
    setVideoUrl("");
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold font-display mb-2">AI Video Dubbing</h3>
        <p className="text-muted-foreground">Provide a video link or upload a file and translate its audio to any language</p>
      </div>

      {/* Input Mode Toggle */}
      <div className="flex items-center gap-2 bg-muted/40 rounded-xl p-1 w-fit mx-auto">
        {[
          { id: "url" as InputMode, icon: Link, label: "Paste Link" },
          { id: "file" as InputMode, icon: Upload, label: "Upload File" },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => { setInputMode(id); reset(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              inputMode === id
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* URL Input */}
      {inputMode === "url" && (
        <div className="space-y-2">
          <input
            type="url"
            value={videoUrl}
            onChange={e => { setVideoUrl(e.target.value); reset(); }}
            placeholder="Paste a video URL (YouTube, direct MP4 link, etc.)"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 outline-none"
          />
          <p className="text-xs text-muted-foreground">Supports YouTube, direct video URLs, and most public video links</p>
        </div>
      )}

      {/* File Upload Area */}
      {inputMode === "file" && (
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
      )}

      {/* Video Preview */}
      {videoPreviewUrl && inputMode === "file" && (
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
            {status === "uploading" ? "Sending video..." : "AI is dubbing your video..."}
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
          disabled={!canStart}
          className="gradient-hero text-primary-foreground gap-2"
        >
          {status === "uploading" || status === "processing" ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
          ) : (
            <><Languages className="w-4 h-4" /> Start Dubbing</>
          )}
        </Button>
        {status !== "idle" && (
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
        )}
      </div>
    </div>
  );
};

export default DubbingSection;
