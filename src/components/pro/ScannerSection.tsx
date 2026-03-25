import { motion } from "framer-motion";
import { Camera, ScanLine, Upload, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const ScannerSection = () => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold font-display mb-2 flex items-center justify-center gap-2">
          <ScanLine className="w-6 h-6 text-primary" /> Document Scanner
        </h3>
        <p className="text-muted-foreground text-sm">
          Scan documents & images for AI-powered analysis
        </p>
      </div>

      {/* Scanner preview area */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="border-2 border-dashed border-border/60 rounded-2xl p-12 text-center"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-muted/40 flex items-center justify-center">
            <Camera className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <div>
            <p className="font-medium text-foreground">Coming Soon</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
              Capture documents, textbooks, and handwritten notes with your camera for instant AI analysis and translation.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/30 text-sm text-muted-foreground">
              <Smartphone className="w-4 h-4" /> Mobile Camera Capture
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/30 text-sm text-muted-foreground">
              <Upload className="w-4 h-4" /> Image Upload
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/30 text-sm text-muted-foreground">
              <ScanLine className="w-4 h-4" /> OCR Text Extraction
            </div>
          </div>

          <Button disabled className="mt-4 gap-2" variant="outline">
            <Camera className="w-4 h-4" /> Open Scanner
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
        {[
          { title: "Scan & Translate", desc: "Capture text in any language and translate instantly" },
          { title: "Handwriting OCR", desc: "Recognize handwritten notes and convert to text" },
          { title: "Smart Analysis", desc: "AI analyzes documents and answers questions" },
        ].map((item, i) => (
          <div key={i} className="p-4 rounded-xl bg-muted/20 border border-border/30">
            <p className="text-sm font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScannerSection;
