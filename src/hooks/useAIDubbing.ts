import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DubbingStatus = "idle" | "uploading" | "processing" | "done" | "error";

const TARGET_LANGUAGES = [
  { code: "hi", label: "Hindi" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "bn", label: "Bengali" },
  { code: "mr", label: "Marathi" },
  { code: "gu", label: "Gujarati" },
  { code: "kn", label: "Kannada" },
  { code: "ml", label: "Malayalam" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese" },
];

export { TARGET_LANGUAGES };

export function useAIDubbing() {
  const [status, setStatus] = useState<DubbingStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dubbedAudioUrl, setDubbedAudioUrl] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const pollForCompletion = useCallback(
    (dubbingId: string, targetLang: string, accessToken: string) => {
      setStatus("processing");

      pollingRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/murf-dub?action=status&dubbing_id=${dubbingId}`,&dubbing_id=${dubbingId}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
            }
          );
          const statusData = await statusRes.json();

          if (statusData.status === "dubbed") {
            stopPolling();
            const dlRes = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/murf-dub?action=download&dubbing_id=${dubbingId}&language_code=${targetLang}`,&dubbing_id=${dubbingId}&language_code=${targetLang}`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                },
              }
            );
            const blob = await dlRes.blob();
            const url = URL.createObjectURL(blob);
            setDubbedAudioUrl(url);
            setStatus("done");
            setProgress(100);
          } else if (statusData.status === "failed") {
            stopPolling();
            throw new Error("Dubbing failed");
          } else {
            setProgress((p) => Math.min(p + 5, 90));
          }
        } catch (err: unknown) {
          stopPolling();
          setError(err instanceof Error ? err.message : "Polling failed");
          setStatus("error");
        }
      }, 5000);
    },
    []
  );

  const startDubbing = useCallback(
    async (videoFile: File, targetLang: string, sourceLang = "en") => {
      setStatus("uploading");
      setError(null);
      setDubbedAudioUrl(null);
      setProgress(0);
      stopPolling();

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const formData = new FormData();
        formData.append("video", videoFile);
        formData.append("target_lang", targetLang);
        formData.append("source_lang", sourceLang);

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/murf-dub`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: formData,
          }
        );

        const data = await res.json();
        if (!res.ok || data.error)
          throw new Error(data.error || "Dubbing failed");

        pollForCompletion(data.dubbing_id, targetLang, session.access_token);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Dubbing failed");
        setStatus("error");
      }
    },
    [pollForCompletion]
  );

  const startDubbingFromUrl = useCallback(
    async (videoUrl: string, targetLang: string, sourceLang = "en") => {
      setStatus("uploading");
      setError(null);
      setDubbedAudioUrl(null);
      setProgress(0);
      stopPolling();

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/murf-dub`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              source_url: videoUrl,
              target_lang: targetLang,
              source_lang: sourceLang,
            }),
          }
        );

        const data = await res.json();
        if (!res.ok || data.error)
          throw new Error(data.error || "Dubbing failed");

        pollForCompletion(data.dubbing_id, targetLang, session.access_token);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Dubbing failed");
        setStatus("error");
      }
    },
    [pollForCompletion]
  );

  const reset = useCallback(() => {
    stopPolling();
    setStatus("idle");
    setProgress(0);
    setError(null);
    setDubbedAudioUrl(null);
  }, []);

  return {
    status,
    progress,
    error,
    dubbedAudioUrl,
    startDubbing,
    startDubbingFromUrl,
    reset,
  };
}
