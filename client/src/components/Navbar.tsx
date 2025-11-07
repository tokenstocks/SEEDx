import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="max-w-7xl mx-auto px-4 text-[15px]">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">SD</span>
            </div>
            <span className="font-bold text-xl" data-testid="text-logo">SEEDx</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/browse" className="text-sm font-medium hover:text-primary transition-colors" data-testid="link-nav-browse">
              Browse Farms
            </Link>
            <Link href="/how-it-works" className="text-sm font-medium hover:text-primary transition-colors" data-testid="link-nav-how">
              How It Works
            </Link>
            <Link href="/about" className="text-sm font-medium hover:text-primary transition-colors" data-testid="link-nav-about">
              About
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" data-testid="button-signin">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button data-testid="button-signup">Get Started</Button>
            </Link>
          </div>

          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            data-testid="button-menu-toggle"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t" data-testid="mobile-menu">
            <div className="flex flex-col gap-4">
              <Link href="/browse" className="text-sm font-medium" data-testid="link-mobile-browse">
                Browse Farms
              </Link>
              <Link href="/how-it-works" className="text-sm font-medium" data-testid="link-mobile-how">
                How It Works
              </Link>
              <Link href="/about" className="text-sm font-medium" data-testid="link-mobile-about">
                About
              </Link>
              <div className="flex flex-col gap-2 pt-4 border-t">
                <Link href="/login" className="w-full">
                  <Button variant="ghost" className="w-full" data-testid="button-mobile-signin">Sign In</Button>
                </Link>
                <Link href="/register" className="w-full">
                  <Button className="w-full" data-testid="button-mobile-signup">Get Started</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
