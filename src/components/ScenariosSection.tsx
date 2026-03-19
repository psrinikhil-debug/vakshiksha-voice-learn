import { motion } from "framer-motion";
import { School, MessageCircle, Briefcase, Sprout, Baby } from "lucide-react";

const scenarios = [
  {
    icon: School,
    title: "Classroom Learning",
    description: "AI teacher voice explains complex topics clearly. Listen, learn, and revise at your own pace.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: MessageCircle,
    title: "Communication Skills",
    description: "Practice real conversations with AI. Build confidence in speaking any language fluently.",
    color: "bg-secondary/10 text-secondary",
  },
  {
    icon: Briefcase,
    title: "Interview Preparation",
    description: "Mock interviews with voice AI. Get feedback on answers, tone, and confidence.",
    color: "bg-accent/10 text-accent",
  },
  {
    icon: Sprout,
    title: "Rural Education",
    description: "Voice-heavy, low-text interface designed for learners with limited literacy or device access.",
    color: "bg-secondary/10 text-secondary",
  },
  {
    icon: Baby,
    title: "Kids Learning",
    description: "Fun voices, colorful UI, and interactive lessons designed to keep young learners engaged.",
    color: "bg-primary/10 text-primary",
  },
];

const ScenariosSection = () => {
  return (
    <section id="scenarios" className="py-24 px-4">
      <div className="container max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-sm font-medium mb-4">
            Use Cases
          </span>
          <h2 className="text-3xl md:text-5xl font-bold font-display mb-4">
            Learning for <span className="text-gradient-hero">Every Scenario</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Voice-first modules tailored to real-world educational needs
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenarios.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group bg-card rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 border border-border/50 cursor-pointer"
            >
              <div className={`w-14 h-14 rounded-2xl ${s.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <s.icon className="w-7 h-7" />
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

export default ScenariosSection;
