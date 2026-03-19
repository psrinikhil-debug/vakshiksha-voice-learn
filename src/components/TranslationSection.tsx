import { useState } from "react";
import { motion } from "framer-motion";
import { Languages, Volume2, Loader2, ArrowRightLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

interface Translations {
  english: string;
  hindi: string;
  telugu: string;
  detectedLanguage: string;
}

const langMeta: Record<string, { label: string; native: string; flag: string; voiceId: string }> = {
  english: { label: "English", native: "English", flag: "🇺🇸", voiceId: "en-US-natalie" },
  hindi: { label: "Hindi", native: "हिन्दी", flag: "🇮🇳", voiceId: "hi-IN-shweta" },
  telugu: { label: "Telugu", native: "తెలుగు", flag: "🇮🇳", voiceId: "en-IN-isha" },
};

const TranslationSection = () => {
  const [inputText, setInputText] = useState("");
  const [translations, setTranslations] = useState<Translations | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [speakingLang, setSpeakingLang] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTranslate = async () => {
    if (!inputText.trim() || isTranslating) return;
    setIsTranslating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("translate", {
        body: { text: inputText.trim() },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setTranslations(data);
    } catch (err: unknown) {
      console.error("Translation error:", err);
      setError(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setIsTranslating(false);
    }
  };

  const speakTranslation = async (lang: string, text: string) => {
    if (speakingLang || !text) return;
    setSpeakingLang(lang);

    try {
      const voiceId = langMeta[lang]?.voiceId || "en-US-natalie";
      const { data, error: fnError } = await supabase.functions.invoke("murf-tts", {
        body: { text, voiceId, format: "MP3" },
      });

      if (fnError || data?.error) {
        // Fallback to browser TTS
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.onend = () => setSpeakingLang(null);
        speechSynthesis.speak(utterance);
        return;
      }

      if (data?.audioFile) {
        const audio = new Audio(data.audioFile);
        audio.onended = () => setSpeakingLang(null);
        audio.onerror = () => setSpeakingLang(null);
        await audio.play();
      } else {
        setSpeakingLang(null);
      }
    } catch {
      setSpeakingLang(null);
    }
  };

  const langKeys = ["english", "hindi", "telugu"] as const;

  return (
    <section id="translate" className="py-24 px-4 bg-background">
      <div className="container max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Languages className="w-4 h-4 inline mr-1 -mt-0.5" />
            Multilingual
          </span>
          <h2 className="text-3xl md:text-5xl font-bold font-display mb-4">
            Learn in <span className="text-gradient-warm">Your Language</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Type in any language — English, Hindi, Telugu, or even mixed — and see instant side-by-side translations with voice playback
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-card rounded-3xl p-6 md:p-8 shadow-card border border-border/50"
        >
          {/* Input */}
          <div className="mb-6">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Enter text in any language (supports mixed-language input)
            </label>
            <div className="flex gap-3">
              <Textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="e.g. 'The sun rises in the east' or 'सूरज पूर्व में उगता है' or mix them..."
                className="min-h-[80px] text-base resize-none rounded-xl border-border/60 flex-1"
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleTranslate();
                  }
                }}
              />
              <Button
                onClick={handleTranslate}
                disabled={!inputText.trim() || isTranslating}
                className="gradient-hero hover:opacity-90 text-primary-foreground rounded-xl px-6 self-end"
                size="lg"
              >
                {isTranslating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-1.5" /> Translate
                  </>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Translation Cards */}
          {translations && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {langKeys.map((lang, i) => {
                const meta = langMeta[lang];
                const text = translations[lang];
                const isDetected = translations.detectedLanguage === lang;
                const isSpeaking = speakingLang === lang;

                return (
                  <motion.div
                    key={lang}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`relative rounded-2xl border p-5 transition-all ${
                      isDetected
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/50 bg-muted/20"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{meta.flag}</span>
                        <div>
                          <span className="text-sm font-semibold text-foreground">{meta.label}</span>
                          <span className="text-xs text-muted-foreground ml-1.5">{meta.native}</span>
                        </div>
                      </div>
                      {isDetected && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                          Source
                        </span>
                      )}
                    </div>

                    {/* Translation text */}
                    <p className="text-foreground text-base leading-relaxed mb-4 min-h-[48px]">
                      {text}
                    </p>

                    {/* Speak button */}
                    <button
                      onClick={() => speakTranslation(lang, text)}
                      disabled={!!speakingLang}
                      className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                        isSpeaking
                          ? "text-primary"
                          : "text-muted-foreground hover:text-primary"
                      }`}
                    >
                      {isSpeaking ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                      {isSpeaking ? "Playing..." : "Listen"}
                    </button>

                    {/* Connector lines between cards (desktop) */}
                    {i < 2 && (
                      <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                        <ArrowRightLeft className="w-4 h-4 text-border" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Hint */}
          {!translations && !isTranslating && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Languages className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>Enter text above and click Translate to see side-by-side translations</p>
              <p className="mt-1 text-xs opacity-70">Supports code-switching — mix Hindi, Telugu & English freely!</p>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default TranslationSection;
