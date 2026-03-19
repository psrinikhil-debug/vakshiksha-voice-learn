import { Mic, Github, Twitter, Mail } from "lucide-react";

const FooterSection = () => {
  return (
    <footer className="bg-foreground text-primary-foreground py-16 px-4">
      <div className="container max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
                <Mic className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold font-display">VakSiksha</span>
            </div>
            <p className="text-primary-foreground/60 max-w-sm leading-relaxed">
              AI-powered voice learning for everyone. Empowering education through intelligent voice technology across all languages.
            </p>
          </div>

          <div>
            <h4 className="font-semibold font-display mb-4">Platform</h4>
            <ul className="space-y-2 text-primary-foreground/60">
              <li><a href="#features" className="hover:text-primary-foreground transition-colors">Features</a></li>
              <li><a href="#demo" className="hover:text-primary-foreground transition-colors">Try Demo</a></li>
              <li><a href="#scenarios" className="hover:text-primary-foreground transition-colors">Use Cases</a></li>
              <li><a href="#how-it-works" className="hover:text-primary-foreground transition-colors">How It Works</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold font-display mb-4">Connect</h4>
            <div className="flex gap-3">
              {[Github, Twitter, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 rounded-lg bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-primary-foreground/40">
          <p>© 2026 VakSiksha. Learn. Speak. Grow.</p>
          <p>Built with ❤️ for inclusive education</p>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
