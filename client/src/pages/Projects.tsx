import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { TrendingUp, MapPin, Calendar, Search, Leaf, Sparkles } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { motion } from "framer-motion";

interface Project {
  id: string;
  name: string;
  description: string;
  location: string;
  targetAmount: string;
  raisedAmount: string;
  tokenSymbol: string;
  tokensIssued: string;
  tokensSold: string;
  pricePerToken: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  images: string[] | null;
}

export default function Projects() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const filteredProjects = projects?.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string, text: string, border: string }> = {
      active: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
      funded: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
      completed: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
      draft: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30" },
    };
    return colors[status] || colors.draft;
  };

  const formatCurrency = (amount: string) => {
    return `₦${parseFloat(amount).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const calculateProgress = (raised: string, target: string) => {
    const percentage = (parseFloat(raised) / parseFloat(target)) * 100;
    return Math.min(percentage, 100).toFixed(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <AppHeader />
      
      {/* Hero Header */}
      <div className="relative border-b border-white/10 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-[20%] w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px]" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="inline-block px-5 py-2 mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
              <span className="text-emerald-400 text-xs font-bold tracking-[0.2em] uppercase">
                Verified Projects
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent">
              Regenerative Agriculture Projects
            </h1>
            <p className="text-lg text-slate-400 max-w-3xl mx-auto">
              Discover tokenized agricultural participation opportunities backed by real farms
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                <Input
                  placeholder="Search projects by name or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                  data-testid="input-search-projects"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger 
                  className="bg-white/5 border-white/10 text-white focus:border-emerald-500/50 focus:ring-emerald-500/20"
                  data-testid="select-status-filter"
                >
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10">
                  <SelectItem value="all" className="text-white">All Projects</SelectItem>
                  <SelectItem value="active" className="text-white">Active</SelectItem>
                  <SelectItem value="funded" className="text-white">Funded</SelectItem>
                  <SelectItem value="completed" className="text-white">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
                <Skeleton className="h-48 w-full bg-white/10" />
                <div className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-2 bg-white/10" />
                  <Skeleton className="h-4 w-1/2 bg-white/10" />
                  <Skeleton className="h-20 mt-4 bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProjects && filteredProjects.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project, idx) => {
              const statusStyle = getStatusColor(project.status);
              const progress = parseFloat(calculateProgress(project.raisedAmount, project.targetAmount));
              
              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: idx * 0.1 }}
                  data-testid={`card-project-${project.id}`}
                >
                  <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden group hover:bg-white/10 hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-600/10 transition-all duration-300 h-full flex flex-col">
                    <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Project Image */}
                    {project.images && project.images.length > 0 ? (
                      <div className="h-48 overflow-hidden">
                        <img
                          src={project.images[0]}
                          alt={project.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                    ) : (
                      <div className="h-48 bg-gradient-to-br from-emerald-950/40 to-slate-900/40 flex items-center justify-center">
                        <Leaf className="w-16 h-16 text-emerald-400/40" />
                      </div>
                    )}

                    <div className="p-6 flex-1 flex flex-col">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors flex-1">
                          {project.name}
                        </h3>
                        <Badge 
                          variant="outline" 
                          className={`capitalize ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} flex items-center gap-1.5`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {project.status}
                        </Badge>
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-2 text-slate-400 mb-4">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">{project.location}</span>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-slate-400 line-clamp-2 mb-6">
                        {project.description}
                      </p>

                      {/* Progress Section */}
                      <div className="space-y-3 mb-6 flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Funding Progress</span>
                          <span className="font-semibold text-white">
                            {progress}%
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, delay: idx * 0.1 + 0.3 }}
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-full"
                          />
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">
                            {formatCurrency(project.raisedAmount)} raised
                          </span>
                          <span className="font-medium text-white">
                            {formatCurrency(project.targetAmount)} goal
                          </span>
                        </div>
                      </div>

                      {/* Token Info - Enhanced NAV Display */}
                      <div className="grid grid-cols-2 gap-4 py-4 border-t border-white/10 mb-6">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <p className="text-xs text-slate-500">NAV per Token</p>
                            <Badge variant="outline" className="h-4 px-1.5 text-[10px] border-blue-500/30 text-blue-400 bg-blue-500/10">
                              <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                              Live
                            </Badge>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <p className="text-lg font-bold text-white" data-testid={`text-nav-${project.id}`}>
                              {formatCurrency(project.pricePerToken)}
                            </p>
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 mb-1">Tokens Available</p>
                          <p className="text-lg font-bold text-white">
                            {(parseFloat(project.tokensIssued) - parseFloat(project.tokensSold)).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* CTA Button */}
                      <Link href={`/projects/${project.id}`}>
                        <Button 
                          className="w-full bg-gradient-to-r from-emerald-500 to-emerald-700 text-white font-semibold shadow-lg shadow-emerald-600/20" 
                          data-testid={`button-view-${project.id}`}
                        >
                          View Details
                          <Sparkles className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-12 text-center">
              <Leaf className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-lg text-slate-400">No projects found matching your criteria</p>
              <p className="text-sm text-slate-500 mt-2">Try adjusting your filters</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
