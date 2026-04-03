import { Button } from "@/components/ui/button";
import { Download, Chrome, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const ExtensionDownload = () => {
  const handleDownload = () => {
    fetch("/vakshiksha-dubbing-extension.zip")
      .then((res) => {
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "vakshiksha-dubbing-extension.zip";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((err) => alert(err.message));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full text-center space-y-8"
      >
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-4xl shadow-lg">
          🎬
        </div>

        <h1 className="text-3xl font-bold text-foreground">
          Vakshiksha AI Dubbing Extension
        </h1>
        <p className="text-muted-foreground">
          Dub any video on the web into 13+ languages directly in your browser. 
          The extension detects videos on any page and overlays dubbed audio instantly.
        </p>

        <Button
          size="lg"
          onClick={handleDownload}
          className="gap-2 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-600 hover:to-indigo-600"
        >
          <Download className="w-5 h-5" />
          Download Extension (.zip)
        </Button>

        <div className="bg-muted/30 rounded-xl p-6 text-left space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Chrome className="w-5 h-5" /> Installation Steps
          </h3>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Download and unzip the file</li>
            <li>Open <code className="bg-muted px-1.5 py-0.5 rounded text-xs">chrome://extensions</code> in Chrome</li>
            <li>Enable <strong>Developer mode</strong> (toggle top-right)</li>
            <li>Click <strong>Load unpacked</strong> and select the unzipped folder</li>
            <li>Sign in with your Vakshiksha Pro account in the extension popup</li>
          </ol>
          <p className="text-xs text-muted-foreground/70 mt-2">
            Works on Chrome, Edge, Brave, Arc, and Opera.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ExtensionDownload;
