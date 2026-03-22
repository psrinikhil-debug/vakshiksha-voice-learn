import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function useProSubscription() {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkPro = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsPro(false);
        setLoading(false);
        return;
      }
      const { data } = await supabase.functions.invoke("check-pro");
      setIsPro(data?.isPro || false);
    } catch {
      setIsPro(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkPro();
  }, [user, checkPro]);

  const subscribe = useCallback(async () => {
    if (!user) throw new Error("Please sign in first");
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke("razorpay-order", {
        body: { action: "create_order" },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);

      // Load Razorpay script if not present
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://checkout.razorpay.com/v1/checkout.js";
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("Failed to load Razorpay"));
          document.head.appendChild(s);
        });
      }

      return new Promise<boolean>((resolve) => {
        const options = {
          key: data.keyId,
          amount: data.order.amount,
          currency: data.order.currency,
          name: "VakSiksha Pro",
          description: "Monthly Pro Subscription — ₹1/month",
          order_id: data.order.id,
          handler: async (response: any) => {
            try {
              const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
                "razorpay-order",
                {
                  body: {
                    action: "verify_payment",
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  },
                }
              );
              if (verifyError || verifyData?.error) {
                resolve(false);
                return;
              }
              setIsPro(true);
              resolve(true);
            } catch {
              resolve(false);
            }
          },
          prefill: { email: user.email },
          theme: { color: "#7c3aed" },
          modal: {
            ondismiss: () => resolve(false),
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      });
    } finally {
      setPaying(false);
    }
  }, [user]);

  return { isPro, loading, paying, user, subscribe, checkPro };
}
