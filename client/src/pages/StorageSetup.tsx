import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BucketInfo {
  exists: boolean;
  public?: boolean;
  issue?: string;
}

interface StorageVerification {
  status: "success" | "error";
  message: string;
  configured: boolean;
  buckets: Record<string, BucketInfo>;
  summary?: {
    totalRequired: number;
    existing: number;
    missing: number;
    missingBuckets: string[];
  };
  setupInstructions?: {
    step1: string;
    step2: string;
    step3: string;
    step4: string;
    step5?: string;
    note?: string;
  };
  timestamp: string;
}

export default function StorageSetup() {
  const { data, isLoading, error, refetch } = useQuery<StorageVerification>({
    queryKey: ["/api/setup/verify-storage"],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="text-muted-foreground">Loading storage status...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load storage verification status. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const getBucketIcon = (bucketInfo: BucketInfo) => {
    if (bucketInfo.exists) {
      return <CheckCircle2 className="h-5 w-5 text-green-600" data-testid="icon-bucket-exists" />;
    }
    return <XCircle className="h-5 w-5 text-red-600" data-testid="icon-bucket-missing" />;
  };

  const getBucketBadge = (bucketInfo: BucketInfo) => {
    if (bucketInfo.exists) {
      return (
        <Badge variant="default" className="bg-green-600" data-testid="badge-bucket-exists">
          Exists {bucketInfo.public && "(Public)"}
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" data-testid="badge-bucket-missing">
        Missing
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-storage-setup">
            Storage Setup
          </h1>
          <p className="text-muted-foreground mt-1">
            Verify and configure Supabase storage buckets
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" data-testid="button-refresh">
          Refresh Status
        </Button>
      </div>

      {/* Overall Status */}
      <Alert
        variant={data.status === "success" ? "default" : "destructive"}
        data-testid={`alert-${data.status}`}
      >
        {data.status === "success" ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <AlertCircle className="h-4 w-4" />
        )}
        <AlertTitle data-testid="text-status-message">{data.message}</AlertTitle>
        {data.summary && data.summary.missing > 0 && (
          <AlertDescription>
            {data.summary.existing} of {data.summary.totalRequired} required buckets exist.
            Missing: {data.summary.missingBuckets.join(", ")}
          </AlertDescription>
        )}
      </Alert>

      {/* Configuration Status */}
      {!data.configured && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Supabase Not Configured
            </CardTitle>
            <CardDescription>
              Storage buckets cannot be verified because Supabase credentials are missing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.setupInstructions && (
              <div className="space-y-2">
                <h3 className="font-semibold">Setup Instructions:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>{data.setupInstructions.step1}</li>
                  <li>{data.setupInstructions.step2}</li>
                  <li>{data.setupInstructions.step3}</li>
                  <li>{data.setupInstructions.step4}</li>
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bucket Status */}
      {data.configured && (
        <Card>
          <CardHeader>
            <CardTitle>Storage Buckets</CardTitle>
            <CardDescription>
              Required buckets for KYC documents and project files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(data.buckets).map(([name, info]) => (
                <div
                  key={name}
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`bucket-${name}`}
                >
                  <div className="flex items-center gap-3">
                    {getBucketIcon(info)}
                    <div>
                      <div className="font-medium" data-testid={`text-bucket-name-${name}`}>
                        {name}
                      </div>
                      {info.issue && (
                        <div className="text-sm text-muted-foreground" data-testid={`text-bucket-issue-${name}`}>
                          {info.issue}
                        </div>
                      )}
                    </div>
                  </div>
                  {getBucketBadge(info)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Instructions */}
      {data.setupInstructions && data.summary && data.summary.missing > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
            <CardDescription>
              Follow these steps to create the missing storage buckets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-3">
              <li className="text-sm">{data.setupInstructions.step1}</li>
              <li className="text-sm">{data.setupInstructions.step2}</li>
              <li className="text-sm">{data.setupInstructions.step3}</li>
              <li className="text-sm">
                {data.setupInstructions.step4}
                <div className="mt-2 ml-6 space-y-1">
                  {data.summary.missingBuckets.map((bucket) => (
                    <div key={bucket} className="text-muted-foreground">
                      • {bucket}
                    </div>
                  ))}
                </div>
              </li>
              {data.setupInstructions.step5 && (
                <li className="text-sm">{data.setupInstructions.step5}</li>
              )}
            </ol>

            {data.setupInstructions.note && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Note</AlertTitle>
                <AlertDescription>{data.setupInstructions.note}</AlertDescription>
              </Alert>
            )}

            <Button
              variant="outline"
              className="w-full"
              asChild
              data-testid="button-open-supabase"
            >
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Supabase Dashboard
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Timestamp */}
      <div className="text-xs text-muted-foreground text-center">
        Last checked: {new Date(data.timestamp).toLocaleString()}
      </div>
    </div>
  );
}
