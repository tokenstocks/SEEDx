import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Menu, X, Fuel } from "lucide-react";
import logoImage from "@assets/SEEDX_LOGO-removebg-preview_1762510980407.png";

interface WalletBalances {
  activated: boolean;
  activationStatus: string;
  publicKey: string;
  balances: {
    xlm: string;
    usdc: string;
    ngnts: string;
  };
}

export default function RegeneratorHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [, setLocation] = useLocation();
  const [location] = useLocation();

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Fetch wallet balances
  const { data: walletData } = useQuery<WalletBalances>({
    queryKey: ["/api/regenerator/wallet/balances"],
  });

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setLocation("/login");
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance || "0");
    if (num === 0) return "0.00";
    if (num < 0.01) return "<0.01";
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const navLinks = [
    { href: "/regenerator-dashboard", label: "Dashboard" },
    { href: "/projects", label: "Browse Projects" },
    { href: "/marketplace", label: "Marketplace" },
    { href: "/regenerator-profile", label: "Profile" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo */}
          <div className="flex items-center gap-4">
            <Link href="/regenerator-dashboard" className="flex items-center gap-2">
              <img 
                src={logoImage} 
                alt="SEEDx" 
                className="h-11 w-auto transition-all duration-300 hover:scale-105 cursor-pointer"
                data-testid="img-header-logo"
              />
            </Link>
          </div>

          {/* Center: Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
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

          {/* Right: Wallet Balance Badges */}
          <div className="hidden md:flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-amber-950/30 border-amber-500/30 text-amber-400 px-2 py-1 gap-1"
              data-testid="badge-balance-xlm"
            >
              <Fuel className="h-3 w-3" />
              <span className="text-xs font-medium whitespace-nowrap">{formatBalance(walletData?.balances.xlm || "0")} XLM</span>
            </Badge>
            <Badge
              variant="outline"
              className="bg-blue-950/30 border-blue-500/30 text-blue-400 px-2 py-1"
              data-testid="badge-balance-usdc"
            >
              <span className="text-xs font-medium whitespace-nowrap">{formatBalance(walletData?.balances.usdc || "0")} USDC</span>
            </Badge>
            <Badge
              variant="outline"
              className="bg-emerald-950/30 border-emerald-500/30 text-emerald-400 px-2 py-1"
              data-testid="badge-balance-ngnts"
            >
              <span className="text-xs font-medium whitespace-nowrap">₦{formatBalance(walletData?.balances.ngnts || "0")}</span>
            </Badge>
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
              {/* Wallet Balances */}
              <div className="flex flex-wrap items-center gap-2 pb-4 mb-4 border-b border-white/10">
                <Badge
                  variant="outline"
                  className="bg-amber-950/30 border-amber-500/30 text-amber-400 px-2 py-1 gap-1"
                  data-testid="badge-balance-xlm-mobile"
                >
                  <Fuel className="h-3 w-3" />
                  <span className="text-xs font-medium">{formatBalance(walletData?.balances.xlm || "0")} XLM</span>
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-blue-950/30 border-blue-500/30 text-blue-400 px-2 py-1"
                  data-testid="badge-balance-usdc-mobile"
                >
                  <span className="text-xs font-medium">{formatBalance(walletData?.balances.usdc || "0")} USDC</span>
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-emerald-950/30 border-emerald-500/30 text-emerald-400 px-2 py-1"
                  data-testid="badge-balance-ngnts-mobile"
                >
                  <span className="text-xs font-medium">₦{formatBalance(walletData?.balances.ngnts || "0")}</span>
                </Badge>
              </div>

              {/* Navigation Links */}
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
