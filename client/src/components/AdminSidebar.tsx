import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  Wallet,
  TrendingUp,
  FileCheck,
  Settings,
  Database,
  Boxes,
  ArrowLeftRight,
  PiggyBank,
  DollarSign,
  Activity,
  FileText,
  Shield,
  HardDrive,
  Link as LinkIcon,
} from "lucide-react";
import seedxLogo from "@assets/image_1762970335693.png";

const menuSections = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/admin",
        icon: LayoutDashboard,
        testId: "link-admin-dashboard",
      },
    ],
  },
  {
    label: "User Management",
    items: [
      {
        title: "Primers",
        url: "/admin/primers",
        icon: PiggyBank,
        testId: "link-admin-primers",
      },
      {
        title: "Regenerators",
        url: "/admin/regenerators",
        icon: Users,
        testId: "link-admin-regenerators",
      },
    ],
  },
  {
    label: "Platform Operations",
    items: [
      {
        title: "LP Pool",
        url: "/admin/lp-pool",
        icon: Database,
        testId: "link-admin-lp-pool",
      },
      {
        title: "LP Allocations",
        url: "/admin/lp-allocations",
        icon: Boxes,
        testId: "link-admin-lp-allocations",
      },
      {
        title: "Treasury",
        url: "/admin/treasury",
        icon: Wallet,
        testId: "link-admin-treasury",
      },
      {
        title: "Wallet Funding",
        url: "/admin/wallet-funding",
        icon: ArrowLeftRight,
        testId: "link-admin-wallet-funding",
      },
    ],
  },
  {
    label: "Transactions",
    items: [
      {
        title: "Investments",
        url: "/admin/investments",
        icon: TrendingUp,
        testId: "link-admin-investments",
      },
      {
        title: "Funding Requests",
        url: "/admin/funding",
        icon: DollarSign,
        testId: "link-admin-funding",
      },
      {
        title: "Redemptions",
        url: "/admin/redemptions",
        icon: Activity,
        testId: "link-admin-redemptions",
      },
      {
        title: "Cashflows",
        url: "/admin/cashflows",
        icon: FileText,
        testId: "link-admin-cashflows",
      },
    ],
  },
  {
    label: "Compliance & System",
    items: [
      {
        title: "Audit Trail",
        url: "/admin/audit",
        icon: FileCheck,
        testId: "link-admin-audit",
      },
      {
        title: "OnChain Verification",
        url: "/admin/onchain-verification",
        icon: Shield,
        testId: "link-admin-onchain-verification",
      },
      {
        title: "Storage Setup",
        url: "/admin/storage-setup",
        icon: HardDrive,
        testId: "link-admin-storage-setup",
      },
    ],
  },
  {
    label: "Developer Tools",
    items: [
      {
        title: "Multisig Demo",
        url: "/admin/multisig",
        icon: LinkIcon,
        testId: "link-admin-multisig",
      },
      {
        title: "Deployment Demo",
        url: "/admin/deployment",
        icon: Settings,
        testId: "link-admin-deployment",
      },
      {
        title: "Flow Demo",
        url: "/admin/flow",
        icon: Activity,
        testId: "link-admin-flow",
      },
    ],
  },
];

export function AdminSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-white/10 px-6 py-4">
        <Link href="/admin" className="flex items-center gap-3 group">
          <img 
            src={seedxLogo} 
            alt="SEEDx" 
            className="h-10 w-auto transition-transform group-hover:scale-105"
          />
          <div>
            <h2 className="text-lg font-semibold text-white">Admin Panel</h2>
            <p className="text-xs text-slate-400">Platform Management</p>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="bg-slate-950">
        {menuSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-slate-400 px-6 py-2 text-xs uppercase tracking-wider">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive} data-testid={item.testId}>
                        <Link 
                          href={item.url}
                          className={`flex items-center gap-3 px-6 py-2.5 rounded-md transition-colors ${
                            isActive 
                              ? 'bg-emerald-500/10 text-emerald-400' 
                              : 'text-slate-300 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
