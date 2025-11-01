import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, RefreshCw, ExternalLink } from "lucide-react";
import { Link } from "wouter";

interface ProjectOnChainStatus {
  projectId: string;
  projectName: string;
  tokenSymbol: string;
  dbSyncStatus: boolean;
  issuerPublicKey: string;
  distributionPublicKey: string;
  onChainStatus: {
    issuerAccountExists: boolean;
    distributionAccountExists: boolean;
    trustlineEstablished: boolean;
    tokenMinted: boolean;
    tokenBalance: string | null;
  };
  transactionHashes: {
    issuerTx: string | null;
    distributionTx: string | null;
    trustlineTx: string | null;
    mintTx: string | null;
  };
  issues: string[];
  fullySynced: boolean;
  syncStatusMatch: boolean;
}

interface VerificationResponse {
  status: string;
  message: string;
  summary: {
    totalProjects: number;
    syncedProjects: number;
    unsyncedProjects: number;
    allSynced: boolean;
  };
  projects: ProjectOnChainStatus[];
  network: string;
  horizonUrl: string;
  timestamp: string;
}

export default function OnChainVerification() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);

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

  const { data, isLoading, refetch } = useQuery<VerificationResponse>({
    queryKey: ["/api/setup/verify-onchain"],
    enabled: !!user,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  if (!user) {
    return null;
  }

  const getStellarExplorerUrl = (txHash: string | null, type: 'tx' | 'account' = 'tx') => {
    if (!txHash) return null;
    const baseUrl = data?.network === 'testnet' 
      ? 'https://stellar.expert/explorer/testnet'
      : 'https://stellar.expert/explorer/public';
    return type === 'tx' ? `${baseUrl}/tx/${txHash}` : `${baseUrl}/account/${txHash}`;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <Link href="/admin" data-testid="link-back-admin">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">On-Chain Verification</h1>
            <p className="text-muted-foreground">Stellar blockchain synchronization status</p>
          </div>
          <Button 
            onClick={() => refetch()} 
            variant="outline"
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Network Info */}
      {data && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Network Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network:</span>
              <Badge variant="outline">{data.network.toUpperCase()}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Horizon URL:</span>
              <span className="text-sm font-mono">{data.horizonUrl}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Check:</span>
              <span className="text-sm">{new Date(data.timestamp).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {data && (
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.totalProjects}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Synced Projects</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{data.summary.syncedProjects}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unsynced Projects</CardTitle>
              <AlertCircle className="w-4 h-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{data.summary.unsyncedProjects}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Projects List */}
      <Card>
        <CardHeader>
          <CardTitle>Project Status Details</CardTitle>
          <CardDescription>Detailed blockchain verification for each project</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : data && data.projects.length > 0 ? (
            <div className="space-y-6">
              {data.projects.map((project) => (
                <div 
                  key={project.projectId} 
                  className="p-6 border rounded-lg space-y-4"
                  data-testid={`project-status-${project.projectId}`}
                >
                  {/* Project Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{project.projectName}</h3>
                      <p className="text-sm text-muted-foreground">Token: {project.tokenSymbol}</p>
                    </div>
                    <Badge 
                      variant={project.fullySynced ? "default" : "destructive"}
                      data-testid={`sync-badge-${project.projectId}`}
                    >
                      {project.fullySynced ? (
                        <><CheckCircle className="w-3 h-3 mr-1" /> Synced</>
                      ) : (
                        <><XCircle className="w-3 h-3 mr-1" /> Not Synced</>
                      )}
                    </Badge>
                  </div>

                  {/* On-Chain Status Grid */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Accounts</p>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>Issuer Account:</span>
                          {project.onChainStatus.issuerAccountExists ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Distribution Account:</span>
                          {project.onChainStatus.distributionAccountExists ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Token Status</p>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>Trustline Established:</span>
                          {project.onChainStatus.trustlineEstablished ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Tokens Minted:</span>
                          {project.onChainStatus.tokenMinted ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        {project.onChainStatus.tokenBalance && (
                          <div className="text-sm">
                            <span className="font-semibold">Balance: </span>
                            {project.onChainStatus.tokenBalance} {project.tokenSymbol}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Transaction Hashes */}
                  {(project.transactionHashes.issuerTx || 
                    project.transactionHashes.distributionTx || 
                    project.transactionHashes.trustlineTx || 
                    project.transactionHashes.mintTx) && (
                    <div className="space-y-2 pt-4 border-t">
                      <p className="text-sm font-medium">Transaction Hashes</p>
                      <div className="grid gap-2 text-xs">
                        {project.transactionHashes.issuerTx && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Issuer:</span>
                            <a 
                              href={getStellarExplorerUrl(project.transactionHashes.issuerTx) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 font-mono hover:underline"
                            >
                              {project.transactionHashes.issuerTx.substring(0, 16)}...
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                        {project.transactionHashes.distributionTx && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Distribution:</span>
                            <a 
                              href={getStellarExplorerUrl(project.transactionHashes.distributionTx) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 font-mono hover:underline"
                            >
                              {project.transactionHashes.distributionTx.substring(0, 16)}...
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                        {project.transactionHashes.trustlineTx && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Trustline:</span>
                            <a 
                              href={getStellarExplorerUrl(project.transactionHashes.trustlineTx) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 font-mono hover:underline"
                            >
                              {project.transactionHashes.trustlineTx.substring(0, 16)}...
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                        {project.transactionHashes.mintTx && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Mint:</span>
                            <a 
                              href={getStellarExplorerUrl(project.transactionHashes.mintTx) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 font-mono hover:underline"
                            >
                              {project.transactionHashes.mintTx.substring(0, 16)}...
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Public Keys */}
                  <div className="space-y-2 pt-4 border-t">
                    <p className="text-sm font-medium">Stellar Accounts</p>
                    <div className="grid gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Issuer:</span>
                        <a 
                          href={getStellarExplorerUrl(project.issuerPublicKey, 'account') || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 font-mono hover:underline mt-1"
                        >
                          {project.issuerPublicKey}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Distribution:</span>
                        <a 
                          href={getStellarExplorerUrl(project.distributionPublicKey, 'account') || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 font-mono hover:underline mt-1"
                        >
                          {project.distributionPublicKey}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Issues */}
                  {project.issues.length > 0 && (
                    <div className="space-y-2 pt-4 border-t">
                      <p className="text-sm font-medium text-orange-600">Issues Detected</p>
                      <ul className="list-disc list-inside space-y-1">
                        {project.issues.map((issue, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No projects found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
