import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map short language codes to Murf locale codes
const LOCALE_MAP: Record<string, string> = {
  hi: "hi_IN", ta: "ta_IN", te: "te_IN", bn: "bn_IN", mr: "mr_IN",
  gu: "gu_IN", kn: "kn_IN", ml: "ml_IN", es: "es_ES", fr: "fr_FR",
  de: "de_DE", ja: "ja_JP", zh: "zh_CN", en: "en_US", ko: "ko_KR",
  it: "it_IT", pt: "pt_BR", pl: "pl_PL", ru: "ru_RU", tr: "tr_TR",
  ar: "ar_SA", nl: "nl_NL", sv: "sv_SE", da: "da_DK", fi: "fi_FI",
  no: "nb_NO", id: "id_ID", vi: "vi_VN", th: "th_TH",
};

function toLocale(code: string): string {
  return LOCALE_MAP[code] || code;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MURF_API_KEY = Deno.env.get("AI_VIDEO_DUBBING_API_KEY");
    if (!MURF_API_KEY) throw new Error("AI video dubbing API key not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");

    // Check pro subscription
    const { data: sub } = await supabase
      .from("pro_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!sub) throw new Error("Pro subscription required");

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Check dubbing status
    if (action === "status") {
      const jobId = url.searchParams.get("dubbing_id");
      if (!jobId) throw new Error("dubbing_id required");

      const { data: job } = await supabase
        .from("dubbing_jobs")
        .select("id")
        .eq("dubbing_id", jobId)
        .single();
      if (!job) throw new Error("Dubbing job not found or access denied");

      const statusRes = await fetch(
        `https://api.murf.ai/v1/murfdub/jobs/${jobId}/status`,
        {
          method: "GET",
          headers: { "api-key": MURF_API_KEY },
        }
      );
      const statusData = await statusRes.json();
      console.log("Murf status response:", JSON.stringify(statusData));

      // Normalize status: Murf uses COMPLETED/FAILED/IN_PROGRESS etc.
      const rawStatus = (statusData.status || "").toLowerCase();
      let normalizedStatus = rawStatus;
      if (rawStatus === "completed" || rawStatus === "success") {
        normalizedStatus = "dubbed";
      } else if (rawStatus === "failed" || rawStatus === "error") {
        normalizedStatus = "failed";
      } else {
        normalizedStatus = "processing";
      }

      // Extract download URL from download_details array if top-level is null
      const dlUrl = statusData.download_url
        || statusData.download_details?.[0]?.download_url
        || null;

      return new Response(JSON.stringify({
        ...statusData,
        status: normalizedStatus,
        download_url: dlUrl,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download dubbed audio
    if (action === "download") {
      const jobId = url.searchParams.get("dubbing_id");
      if (!jobId) throw new Error("dubbing_id required");

      const { data: job } = await supabase
        .from("dubbing_jobs")
        .select("id")
        .eq("dubbing_id", jobId)
        .single();
      if (!job) throw new Error("Dubbing job not found or access denied");

      // Get the status which includes download_url when completed
      const resultRes = await fetch(
        `https://api.murf.ai/v1/murfdub/jobs/${jobId}/status`,
        {
          method: "GET",
          headers: { "api-key": MURF_API_KEY },
        }
      );
      const resultData = await resultRes.json();
      console.log("Murf download result:", JSON.stringify(resultData));

      const downloadUrl = resultData.download_url
        || resultData.download_details?.[0]?.download_url
        || resultData.output_url || resultData.audio_url || resultData.url;
      if (!downloadUrl) throw new Error("No download URL available yet");

      const dlRes = await fetch(downloadUrl);
      if (!dlRes.ok) throw new Error(`Download failed: ${dlRes.status}`);

      return new Response(dlRes.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": dlRes.headers.get("Content-Type") || "audio/mpeg",
          "Content-Disposition": `attachment; filename="dubbed.mp3"`,
        },
      });
    }

    // Create dubbing job — supports both file upload and URL
    const contentType = req.headers.get("content-type") || "";
    let targetLang: string;
    let sourceLang: string;
    let fileUrl: string | null = null;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      fileUrl = body.source_url;
      targetLang = body.target_lang || "hi";
      sourceLang = body.source_lang || "en";

      if (!fileUrl || typeof fileUrl !== "string") {
        throw new Error("source_url is required");
      }
      if (fileUrl.length > 2048) {
        throw new Error("URL too long");
      }
    } else {
      // File upload: store in Supabase storage to get a public URL
      const formData = await req.formData();
      const videoFile = formData.get("video") as File;
      targetLang = (formData.get("target_lang") as string) || "hi";
      sourceLang = (formData.get("source_lang") as string) || "en";

      if (!videoFile) throw new Error("Video file required");

      const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
      if (videoFile.size > MAX_VIDEO_BYTES) {
        throw new Error("Video file too large (max 100 MB)");
      }
      if (!videoFile.type.startsWith("video/") && !videoFile.type.startsWith("audio/")) {
        throw new Error("Invalid file type. Please upload a video or audio file.");
      }

      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const fileName = `dubbing/${user.id}/${Date.now()}_${videoFile.name}`;
      const arrayBuffer = await videoFile.arrayBuffer();
      const { error: uploadError } = await serviceClient.storage
        .from("chat-uploads")
        .upload(fileName, arrayBuffer, { contentType: videoFile.type, upsert: true });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw new Error("Failed to upload video. Please try again.");
      }

      const { data: publicUrlData } = serviceClient.storage
        .from("chat-uploads")
        .getPublicUrl(fileName);

      fileUrl = publicUrlData.publicUrl;
    }

    // Build multipart/form-data for Murf API
    const targetLocale = toLocale(targetLang);
    const sourceLocale = toLocale(sourceLang);

    const murfForm = new FormData();
    murfForm.append("file_url", fileUrl!);
    murfForm.append("target_locales", targetLocale);
    murfForm.append("source_locale", sourceLocale);

    console.log("Calling Murf dub API with:", JSON.stringify({
      file_url: fileUrl,
      target_locales: targetLocale,
      source_locale: sourceLocale,
    }));

    const response = await fetch("https://api.murf.ai/v1/murfdub/jobs/create", {
      method: "POST",
      headers: {
        "api-key": MURF_API_KEY,
        // Do NOT set Content-Type — fetch will set multipart boundary automatically
      },
      body: murfForm,
    });

    const data = await response.json();
    console.log("Murf dub response:", JSON.stringify(data));

    if (!response.ok) {
      const murfError = data?.error?.message || data?.message || data?.error || data?.detail || "Video dubbing failed";
      console.error("Murf dubbing error:", JSON.stringify(data));
      throw new Error(typeof murfError === "string" ? murfError : "Video dubbing failed. Please try again.");
    }

    // Murf returns job_id
    const jobId = data.job_id || data.id || data.dubbing_id;
    if (jobId) {
      const { error: insertError } = await supabase
        .from("dubbing_jobs")
        .insert({
          user_id: user.id,
          dubbing_id: String(jobId),
          target_lang: targetLang,
          source_lang: sourceLang,
        });
      if (insertError) {
        console.error("Failed to store dubbing job:", insertError);
      }
    }

    return new Response(JSON.stringify({ ...data, dubbing_id: jobId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Dubbing error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const safeMsg = msg.includes("required") || msg.includes("Not authenticated") || msg.includes("Pro subscription") || msg.includes("Please try again") || msg.includes("not found") || msg.includes("URL too long") || msg.includes("too large") || msg.includes("Invalid file type") || msg.includes("not configured") || msg.includes("Failed to upload")
      ? msg : "Dubbing error. Please try again.";
    return new Response(JSON.stringify({ error: safeMsg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
