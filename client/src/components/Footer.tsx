import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import logoImage from "@assets/SEEDX_LOGO-removebg-preview_1762510980407.png";

export default function Footer() {
  return (
    <footer className="bg-card border-t py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <img 
              src={logoImage} 
              alt="SEEDx" 
              className="h-10 w-auto mb-4"
              data-testid="img-footer-logo"
            />
            <p className="text-sm text-muted-foreground mb-4">
              Sustainable Ecosystem for Economic Development - A regenerative capital exchange.
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              <span className="text-xs text-muted-foreground">Stellar Testnet</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/browse" data-testid="link-browse">Browse Farms</Link></li>
              <li><Link href="/how-it-works" data-testid="link-how">How It Works</Link></li>
              <li><Link href="/dashboard" data-testid="link-dashboard">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" data-testid="link-about">About Us</Link></li>
              <li><Link href="/faq" data-testid="link-faq">FAQ</Link></li>
              <li><Link href="/contact" data-testid="link-contact">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/terms" data-testid="link-terms">Terms of Service</Link></li>
              <li><Link href="/privacy" data-testid="link-privacy">Privacy Policy</Link></li>
              <li><Link href="/compliance" data-testid="link-compliance">Compliance</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2025 SEEDx. All rights reserved.
          </p>
          <div className="flex gap-2">
            <Badge variant="outline" data-testid="badge-regulated">Regulated</Badge>
            <Badge variant="outline" data-testid="badge-verified">Blockchain Verified</Badge>
          </div>
        </div>
      </div>
    </footer>
  );
}
