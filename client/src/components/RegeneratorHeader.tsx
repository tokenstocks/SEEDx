import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Wallet, LayoutDashboard, Briefcase, Activity, LogOut, ChevronDown, Fuel } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
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
  const [, navigate] = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Fetch wallet balances
  const { data: walletData } = useQuery<WalletBalances>({
    queryKey: ["/api/regenerator/wallet/balances"],
  });

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const getInitials = (email: string) => {
    if (!email) return "R";
    const parts = email.split("@")[0].split(".");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance || "0");
    if (num === 0) return "0.00";
    if (num < 0.01) return "<0.01";
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(2);
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md border-b border-white/10 bg-slate-950/90">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <img
              src={logoImage}
              alt="SEEDx"
              className="h-10 w-auto"
              style={{
                filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 20px rgba(16, 185, 129, 0.25))'
              }}
            />
            <div className="hidden md:block">
              <h2 className="text-sm font-semibold text-white">Regenerator Portal</h2>
              <p className="text-xs text-slate-400">Token Participant</p>
            </div>
          </div>

          {/* Profile Section */}
          <div className="flex items-center gap-2">
            {/* Wallet Balance Badges - Always visible, responsive sizing */}
            <div className="flex flex-wrap items-center gap-1 md:gap-2">
              <Badge
                variant="outline"
                className="bg-amber-950/30 border-amber-500/30 text-amber-400 px-1.5 py-0.5 md:px-2 md:py-1 gap-0.5 md:gap-1"
                data-testid="badge-balance-xlm"
              >
                <Fuel className="h-2.5 w-2.5 md:h-3 md:w-3" />
                <span className="text-[9px] md:text-xs font-medium whitespace-nowrap">{formatBalance(walletData?.balances.xlm || "0")} XLM</span>
              </Badge>
              <Badge
                variant="outline"
                className="bg-blue-950/30 border-blue-500/30 text-blue-400 px-1.5 py-0.5 md:px-2 md:py-1 gap-0.5 md:gap-1"
                data-testid="badge-balance-usdc"
              >
                <span className="text-[9px] md:text-xs font-medium whitespace-nowrap">{formatBalance(walletData?.balances.usdc || "0")} USDC</span>
              </Badge>
              <Badge
                variant="outline"
                className="bg-emerald-950/30 border-emerald-500/30 text-emerald-400 px-1.5 py-0.5 md:px-2 md:py-1 gap-0.5 md:gap-1"
                data-testid="badge-balance-ngnts"
              >
                <span className="text-[9px] md:text-xs font-medium whitespace-nowrap">₦{formatBalance(walletData?.balances.ngnts || "0")}</span>
              </Badge>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 h-10 px-3 rounded-full border border-blue-500/30 hover:border-blue-500 hover:bg-blue-950/30"
                  data-testid="button-profile-menu"
                  aria-label="Open profile menu"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-blue-600 text-white font-semibold text-xs">
                      {getInitials(user.email || "R")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-white">Menu</span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 bg-slate-900 border-white/10"
                align="end"
                forceMount
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium text-white">
                      {user.email || "Regenerator User"}
                    </p>
                    <p className="text-xs text-slate-400">
                      Token Participant
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={() => navigate("/regenerator-profile")}
                  className="text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                  data-testid="menu-profile"
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile & KYC
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/regenerator-dashboard")}
                  className="text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                  data-testid="menu-dashboard"
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/transactions")}
                  className="text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                  data-testid="menu-wallet"
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Wallet & Transactions
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                  data-testid="menu-logout"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
