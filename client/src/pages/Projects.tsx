import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { TrendingUp, MapPin, Calendar, Search } from "lucide-react";
import AppHeader from "@/components/AppHeader";

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
    const colors: Record<string, string> = {
      active: "bg-green-500",
      funded: "bg-blue-500",
      completed: "bg-purple-500",
      draft: "bg-gray-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const formatCurrency = (amount: string) => {
    return `₦${parseFloat(amount).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const calculateProgress = (raised: string, target: string) => {
    const percentage = (parseFloat(raised) / parseFloat(target)) * 100;
    return Math.min(percentage, 100).toFixed(1);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader />
      <div className="max-w-7xl mx-auto p-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Investment Projects</h1>
          <p className="text-muted-foreground">
            Discover tokenized agricultural investment opportunities
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects by name or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-projects"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="funded">Funded</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <Skeleton className="h-48 w-full" />
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProjects && filteredProjects.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="hover-elevate overflow-hidden" data-testid={`card-project-${project.id}`}>
                {project.images && project.images.length > 0 ? (
                  <div className="h-48 overflow-hidden bg-muted">
                    <img
                      src={project.images[0]}
                      alt={project.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-muted flex items-center justify-center">
                    <TrendingUp className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-xl">{project.name}</CardTitle>
                    <Badge variant="outline" className="capitalize">
                      <span className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(project.status)}`} />
                      {project.status}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {project.location}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {calculateProgress(project.raisedAmount, project.targetAmount)}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${calculateProgress(project.raisedAmount, project.targetAmount)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {formatCurrency(project.raisedAmount)} raised
                      </span>
                      <span className="font-medium">
                        {formatCurrency(project.targetAmount)} goal
                      </span>
                    </div>
                  </div>

                  {/* Token Info */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Price per token</p>
                      <p className="font-semibold">{formatCurrency(project.pricePerToken)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Tokens available</p>
                      <p className="font-semibold">
                        {(parseFloat(project.tokensIssued) - parseFloat(project.tokensSold)).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <Link href={`/projects/${project.id}`}>
                    <Button className="w-full" data-testid={`button-view-${project.id}`}>
                      View Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No projects found matching your criteria</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
