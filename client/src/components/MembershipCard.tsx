import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface MembershipCardProps {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role?: string;
    isPrimer?: boolean;
    isLpInvestor?: boolean;
    kycStatus?: string;
  };
  walletActivated?: boolean;
  activationStatus?: string;
}

export default function MembershipCard({ user, walletActivated, activationStatus }: MembershipCardProps) {
  const getInitials = () => {
    const first = user.firstName?.charAt(0) || "";
    const last = user.lastName?.charAt(0) || "";
    return (first + last).toUpperCase();
  };

  const getMembershipStatus = () => {
    const kycApproved = user.kycStatus === "approved";
    const walletActive = walletActivated || activationStatus === "active";

    if (kycApproved && walletActive) {
      return {
        label: "Active Member",
        icon: CheckCircle,
        variant: "default" as const,
        bgClass: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
      };
    }

    if (!kycApproved && !walletActive) {
      return {
        label: "Pending Verification",
        icon: Clock,
        variant: "secondary" as const,
        bgClass: "bg-amber-500/10 border-amber-500/30 text-amber-400"
      };
    }

    if (!kycApproved) {
      return {
        label: "KYC Pending",
        icon: Clock,
        variant: "secondary" as const,
        bgClass: "bg-amber-500/10 border-amber-500/30 text-amber-400"
      };
    }

    return {
      label: "Wallet Pending",
      icon: Clock,
      variant: "secondary" as const,
      bgClass: "bg-amber-500/10 border-amber-500/30 text-amber-400"
    };
  };

  const getMemberType = () => {
    if (user.role === "admin") return "Platform Admin";
    if (user.isPrimer || user.isLpInvestor) return "Primer Member";
    return "Regenerator Member";
  };

  const getMembershipId = () => {
    // Create a readable membership ID from the user's UUID
    return `SDX-${user.id.slice(0, 8).toUpperCase()}`;
  };

  const status = getMembershipStatus();
  const StatusIcon = status.icon;

  return (
    <div className="w-80 bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-2xl">
      {/* Header with SEEDx Cooperative Seal */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">SEEDx Cooperative</p>
            <p className="text-[10px] text-slate-500">Member Certificate</p>
          </div>
        </div>
        <Badge className={status.bgClass} data-testid="badge-membership-status">
          <StatusIcon className="w-3 h-3 mr-1" />
          <span className="text-[10px] font-semibold">{status.label}</span>
        </Badge>
      </div>

      {/* Member Photo/Avatar */}
      <div className="flex items-center gap-4 mb-6">
        <div 
          className="w-16 h-16 rounded-lg bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-white/20 flex items-center justify-center"
          data-testid="avatar-member-initials"
        >
          <span className="text-2xl font-bold text-white">{getInitials()}</span>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white" data-testid="text-member-name">
            {user.firstName} {user.lastName}
          </h3>
          <p className="text-xs text-slate-400 truncate" data-testid="text-member-email">
            {user.email}
          </p>
          <Badge variant="outline" className="mt-1 text-[10px] bg-white/5 border-white/10 text-slate-300" data-testid="badge-member-type">
            {getMemberType()}
          </Badge>
        </div>
      </div>

      {/* Membership Details */}
      <div className="space-y-3 pt-4 border-t border-white/10">
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-400">Membership ID</span>
          <span className="text-xs font-mono font-semibold text-white" data-testid="text-membership-id">
            {getMembershipId()}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-400">Member Since</span>
          <span className="text-xs font-medium text-white" data-testid="text-member-since">
            {new Date().getFullYear()}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-400">Verification</span>
          <span className="text-xs font-medium text-white" data-testid="text-kyc-status">
            {user.kycStatus === "approved" ? "✓ Verified" : "Pending"}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-400">Wallet Status</span>
          <span className="text-xs font-medium text-white" data-testid="text-wallet-status">
            {walletActivated || activationStatus === "active" ? "✓ Active" : "Pending"}
          </span>
        </div>
      </div>

      {/* Cooperative Seal Footer */}
      <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-2">
        <Shield className="w-3 h-3 text-emerald-400/60" />
        <p className="text-[10px] text-slate-500 font-medium">
          Authorized Cooperative Member
        </p>
      </div>
    </div>
  );
}
