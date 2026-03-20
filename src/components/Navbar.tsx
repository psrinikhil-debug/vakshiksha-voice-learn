import { useState } from "react";
import { motion } from "framer-motion";
import { Mic, Menu, X, Sun, Moon, Crown } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Link } from "react-router-dom";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Demo", href: "#demo" },
  { label: "Scenarios", href: "#scenarios" },
  { label: "How It Works", href: "#how-it-works" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { isDark, toggle } = useTheme();

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 gradient-glass border-b border-border/30"
    >
      <div className="container max-w-6xl mx-auto flex items-center justify-between h-16 px-4">
        <a href="#" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg gradient-hero flex items-center justify-center">
            <Mic className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold font-display">VakSiksha</span>
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(l => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </a>
          ))}
          <button
            onClick={toggle}
            className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link
            to="/pro"
            className="px-5 py-2 rounded-full gradient-warm text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            <Crown className="w-3.5 h-3.5" /> Pro
          </Link>
          <a
            href="#demo"
            className="px-5 py-2 rounded-full gradient-hero text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Try Now
          </a>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="md:hidden gradient-glass border-t border-border/30 px-4 py-4"
        >
          {navLinks.map(l => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={toggle}
              className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              to="/pro"
              onClick={() => setOpen(false)}
              className="px-4 py-2.5 rounded-full gradient-warm text-primary-foreground text-sm font-semibold text-center flex items-center justify-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5" /> Pro
            </Link>
            <a
              href="#demo"
              onClick={() => setOpen(false)}
              className="flex-1 text-center px-5 py-2.5 rounded-full gradient-hero text-primary-foreground text-sm font-semibold"
            >
              Try Now
            </a>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
