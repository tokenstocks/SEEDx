import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import logoImage from "@assets/SEEDX_LOGO-removebg-preview_1762510980407.png";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-gray-800 bg-gradient-to-b from-gray-950/95 to-gray-900/90 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 text-[15px]">
        <div className="flex items-center justify-between h-12">
          <Link href="/" className="flex items-center gap-2">
            <img 
              src={logoImage} 
              alt="SEEDx" 
              className="h-[3.25rem] w-auto transition-all duration-300 hover:scale-105 cursor-pointer"
              style={{
                filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 20px rgba(16, 185, 129, 0.25))'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 30px rgba(16, 185, 129, 0.4))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 20px rgba(16, 185, 129, 0.25))';
              }}
              data-testid="img-navbar-logo"
            />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="/#featured-farms" className="text-sm font-medium text-white/90 hover:text-white transition-colors" data-testid="link-nav-browse">
              Browse Farms
            </a>
            <Link href="/how-it-works" className="text-sm font-medium text-white/90 hover:text-white transition-colors" data-testid="link-nav-how">
              How It Works
            </Link>
            <Link href="/about" className="text-sm font-medium text-white/90 hover:text-white transition-colors" data-testid="link-nav-about">
              About
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10" data-testid="button-signin">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-green-500 hover:bg-green-600 text-white" data-testid="button-signup">Get Started</Button>
            </Link>
          </div>

          <button
            className="md:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            data-testid="button-menu-toggle"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-800" data-testid="mobile-menu">
            <div className="flex flex-col gap-4">
              <a href="/#featured-farms" className="text-sm font-medium text-white/90" data-testid="link-mobile-browse">
                Browse Farms
              </a>
              <Link href="/how-it-works" className="text-sm font-medium text-white/90" data-testid="link-mobile-how">
                How It Works
              </Link>
              <Link href="/about" className="text-sm font-medium text-white/90" data-testid="link-mobile-about">
                About
              </Link>
              <div className="flex flex-col gap-2 pt-4 border-t border-gray-800">
                <Link href="/login" className="w-full">
                  <Button variant="ghost" className="w-full text-white hover:bg-white/10" data-testid="button-mobile-signin">Sign In</Button>
                </Link>
                <Link href="/register" className="w-full">
                  <Button className="w-full bg-green-500 hover:bg-green-600 text-white" data-testid="button-mobile-signup">Get Started</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
