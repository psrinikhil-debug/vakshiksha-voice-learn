import { motion } from "framer-motion";
import { Mic, Brain, Volume2, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: Mic,
    step: "01",
    title: "Speak or Type",
    description: "Enter your question or topic by voice or text input.",
  },
  {
    icon: Brain,
    step: "02",
    title: "AI Processes",
    description: "Our AI understands context, searches the web, and generates accurate answers.",
  },
  {
    icon: Volume2,
    step: "03",
    title: "Listen & Learn",
    description: "Hear the answer in a natural AI voice — no repeated text, just clear spoken responses.",
  },
  {
    icon: CheckCircle,
    step: "04",
    title: "Practice & Grow",
    description: "Interact with follow-up questions, translations, and scenario-based exercises.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 px-4 bg-muted/30">
      <div className="container max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            How It Works
          </span>
          <h2 className="text-3xl md:text-5xl font-bold font-display mb-4">
            Simple as <span className="text-gradient-warm">Speaking</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="text-center"
            >
              <div className="relative mb-6 mx-auto w-20 h-20">
                <div className="w-20 h-20 rounded-2xl gradient-hero flex items-center justify-center shadow-glow">
                  <s.icon className="w-8 h-8 text-primary-foreground" />
                </div>
                <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center shadow-lg">
                  {s.step}
                </span>
              </div>
              <h3 className="text-lg font-semibold font-display mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{s.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
