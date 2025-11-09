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
import { User, Settings, LogOut, FileText } from "lucide-react";
import logoImage from "@assets/SEEDX_LOGO-removebg-preview_1762510980407.png";

export default function PrimerHeader() {
  const [, navigate] = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const getInitials = (email: string) => {
    if (!email) return "P";
    const parts = email.split("@")[0].split(".");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
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
              <h2 className="text-sm font-semibold text-white">Primer Portal</h2>
              <p className="text-xs text-slate-400">Institutional Capital Partner</p>
            </div>
          </div>

          {/* Profile Section */}
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-white" data-testid="text-user-email">
                {user.email || "Primer User"}
              </p>
              <p className="text-xs text-emerald-400">Primer Account</p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full border-2 border-emerald-500/30 hover:border-emerald-500"
                  data-testid="button-profile-menu"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-emerald-600 text-white font-semibold">
                      {getInitials(user.email || "P")}
                    </AvatarFallback>
                  </Avatar>
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
                      {user.email || "Primer User"}
                    </p>
                    <p className="text-xs text-slate-400">
                      Institutional Partner
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={() => navigate("/primer-profile")}
                  className="text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                  data-testid="menu-profile"
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile & KYC
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/primer-dashboard")}
                  className="text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                  data-testid="menu-dashboard"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Dashboard
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
