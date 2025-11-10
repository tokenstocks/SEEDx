import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Menu, X, Fuel, ChevronDown, Settings as SettingsIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import logoImage from "@assets/SEEDX_LOGO-removebg-preview_1762510980407.png";
import MembershipCard from "@/components/MembershipCard";

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

export default function UnifiedHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMembershipOpen, setIsMembershipOpen] = useState(false);
  const [, setLocation] = useLocation();
  const [location] = useLocation();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "admin";
  const isPrimer = Boolean(user?.isPrimer);
  const isLpInvestor = Boolean(user?.isLpInvestor);
  const isRegenerator = !isPrimer && !isLpInvestor && !isAdmin && !!user?.email; // Regular users are regenerators

  console.log('UnifiedHeader - User data:', { role: user?.role, isPrimer: user?.isPrimer, isLpInvestor: user?.isLpInvestor, computed: { isAdmin, isPrimer, isLpInvestor, isRegenerator } });

  // Fetch wallet balances (only for regenerators, others get placeholder data)
  const { data: walletData } = useQuery<WalletBalances>({
    queryKey: ["/api/regenerator/wallet/balances"],
    enabled: !!user && isRegenerator,
    retry: false,
  });

  // Wallet display logic - show for all roles with fallbacks
  const getWalletBalances = () => {
    if (walletData?.balances) {
      return walletData.balances;
    }
    // Fallback for non-regenerators or when data isn't loaded yet
    return {
      xlm: "0",
      usdc: "0",
      ngnts: "0"
    };
  };

  const balances = getWalletBalances();
  const showWalletIndicators = true; // Always show for all roles

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setLocation("/login");
  };

  const getDashboardPath = () => {
    if (isAdmin) return "/admin";
    if (isPrimer) return "/primer-dashboard";
    if (isRegenerator) return "/regenerator-dashboard";
    return "/dashboard";
  };

  const getSettingsPath = () => {
    if (isPrimer) return "/primer-profile";
    if (isRegenerator) return "/regenerator-profile";
    return "/profile"; // Fallback for users without a specific role
  };

  // Role-based navigation links
  const getNavLinks = () => {
    const links = [
      { href: getSettingsPath(), label: "Settings" },
      { href: "/projects", label: "Browse Projects" },
    ];

    if (isRegenerator) {
      links.push({ href: "/marketplace", label: "Marketplace" });
    } else if (isAdmin) {
      // Admin gets Dashboard link instead of Settings
      links[0] = { href: "/admin", label: "Dashboard" };
    } else if (!isPrimer && !isRegenerator && !isAdmin) {
      // Default user navigation
      links.push(
        { href: "/portfolio", label: "Portfolio" },
        { href: "/marketplace", label: "Marketplace" },
        { href: "/transactions", label: "Transactions" }
      );
    }

    return links;
  };

  const navLinks = getNavLinks();

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance || "0");
    if (num === 0) return "0.00";
    if (num < 0.01) return "<0.01";
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const getInitials = () => {
    const first = user.firstName?.charAt(0) || "";
    const last = user.lastName?.charAt(0) || "";
    return (first + last).toUpperCase();
  };

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
          </div>

          {/* Right: Wallet Balance Badges + Member Account */}
          <div className="hidden md:flex items-center gap-2">
            {showWalletIndicators && (
              <>
                <Badge
                  variant="outline"
                  className="bg-amber-950/30 border-amber-500/30 text-amber-400 px-2 py-1 gap-1"
                  data-testid="badge-balance-xlm"
                >
                  <Fuel className="h-3 w-3" />
                  <span className="text-xs font-medium whitespace-nowrap">{formatBalance(balances.xlm)} XLM</span>
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-blue-950/30 border-blue-500/30 text-blue-400 px-2 py-1"
                  data-testid="badge-balance-usdc"
                >
                  <span className="text-xs font-medium whitespace-nowrap">{formatBalance(balances.usdc)} USDC</span>
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-emerald-950/30 border-emerald-500/30 text-emerald-400 px-2 py-1"
                  data-testid="badge-balance-ngnts"
                >
                  <span className="text-xs font-medium whitespace-nowrap">₦{formatBalance(balances.ngnts)}</span>
                </Badge>
              </>
            )}
            
            {/* Member Account Dropdown */}
            <Popover open={isMembershipOpen} onOpenChange={setIsMembershipOpen}>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200"
                  data-testid="button-member-account"
                >
                  <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-white/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{getInitials()}</span>
                  </div>
                  <span className="text-sm font-medium text-white">{user.firstName}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-auto p-0 bg-transparent border-0 shadow-none" 
                align="end"
                sideOffset={8}
                data-testid="popover-membership-card"
              >
                <div className="space-y-3">
                  <MembershipCard 
                    user={user}
                    walletActivated={walletData?.activated}
                    activationStatus={walletData?.activationStatus}
                  />
                  {/* Quick Actions */}
                  <div className="flex flex-col gap-2 p-3 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl">
                    <Link href={getSettingsPath()}>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-slate-300 hover:text-white hover:bg-white/10"
                        onClick={() => setIsMembershipOpen(false)}
                        data-testid="button-settings"
                      >
                        <SettingsIcon className="w-4 h-4 mr-2" />
                        Account Settings
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-slate-300 hover:text-white hover:bg-white/10"
                      onClick={() => {
                        setIsMembershipOpen(false);
                        handleLogout();
                      }}
                      data-testid="button-logout"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
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
            <div className="flex flex-col gap-4">
              {/* Member Identity Card - Compact Version */}
              <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-white/20 flex items-center justify-center">
                    <span className="text-xl font-bold text-white">{getInitials()}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-white" data-testid="text-mobile-member-name">
                      {user.firstName} {user.lastName}
                    </h3>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <span className="text-xs text-slate-400">Member ID</span>
                  <span className="text-xs font-mono font-semibold text-white">
                    SDX-{user.id?.slice(0, 8).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Wallet Balances */}
              {showWalletIndicators && (
                <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-white/10">
                  <Badge
                    variant="outline"
                    className="bg-amber-950/30 border-amber-500/30 text-amber-400 px-2 py-1 gap-1"
                    data-testid="badge-balance-xlm-mobile"
                  >
                    <Fuel className="h-3 w-3" />
                    <span className="text-xs font-medium">{formatBalance(balances.xlm)} XLM</span>
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-blue-950/30 border-blue-500/30 text-blue-400 px-2 py-1"
                    data-testid="badge-balance-usdc-mobile"
                  >
                    <span className="text-xs font-medium">{formatBalance(balances.usdc)} USDC</span>
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-emerald-950/30 border-emerald-500/30 text-emerald-400 px-2 py-1"
                    data-testid="badge-balance-ngnts-mobile"
                  >
                    <span className="text-xs font-medium">₦{formatBalance(balances.ngnts)}</span>
                  </Badge>
                </div>
              )}

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
              
              {/* Actions */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <Link href={getSettingsPath()}>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-slate-400 hover:text-white hover:bg-white/5"
                    onClick={() => setIsMenuOpen(false)}
                    data-testid="button-mobile-settings"
                  >
                    <SettingsIcon className="w-4 h-4 mr-2" />
                    Account Settings
                  </Button>
                </Link>
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
