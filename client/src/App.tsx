import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Browse from "@/pages/Browse";
import Dashboard from "@/pages/Dashboard";
import About from "@/pages/About";
import HowItWorks from "@/pages/HowItWorks";
import KYCVerification from "@/pages/KYCVerification";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import Portfolio from "@/pages/Portfolio";
import Transactions from "@/pages/Transactions";
import Admin from "@/pages/Admin";
import OnChainVerification from "@/pages/OnChainVerification";
import StorageSetup from "@/pages/StorageSetup";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/browse" component={Browse} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/kyc" component={KYCVerification} />
      <Route path="/projects" component={Projects} />
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/onchain-verification" component={OnChainVerification} />
      <Route path="/admin/storage-setup" component={StorageSetup} />
      <Route path="/about" component={About} />
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
