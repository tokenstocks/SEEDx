import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import logoImage from "@assets/SEEDX_LOGO-removebg-preview_1762510980407.png";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img 
              src={logoImage} 
              alt="SEEDx" 
              className="h-11 w-auto transition-all duration-300 hover:scale-105 cursor-pointer"
              data-testid="img-navbar-logo"
            />
          </Link>

          <div className="hidden md:flex items-center gap-1 flex-1 justify-end">
            <Link href="/learn" data-testid="link-nav-learn">
              <div className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200">
                Learn
              </div>
            </Link>
            <Link href="/platform" data-testid="link-nav-platform">
              <div className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200">
                Platform
              </div>
            </Link>
            <Link href="/about" data-testid="link-nav-about">
              <div className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200">
                About
              </div>
            </Link>
            
            <div className="flex items-center gap-2 ml-4">
              <Link href="/login">
                <Button variant="ghost" className="bg-white/5 hover:bg-white/10 text-white border border-white/10" data-testid="button-signin">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="button-signup">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>

          <button
            className="md:hidden text-white bg-white/5 hover:bg-white/10 p-2 rounded-lg border border-white/10 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            data-testid="button-menu-toggle"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10" data-testid="mobile-menu">
            <div className="flex flex-col gap-2">
              <Link href="/learn" data-testid="link-mobile-learn">
                <div className="text-sm font-medium px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                  Learn
                </div>
              </Link>
              <Link href="/platform" data-testid="link-mobile-platform">
                <div className="text-sm font-medium px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                  Platform
                </div>
              </Link>
              <Link href="/about" data-testid="link-mobile-about">
                <div className="text-sm font-medium px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                  About
                </div>
              </Link>
              <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-white/10">
                <Link href="/login" className="w-full">
                  <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-white hover:bg-white/5" data-testid="button-mobile-signin">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" className="w-full">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="button-mobile-signup">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
