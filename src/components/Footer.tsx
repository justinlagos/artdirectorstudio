import { Link } from "react-router-dom";
import { Sparkles, Mail, HelpCircle, FileText, Shield, Cookie, Blend, Maximize2, Layers } from "lucide-react";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/30 bg-gradient-to-b from-background to-surface-2 mt-auto">
      <div className="container mx-auto px-6 max-w-7xl py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Platform */}
          <div className="space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4 text-primary-foreground" strokeWidth={2} />
              </div>
              <span className="font-display font-semibold text-lg">ArtDirector</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Professional AI-powered creative analysis and generation platform.
            </p>
            <div className="space-y-2">
              <h3 className="font-semibold text-sm tracking-wide">Platform</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Studio
                  </Link>
                </li>
                <li>
                  <Link to="/inspire" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Inspire
                  </Link>
                </li>
                <li>
                  <Link to="/analytics" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Analytics
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-6">
            <h3 className="font-semibold text-sm tracking-wide">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2">
                  <Cookie className="w-4 h-4" />
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-6">
            <h3 className="font-semibold text-sm tracking-wide">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  Help Center
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/30">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">
              © {currentYear} ArtDirector Studio. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Built with AI precision
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
