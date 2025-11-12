import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Browse from "@/pages/Browse";
import About from "@/pages/About";
import Learn from "@/pages/Learn";
import Platform from "@/pages/Platform";
import HowItWorks from "@/pages/HowItWorks";
import KYCVerification from "@/pages/KYCVerification";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import Portfolio from "@/pages/Portfolio";
import Transactions from "@/pages/Transactions";
import Admin from "@/pages/Admin";
import OnChainVerification from "@/pages/OnChainVerification";
import StorageSetup from "@/pages/StorageSetup";
import AdminRedemptions from "@/pages/AdminRedemptions";
import AdminTreasury from "@/pages/AdminTreasury";
import AdminCashflows from "@/pages/AdminCashflows";
import AdminAudit from "@/pages/AdminAudit";
import LPDashboard from "@/pages/LPDashboard";
import PrimerDashboard from "@/pages/PrimerDashboard";
import PrimerProfile from "@/pages/PrimerProfile";
import RegeneratorProfile from "@/pages/RegeneratorProfile";
import AdminPrimers from "@/pages/AdminPrimers";
import AdminWalletFunding from "@/pages/AdminWalletFunding";
import AdminLPAllocations from "@/pages/AdminLPAllocations";
import AdminFunding from "@/pages/AdminFunding";
import AdminInvestments from "@/pages/AdminInvestments";
import AdminLPPool from "@/pages/AdminLPPool";
import Marketplace from "@/pages/Marketplace";
import MultisigDemo from "@/pages/MultisigDemo";
import DeploymentDemo from "@/pages/DeploymentDemo";
import FlowDemo from "@/pages/FlowDemo";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import { useLocation } from "wouter";

function PortfolioRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/regenerator-dashboard");
  }, [setLocation]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/browse" component={Browse} />
      <Route path="/kyc" component={KYCVerification} />
      <Route path="/projects" component={Projects} />
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/regenerator-dashboard" component={Portfolio} />
      <Route path="/portfolio" component={PortfolioRedirect} />
      <Route path="/lp-dashboard" component={LPDashboard} />
      <Route path="/primer-dashboard" component={PrimerDashboard} />
      <Route path="/primer-profile" component={PrimerProfile} />
      <Route path="/regenerator-profile" component={RegeneratorProfile} />
      {/* DEPRECATED: /wallet-funding-request route removed - wallets auto-activate on first bank deposit */}
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/onchain-verification" component={OnChainVerification} />
      <Route path="/admin/storage-setup" component={StorageSetup} />
      <Route path="/admin/redemptions" component={AdminRedemptions} />
      <Route path="/admin/treasury" component={AdminTreasury} />
      <Route path="/admin/cashflows" component={AdminCashflows} />
      <Route path="/admin/audit" component={AdminAudit} />
      <Route path="/admin/primers" component={AdminPrimers} />
      <Route path="/admin/wallet-funding" component={AdminWalletFunding} />
      <Route path="/admin/funding" component={AdminFunding} />
      <Route path="/admin/investments" component={AdminInvestments} />
      <Route path="/admin/lp-pool" component={AdminLPPool} />
      <Route path="/admin/lp-allocations" component={AdminLPAllocations} />
      <Route path="/admin/multisig" component={MultisigDemo} />
      <Route path="/admin/deployment" component={DeploymentDemo} />
      <Route path="/admin/flow" component={FlowDemo} />
      <Route path="/about" component={About} />
      <Route path="/learn" component={Learn} />
      <Route path="/platform" component={Platform} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
