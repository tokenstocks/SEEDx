import { motion, MotionConfig, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { useLocation } from "wouter";
import { 
  MapPin, 
  Leaf, 
  Calendar, 
  TrendingUp,
  Users,
  Clock,
  ArrowRight,
  ShieldCheck,
  Loader2,
  CheckCircle,
  Sprout,
  BadgeCheck
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

type FilterType = "all" | "funding" | "active" | "completed";
type ProjectStatus = "funding" | "active" | "completed";

interface FarmProject {
  id: string;
  name: string;
  location: string;
  description: string;
  imageUrl: string;
  status: ProjectStatus;
  cropType: string;
  timeline: string;
  riskLevel: "Low Risk" | "Moderate Risk" | "High Risk";
  hectares: number;
  jobsCreated: number;
  fundingGoal: string;
  fundingRaised: string;
  fundingPercentage: number;
  daysRemaining?: number;
  participants?: number;
  monthsInProgress?: number;
}

const farmProjects: FarmProject[] = [
  {
    id: "1",
    name: "Cassava Processing & Export",
    location: "Ogun State, Nigeria",
    description: "50-hectare cassava farm with processing facility for garri and starch production. Export contracts secured with European buyers.",
    imageUrl: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80",
    status: "funding",
    cropType: "Cassava",
    timeline: "8-10 months",
    riskLevel: "Moderate Risk",
    hectares: 50,
    jobsCreated: 45,
    fundingGoal: "$500K",
    fundingRaised: "$340K",
    fundingPercentage: 68,
    daysRemaining: 12
  },
  {
    id: "2",
    name: "Organic Rice Cultivation",
    location: "Volta Region, Ghana",
    description: "120-hectare organic rice farm using regenerative practices. Certified organic with premium market access across West Africa.",
    imageUrl: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&q=80",
    status: "funding",
    cropType: "Rice",
    timeline: "6-8 months",
    riskLevel: "Low Risk",
    hectares: 120,
    jobsCreated: 80,
    fundingGoal: "$1M",
    fundingRaised: "$920K",
    fundingPercentage: 92,
    daysRemaining: 5
  },
  {
    id: "3",
    name: "Premium Cocoa Estate",
    location: "Abidjan, Ivory Coast",
    description: "200-hectare cocoa plantation with Fair Trade certification. Direct contracts with European chocolate manufacturers.",
    imageUrl: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80",
    status: "active",
    cropType: "Cocoa",
    timeline: "12 months",
    riskLevel: "Low Risk",
    hectares: 200,
    jobsCreated: 120,
    fundingGoal: "$1.5M",
    fundingRaised: "$1.5M",
    fundingPercentage: 100,
    participants: 150,
    monthsInProgress: 4
  }
];

// Calculate filter counts dynamically from actual data
const getFilterCounts = () => {
  return {
    all: farmProjects.length,
    funding: farmProjects.filter(p => p.status === "funding").length,
    active: farmProjects.filter(p => p.status === "active").length,
    completed: farmProjects.filter(p => p.status === "completed").length
  };
};

const statusConfig = {
  funding: {
    label: "Open for Funding",
    icon: Loader2,
    className: "bg-blue-500/10 border-blue-500/30 text-blue-400",
    iconClassName: "animate-spin"
  },
  active: {
    label: "Active",
    icon: CheckCircle,
    className: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    iconClassName: ""
  },
  completed: {
    label: "Completed",
    icon: BadgeCheck,
    className: "bg-slate-500/10 border-slate-500/30 text-slate-400",
    iconClassName: ""
  }
};

export default function FeaturedFarmsSection() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const prefersReducedMotion = useReducedMotion();
  const [, setLocation] = useLocation();

  const filteredProjects = activeFilter === "all" 
    ? farmProjects 
    : farmProjects.filter(p => p.status === activeFilter);
  
  const filterCounts = getFilterCounts();

  return (
    <MotionConfig reducedMotion={prefersReducedMotion ? "always" : "never"}>
      <section 
        id="featured-farms"
        className="relative py-20 md:py-32 px-4 overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900" 
        data-testid="section-featured-farms"
      >
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[10%] right-[10%] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px]" />
          <div className="absolute bottom-[10%] left-[10%] w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[140px]" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center mb-12 md:mb-16"
          >
            <div className="inline-block px-5 py-2 mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
              <span className="text-emerald-400 text-xs font-bold tracking-[0.2em] uppercase">
                Live Opportunities
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent tracking-tight" data-testid="heading-featured-farms">
              Featured Farms
            </h2>
            <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed" data-testid="text-subtitle">
              Verified agricultural projects ready for participation. Each farm has completed due diligence and is backed by real assets.
            </p>
          </motion.div>

          {/* Risk Disclaimer */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.05, ease: "easeOut" }}
            className="max-w-4xl mx-auto mb-12"
          >
            <div className="bg-amber-500/5 border border-amber-500/25 rounded-2xl p-5 md:p-6" data-testid="participation-disclaimer">
              <p className="text-sm text-slate-400 leading-relaxed text-center">
                <strong className="text-amber-400 font-bold">Participation Notice:</strong> All projects involve risk. 
                Funding amounts are not guaranteed to be returned. Project performance varies. 
                Farm tokens provide utility access and do not represent equity or securities. 
                Review all documentation carefully before participating.
              </p>
            </div>
          </motion.div>

          {/* Filter Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="flex flex-wrap justify-center gap-3 mb-12 md:mb-16"
          >
            {(Object.keys(filterCounts) as FilterType[]).map((filter) => (
              <Button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                variant={activeFilter === filter ? "default" : "outline"}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  activeFilter === filter
                    ? "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/30 scale-105 border-0"
                    : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1"
                }`}
                data-testid={`filter-${filter}`}
              >
                <span className="capitalize">{filter === "all" ? "All Projects" : filter === "funding" ? "Open for Funding" : filter}</span>
                <Badge 
                  variant="secondary" 
                  className={`${activeFilter === filter ? "bg-white/20 text-white" : "bg-white/10 text-slate-400"} no-default-hover-elevate no-default-active-elevate`}
                  data-testid={`filter-count-${filter}`}
                >
                  {filterCounts[filter]}
                </Badge>
              </Button>
            ))}
          </motion.div>

          {/* Farm Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredProjects.map((farm, index) => {
              const statusInfo = statusConfig[farm.status];
              const StatusIcon = statusInfo.icon;

              return (
                <motion.div
                  key={farm.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.2 + index * 0.1, ease: "easeOut" }}
                  className="group relative"
                  data-testid={`farm-card-${farm.id}`}
                >
                  {/* Card */}
                  <div className="relative h-full bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden transition-all duration-500 hover:bg-white/10 hover:-translate-y-3 hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-500/20">
                    
                    {/* Farm Image */}
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img 
                        src={farm.imageUrl} 
                        alt={farm.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        data-testid={`farm-image-${farm.id}`}
                      />
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
                      
                      {/* Status Badge */}
                      <div className={`absolute top-4 left-4 flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md ${statusInfo.className}`} data-testid={`farm-status-${farm.id}`}>
                        <StatusIcon className={`w-4 h-4 ${statusInfo.iconClassName}`} />
                        <span className="text-xs font-bold">{statusInfo.label}</span>
                      </div>

                      {/* Verified Badge */}
                      <div className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20" data-testid={`farm-verified-${farm.id}`}>
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-white">Verified</span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-6 md:p-8">
                      
                      {/* Location */}
                      <div className="flex items-center gap-2 text-slate-400 text-sm mb-4" data-testid={`farm-location-${farm.id}`}>
                        <MapPin className="w-4 h-4" />
                        <span>{farm.location}</span>
                      </div>

                      {/* Farm Name */}
                      <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-emerald-400 transition-colors duration-300" data-testid={`farm-name-${farm.id}`}>
                        {farm.name}
                      </h3>

                      {/* Description */}
                      <p className="text-slate-300 leading-relaxed mb-6" data-testid={`farm-description-${farm.id}`}>
                        {farm.description}
                      </p>

                      {/* Highlights */}
                      <div className="flex flex-wrap gap-3 mb-6">
                        <div className="flex items-center gap-2 text-sm text-slate-400" data-testid={`farm-crop-${farm.id}`}>
                          <Leaf className="w-4 h-4 text-emerald-400" />
                          <span>{farm.cropType}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400" data-testid={`farm-timeline-${farm.id}`}>
                          <Calendar className="w-4 h-4 text-blue-400" />
                          <span>{farm.timeline}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400" data-testid={`farm-risk-${farm.id}`}>
                          <TrendingUp className="w-4 h-4 text-amber-400" />
                          <span>{farm.riskLevel}</span>
                        </div>
                      </div>

                      {/* Funding Progress */}
                      <div className="mb-6 p-5 bg-white/5 rounded-2xl border border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-slate-400">
                            {farm.status === "active" ? "Funding Status" : "Funding Progress"}
                          </span>
                          {farm.status === "funding" && (
                            <span className="text-sm font-bold text-emerald-400" data-testid={`farm-percentage-${farm.id}`}>
                              {farm.fundingPercentage}%
                            </span>
                          )}
                          {farm.status === "active" && (
                            <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              Fully Funded
                            </span>
                          )}
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-4">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${
                              farm.fundingPercentage === 100 
                                ? "bg-gradient-to-r from-emerald-400 to-emerald-600" 
                                : "bg-gradient-to-r from-blue-400 to-blue-600"
                            }`}
                            style={{ width: `${farm.fundingPercentage}%` }}
                            data-testid={`farm-progress-${farm.id}`}
                          />
                        </div>

                        {/* Progress Stats */}
                        <div className="grid grid-cols-3 gap-4">
                          <div data-testid={`farm-raised-${farm.id}`}>
                            <div className="text-lg font-bold text-white">{farm.fundingRaised}</div>
                            <div className="text-xs text-slate-500 uppercase tracking-wide">
                              {farm.status === "active" ? "Funded" : "Raised"}
                            </div>
                          </div>
                          <div data-testid={`farm-goal-${farm.id}`}>
                            <div className="text-lg font-bold text-white">
                              {farm.status === "active" ? farm.participants : farm.fundingGoal}
                            </div>
                            <div className="text-xs text-slate-500 uppercase tracking-wide">
                              {farm.status === "active" ? "Participants" : "Goal"}
                            </div>
                          </div>
                          <div data-testid={`farm-remaining-${farm.id}`}>
                            <div className="text-lg font-bold text-white">
                              {farm.status === "funding" 
                                ? `${farm.daysRemaining} days` 
                                : `${farm.monthsInProgress} months`}
                            </div>
                            <div className="text-xs text-slate-500 uppercase tracking-wide">
                              {farm.status === "funding" ? "Remaining" : "In Progress"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Farm Metrics */}
                      <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-white/10">
                        <div className="text-center" data-testid={`farm-hectares-${farm.id}`}>
                          <div className="flex justify-center mb-2">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                              <Sprout className="w-5 h-5 text-emerald-400" />
                            </div>
                          </div>
                          <div className="text-lg font-bold text-white">{farm.hectares}</div>
                          <div className="text-xs text-slate-500 uppercase tracking-wide">Hectares</div>
                        </div>
                        <div className="text-center" data-testid={`farm-jobs-${farm.id}`}>
                          <div className="flex justify-center mb-2">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                              <Users className="w-5 h-5 text-blue-400" />
                            </div>
                          </div>
                          <div className="text-lg font-bold text-white">{farm.jobsCreated}</div>
                          <div className="text-xs text-slate-500 uppercase tracking-wide">Jobs Created</div>
                        </div>
                        <div className="text-center" data-testid={`farm-duration-${farm.id}`}>
                          <div className="flex justify-center mb-2">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                              <Clock className="w-5 h-5 text-amber-400" />
                            </div>
                          </div>
                          <div className="text-lg font-bold text-white">{farm.timeline.split(" ")[0]}</div>
                          <div className="text-xs text-slate-500 uppercase tracking-wide">Timeline</div>
                        </div>
                      </div>

                      {/* CTA Button */}
                      <Button
                        className="w-full bg-gradient-to-r from-emerald-500 to-emerald-700 hover:opacity-90 text-white font-semibold shadow-lg group/btn"
                        onClick={() => setLocation("/register")}
                        data-testid={`button-view-details-${farm.id}`}
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-5 h-5 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
            className="text-center mt-12 md:mt-16"
          >
            <Button
              size="lg"
              className="bg-gradient-to-r from-emerald-500 to-emerald-700 hover:opacity-90 text-white px-8 py-6 text-lg font-semibold shadow-lg hover:-translate-y-1 transition-all duration-300 group"
              onClick={() => setLocation("/register")}
              data-testid="button-view-all-projects"
            >
              <span>View All Projects</span>
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>

        </div>
      </section>
    </MotionConfig>
  );
}
