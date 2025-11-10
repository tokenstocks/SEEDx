import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import logoImage from "@assets/SEEDX_LOGO-removebg-preview_1762510980407.png";

export default function AppHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [, setLocation] = useLocation();
  const [location] = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setLocation("/login");
  };

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "admin";
  const isPrimer = user?.role === "primer";
  const isRegenerator = user?.role === "regenerator";

  const getDashboardPath = () => {
    if (isAdmin) return "/admin";
    if (isPrimer) return "/primer-dashboard";
    if (isRegenerator) return "/regenerator-dashboard";
    return "/dashboard";
  };

  const navLinks = [
    { href: getDashboardPath(), label: "Dashboard" },
    { href: "/projects", label: "Browse Projects" },
  ];

  if (isRegenerator) {
    navLinks.push(
      { href: "/marketplace", label: "Marketplace" },
      { href: "/regenerator-profile", label: "Profile" }
    );
  } else if (isPrimer) {
    navLinks.push({ href: "/primer-profile", label: "Profile" });
  } else if (!isAdmin) {
    // Default user navigation
    navLinks.push(
      { href: "/portfolio", label: "Portfolio" },
      { href: "/marketplace", label: "Marketplace" },
      { href: "/transactions", label: "Transactions" }
    );
  }
  // Note: Admin dashboard link already included via getDashboardPath()

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo */}
          <div className="flex items-center gap-4">
            <Link href={getDashboardPath()} className="flex items-center gap-2">
              <img 
                src={logoImage} 
                alt="SEEDx" 
                className="h-11 w-auto transition-all duration-300 hover:scale-105 cursor-pointer"
                data-testid="img-header-logo"
              />
            </Link>
          </div>

          {/* Center/Right: Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1 flex-1 justify-end">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className="group relative"
                data-testid={`link-nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  location === link.href 
                    ? "text-white bg-white/10" 
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}>
                  {link.label}
                </div>
                {location === link.href && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
                )}
              </Link>
            ))}
            
            {/* Logout Button */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLogout}
              className="ml-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all duration-200"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white bg-white/5 hover:bg-white/10 p-2 rounded-lg border border-white/10 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            data-testid="button-mobile-menu-toggle"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10" data-testid="mobile-menu">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link 
                  key={link.href} 
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  data-testid={`link-mobile-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className={`text-sm font-medium px-3 py-2 rounded-lg transition-all ${
                    location === link.href 
                      ? "text-white bg-white/10" 
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}>
                    {link.label}
                  </div>
                </Link>
              ))}
              <div className="pt-2 mt-2 border-t border-white/10">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-slate-400 hover:text-white hover:bg-white/5" 
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleLogout();
                  }}
                  data-testid="button-mobile-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
