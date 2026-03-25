import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Crown, Languages, Mic, Loader2, LogOut, ArrowLeft, MessageSquare, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProSubscription } from "@/hooks/useProSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import DubbingSection from "@/components/pro/DubbingSection";
import VoiceCloneSection from "@/components/pro/VoiceCloneSection";
import ProChatSection from "@/components/pro/ProChatSection";
import ScannerSection from "@/components/pro/ScannerSection";

type ProTab = "chat" | "dubbing" | "clone" | "scanner";

const Pro = () => {
  const { isPro, loading, paying, user, subscribe } = useProSubscription();
  const [activeTab, setActiveTab] = useState<ProTab>("chat");
  const navigate = useNavigate();

  useEffect(() => {
    // If not loading and no user, redirect to auth
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, user, navigate]);

  const handleSubscribe = async () => {
    try {
      const success = await subscribe();
      if (success) {
        toast.success("Welcome to VakSiksha Pro! 🎉");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/30 gradient-glass">
        <div className="container max-w-5xl mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg gradient-hero flex items-center justify-center">
                <Mic className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold font-display">VakSiksha</span>
            </Link>
            {isPro && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold gradient-warm text-primary-foreground flex items-center gap-1">
                <Crown className="w-3 h-3" /> PRO
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5">
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto px-4 py-8">
        {!isPro ? (
          /* Paywall */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto text-center"
          >
            <div className="bg-card rounded-3xl p-8 md:p-12 shadow-card border border-border/50">
              <div className="w-16 h-16 rounded-2xl gradient-warm flex items-center justify-center mx-auto mb-6">
                <Crown className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold font-display mb-3">VakSiksha Pro</h1>
              <p className="text-muted-foreground mb-6">
                Unlock AI Video Dubbing and Voice Cloning to supercharge your learning experience.
              </p>

              <div className="space-y-3 text-left mb-8">
                {[
                  { icon: Languages, text: "AI Video Dubbing — translate any video to 13+ languages" },
                  { icon: Mic, text: "Voice Cloning — make the AI speak in your own voice" },
                ].map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                    <div className="w-8 h-8 rounded-lg gradient-cool flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="text-sm">{text}</span>
                  </div>
                ))}
              </div>

              <div className="mb-6">
                <div className="text-4xl font-bold font-display">
                  ₹1<span className="text-lg font-normal text-muted-foreground">/month</span>
                </div>
              </div>

              <Button
                onClick={handleSubscribe}
                disabled={paying}
                className="w-full gradient-hero text-primary-foreground text-lg py-6 rounded-xl gap-2"
                size="lg"
              >
                {paying ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                ) : (
                  <><Crown className="w-5 h-5" /> Subscribe to Pro</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-3">Secure payment via Razorpay</p>
            </div>
          </motion.div>
        ) : (
          /* Pro Features */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Tabs */}
            <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
              {[
                { id: "chat" as ProTab, icon: MessageSquare, label: "AI Chat" },
                { id: "dubbing" as ProTab, icon: Languages, label: "AI Dubbing" },
                { id: "clone" as ProTab, icon: Mic, label: "Voice Clone" },
                { id: "scanner" as ProTab, icon: ScanLine, label: "Scanner" },
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeTab === id
                      ? "gradient-hero text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            <div className="bg-card rounded-3xl p-6 md:p-8 shadow-card border border-border/50">
              {activeTab === "chat" && user && <ProChatSection userId={user.id} />}
              {activeTab === "dubbing" && <DubbingSection />}
              {activeTab === "clone" && <VoiceCloneSection />}
              {activeTab === "scanner" && <ScannerSection />}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Pro;
