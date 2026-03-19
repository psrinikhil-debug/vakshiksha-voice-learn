import { motion } from "framer-motion";
import { Mic, Volume2, Globe, BookOpen, GraduationCap, MessageSquare } from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "Voice-Based Learning",
    description: "Speak or type — AI responds with natural voice. Learn hands-free, anywhere.",
    gradient: "gradient-hero",
  },
  {
    icon: Volume2,
    title: "Text-to-Speech",
    description: "Convert any text to lifelike speech with customizable voices and accents.",
    gradient: "gradient-warm",
  },
  {
    icon: MessageSquare,
    title: "Speech-to-Text",
    description: "Practice speaking and get instant transcriptions. Perfect for language learners.",
    gradient: "gradient-cool",
  },
  {
    icon: Globe,
    title: "Multilingual Support",
    description: "Learn in Hindi, Telugu, English and more. Side-by-side translations included.",
    gradient: "gradient-hero",
  },
  {
    icon: BookOpen,
    title: "Scenario Modules",
    description: "From classroom lessons to interview prep — voice-driven learning for every need.",
    gradient: "gradient-warm",
  },
  {
    icon: GraduationCap,
    title: "AI Dubbing",
    description: "Change video languages instantly. Learn content in your preferred language.",
    gradient: "gradient-cool",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 px-4">
      <div className="container max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Features
          </span>
          <h2 className="text-3xl md:text-5xl font-bold font-display mb-4">
            Everything You Need to{" "}
            <span className="text-gradient-hero">Learn by Voice</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            A complete voice-first learning ecosystem powered by AI
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group relative bg-card rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 border border-border/50"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold font-display mb-2">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
