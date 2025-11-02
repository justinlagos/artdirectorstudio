import { Link } from "react-router-dom";
import { Sparkles, Mail, HelpCircle, FileText, Shield, Cookie } from "lucide-react";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/30 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-6 max-w-7xl py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4 text-primary-foreground" strokeWidth={2} />
              </div>
              <span className="font-display font-semibold text-lg">ArtDirector</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Professional AI-powered creative analysis and generation platform.
            </p>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm tracking-wide">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  to="/" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2 min-h-[44px]"
                >
                  Studio
                </Link>
              </li>
              <li>
                <Link 
                  to="/gallery" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2 min-h-[44px]"
                >
                  Explore
                </Link>
              </li>
              <li>
                <Link 
                  to="/analytics" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2 min-h-[44px]"
                >
                  Analytics
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm tracking-wide">Support</h3>
            <ul className="space-y-3">
              <li>
                <a 
                  href="mailto:support@artdirector.app" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2 min-h-[44px]"
                >
                  <Mail className="w-4 h-4" />
                  Contact
                </a>
              </li>
              <li>
                <a 
                  href="#help" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2 min-h-[44px]"
                >
                  <HelpCircle className="w-4 h-4" />
                  Help Center
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm tracking-wide">Legal</h3>
            <ul className="space-y-3">
              <li>
                <a 
                  href="#terms" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2 min-h-[44px]"
                >
                  <FileText className="w-4 h-4" />
                  Terms of Service
                </a>
              </li>
              <li>
                <a 
                  href="#privacy" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2 min-h-[44px]"
                >
                  <Shield className="w-4 h-4" />
                  Privacy Policy
                </a>
              </li>
              <li>
                <a 
                  href="#cookies" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2 min-h-[44px]"
                >
                  <Cookie className="w-4 h-4" />
                  Cookie Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/30">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">
              © {currentYear} ArtDirector. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Powered by Lovable AI + Gemini Vision
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
