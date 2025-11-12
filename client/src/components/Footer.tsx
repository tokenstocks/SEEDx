import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Send,
  Shield,
  Lock,
  Award,
  Leaf,
  Info,
  Globe,
  ChevronDown,
  X,
  AlertTriangle,
  Twitter,
  Linkedin,
  Instagram,
  MessageCircle,
} from "lucide-react";
import { SiDiscord } from "react-icons/si";
import logoImage from "@assets/SEEDX_LOGO-removebg-preview_1762510980407.png";

export default function Footer() {
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  const platformLinks = [
    { label: "Browse Projects", href: "/#featured-farms" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "For Primers", href: "#" },
    { label: "For Regenerators", href: "#" },
    { label: "Token Exchange", href: "#" },
    { label: "Dashboard", href: "/dashboard" },
  ];

  const resourceLinks = [
    { label: "Documentation", href: "#" },
    { label: "FAQ", href: "/faq" },
    { label: "Blog", href: "#" },
    { label: "Case Studies", href: "#" },
    { label: "Whitepaper", href: "#" },
    { label: "API Docs", href: "#" },
    { label: "Capital Deployment Demo", href: "/admin/deployment" },
    { label: "Capital Flow Demo", href: "/admin/flow" },
  ];

  const companyLinks = [
    { label: "About Us", href: "/about" },
    { label: "Our Mission", href: "#" },
    { label: "Team", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Press Kit", href: "#" },
    { label: "Contact", href: "/contact" },
  ];

  const legalLinks = [
    { label: "Terms of Service", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Cookie Policy", href: "#" },
    { label: "Risk Disclosure", href: "#" },
    { label: "Compliance", href: "/compliance" },
    { label: "Licenses", href: "#" },
  ];

  return (
    <footer className="relative bg-slate-950 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 pt-20 pb-8">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 mb-16">
          {/* Brand Column - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <img 
                src={logoImage} 
                alt="SEEDx" 
                className="h-20 w-auto"
                data-testid="img-footer-logo"
              />
            </div>

            {/* Parent Organization */}
            <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="text-xs text-slate-500 mb-1">An Initiative of</div>
              <div className="text-sm font-semibold text-white">
                Sustainable Ecosystem for Economic Development
              </div>
              <div className="text-xs text-slate-400 mt-1">(SEED)</div>
            </div>

            <p className="text-slate-400 mb-6 leading-relaxed">
              Connecting capital with regenerative agriculture across Africa.
              Building a sustainable future, one farm at a time.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/50 flex items-center justify-center transition-all hover:-translate-y-1"
                aria-label="Twitter"
                data-testid="social-twitter"
              >
                <Twitter className="w-4 h-4 text-slate-400" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/50 flex items-center justify-center transition-all hover:-translate-y-1"
                aria-label="LinkedIn"
                data-testid="social-linkedin"
              >
                <Linkedin className="w-4 h-4 text-slate-400" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/50 flex items-center justify-center transition-all hover:-translate-y-1"
                aria-label="Instagram"
                data-testid="social-instagram"
              >
                <Instagram className="w-4 h-4 text-slate-400" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/50 flex items-center justify-center transition-all hover:-translate-y-1"
                aria-label="Telegram"
                data-testid="social-telegram"
              >
                <MessageCircle className="w-4 h-4 text-slate-400" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/50 flex items-center justify-center transition-all hover:-translate-y-1"
                aria-label="Discord"
                data-testid="social-discord"
              >
                <SiDiscord className="w-4 h-4 text-slate-400" />
              </a>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-white font-bold mb-4">Platform</h4>
            <ul className="space-y-3">
              {platformLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-slate-400 hover:text-amber-500 transition-colors text-sm"
                    data-testid={`link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="text-white font-bold mb-4">Resources</h4>
            <ul className="space-y-3">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-slate-400 hover:text-amber-500 transition-colors text-sm"
                    data-testid={`link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-white font-bold mb-4">Company</h4>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-slate-400 hover:text-amber-500 transition-colors text-sm"
                    data-testid={`link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-white font-bold mb-4">Legal</h4>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-slate-400 hover:text-amber-500 transition-colors text-sm"
                    data-testid={`link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="mb-12 p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <h4 className="text-white font-bold text-lg mb-2">Stay Updated</h4>
              <p className="text-slate-400 text-sm">
                Get the latest farm listings, platform updates, and regenerative agriculture insights.
              </p>
            </div>
            <form className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:min-w-[400px]" data-testid="form-newsletter">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  className="pl-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-amber-500 h-12"
                  required
                  data-testid="input-newsletter-email"
                />
              </div>
              <Button
                type="submit"
                className="bg-gradient-to-br from-amber-500 to-amber-700 hover:opacity-90 text-slate-950 px-6 h-12 font-semibold shadow-lg shadow-amber-500/30 whitespace-nowrap"
                data-testid="button-newsletter-subscribe"
              >
                <span>Subscribe</span>
                <Send className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl" data-testid="badge-sec-compliant">
            <Shield className="w-6 h-6 text-emerald-500 flex-shrink-0" />
            <span className="text-sm text-slate-300 font-semibold">SEC Compliant</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl" data-testid="badge-bank-security">
            <Lock className="w-6 h-6 text-emerald-500 flex-shrink-0" />
            <span className="text-sm text-slate-300 font-semibold">Bank-Level Security</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl" data-testid="badge-audited-contracts">
            <Award className="w-6 h-6 text-emerald-500 flex-shrink-0" />
            <span className="text-sm text-slate-300 font-semibold">Audited Smart Contracts</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl" data-testid="badge-verified-regenerative">
            <Leaf className="w-6 h-6 text-emerald-500 flex-shrink-0" />
            <span className="text-sm text-slate-300 font-semibold">Verified Regenerative</span>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm" data-testid="text-copyright">
              © 2025 SEEDx. All rights reserved.
            </p>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => setDisclaimerOpen(!disclaimerOpen)}
                className="text-slate-400 hover:text-amber-500 px-4 py-2 text-sm"
                data-testid="button-disclaimer-toggle"
              >
                <Info className="w-4 h-4 mr-2" />
                <span>Important Disclaimer</span>
              </Button>

              <Button
                variant="ghost"
                className="text-slate-400 hover:text-amber-500 px-4 py-2 text-sm"
                data-testid="button-language-selector"
              >
                <Globe className="w-4 h-4 mr-2" />
                <span>English</span>
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Expandable Disclaimer */}
        {disclaimerOpen && (
          <div className="mt-8 p-8 bg-amber-500/10 border-2 border-amber-500/30 border-l-4 border-l-amber-500 rounded-2xl relative" data-testid="disclaimer-content">
            <Button
              variant="ghost"
              onClick={() => setDisclaimerOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
              data-testid="button-disclaimer-close"
            >
              <X className="w-5 h-5" />
            </Button>

            <div className="flex items-start gap-4 mb-6">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
              <h5 className="text-xl font-bold text-white">
                Risk Disclosure & Legal Notice
              </h5>
            </div>

            <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
              <p>
                <strong className="text-white">Not Investment Advice:</strong> Information provided on this platform is for educational
                purposes only and does not constitute investment, financial, legal, or tax advice.
                Consult qualified professionals before making any financial decisions.
              </p>
              <p>
                <strong className="text-white">Risk of Loss:</strong> Participation in agricultural projects carries significant risk.
                You may lose some or all of your principal. Past performance does not guarantee future results.
                Only participate with funds you can afford to lose.
              </p>
              <p>
                <strong className="text-white">No Guarantees:</strong> Revenue distributions are not guaranteed and depend entirely on
                project performance, market conditions, weather, and other factors beyond our control.
              </p>
              <p>
                <strong className="text-white">Regulatory Status:</strong> Farm tokens are designed as utility tokens and are not
                intended to be securities. However, regulatory classification may vary by jurisdiction.
                Ensure compliance with your local laws before participating.
              </p>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
