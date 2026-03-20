import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VoiceClone {
  id: string;
  name: string;
  elevenlabs_voice_id: string;
  created_at: string;
}

export function useVoiceClone() {
  const [clones, setClones] = useState<VoiceClone[]>([]);
  const [loading, setLoading] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClones = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("voice_clones")
        .select("*")
        .order("created_at", { ascending: false });
      setClones((data as any[]) || []);
    } catch {
      setClones([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const cloneVoice = useCallback(async (name: string, audioFile: File) => {
    setCloning(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("audio", audioFile);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-clone`,
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
      if (!res.ok || data.error) throw new Error(data.error || "Clone failed");

      await fetchClones();
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Voice cloning failed";
      setError(msg);
      throw err;
    } finally {
      setCloning(false);
    }
  }, [fetchClones]);

  return { clones, loading, cloning, error, fetchClones, cloneVoice };
}
