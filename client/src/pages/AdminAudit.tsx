import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Shield, FileText } from "lucide-react";
import { Link } from "wouter";
import type { AuditAction } from "@/types/phase4";

export default function AdminAudit() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    
    if (!token || !userData) {
      setLocation("/login");
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== "admin") {
      setLocation("/dashboard");
      return;
    }

    setUser(parsedUser);
  }, [setLocation]);

  const { data: auditLogs, isLoading } = useQuery<{ actions: AuditAction[] }>({
    queryKey: ["/api/admin/audit/actions"],
    enabled: !!user,
  });

  const uniqueActions = Array.from(new Set(auditLogs?.actions.map(a => a.action) || []));

  const filteredLogs = auditLogs?.actions.filter(log => {
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesSearch = !searchQuery || 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.adminEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.adminName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(log.target).toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesAction && matchesSearch;
  }) || [];

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('approve')) return 'default';
    if (action.includes('delete') || action.includes('reject')) return 'destructive';
    if (action.includes('update') || action.includes('edit')) return 'secondary';
    return 'secondary';
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto p-4 py-8">
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"
            data-testid="link-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2 text-white">Audit Log Viewer</h1>
          <p className="text-slate-400">
            Complete compliance trail of all administrative actions
          </p>
        </div>

        <Card className="mb-6 bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Filters</CardTitle>
            <CardDescription className="text-slate-400">
              Search and filter audit logs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search by action, admin, or target..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search"
                />
              </div>
              <div>
                <Label htmlFor="action-filter">Action Type</Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger id="action-filter" data-testid="select-action-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {uniqueActions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Audit Trail</CardTitle>
            <CardDescription className="text-slate-400">
              {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-20 w-full" />
                  </div>
                ))}
              </div>
            ) : filteredLogs.length > 0 ? (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 border border-white/10 rounded-lg bg-white/5"
                    data-testid={`audit-log-${log.id}`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getActionColor(log.action)}>
                            {log.action}
                          </Badge>
                          <span className="text-xs text-slate-400">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-white">
                          {log.adminName || log.adminEmail || "Unknown Admin"}
                        </p>
                        {log.adminEmail && log.adminName && (
                          <p className="text-xs text-slate-400">{log.adminEmail}</p>
                        )}
                      </div>
                    </div>

                    {log.target && (
                      <div className="mb-3">
                        <p className="text-xs text-slate-400 mb-1">Target</p>
                        <div className="p-2 bg-white/5 rounded text-xs font-mono">
                          {log.target.type && <span className="text-slate-400">Type: {log.target.type} </span>}
                          {log.target.id && <span className="text-slate-400">ID: {log.target.id}</span>}
                        </div>
                      </div>
                    )}

                    {log.details && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Details</p>
                        <details className="text-xs">
                          <summary className="cursor-pointer text-primary hover:underline">
                            View Details
                          </summary>
                          <div className="mt-2 p-3 bg-muted rounded">
                            {log.details.before && (
                              <div className="mb-2">
                                <p className="font-semibold mb-1">Before:</p>
                                <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                                  {JSON.stringify(log.details.before, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.details.after && (
                              <div>
                                <p className="font-semibold mb-1">After:</p>
                                <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                                  {JSON.stringify(log.details.after, null, 2)}
                                </pre>
                              </div>
                            )}
                            {!log.details.before && !log.details.after && (
                              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            )}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                {searchQuery || actionFilter !== "all" ? (
                  <>
                    <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-white">No matching logs found</h3>
                    <p className="text-slate-400">
                      Try adjusting your filters or search query
                    </p>
                  </>
                ) : (
                  <>
                    <Shield className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-white">No audit logs yet</h3>
                    <p className="text-slate-400">
                      Administrative actions will be logged here for compliance
                    </p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
