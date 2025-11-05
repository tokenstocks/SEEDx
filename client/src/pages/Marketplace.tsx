import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, TrendingUp, TrendingDown, Plus } from "lucide-react";
import { Link } from "wouter";

export default function Marketplace() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [tokenAmount, setTokenAmount] = useState("");
  const [pricePerToken, setPricePerToken] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    
    if (!token || !userData) {
      setLocation("/login");
      return;
    }

    setUser(JSON.parse(userData));
  }, [setLocation]);

  const { data: projects } = useQuery<any[]>({
    queryKey: ["/api/projects"],
    enabled: !!user,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: ["/api/marketplace/orders", selectedProject],
    enabled: !!user && !!selectedProject,
  });

  const { data: myOrders } = useQuery<any[]>({
    queryKey: ["/api/marketplace/orders/my"],
    enabled: !!user,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/marketplace/orders", data);
    },
    onSuccess: () => {
      toast({
        title: "Order Created",
        description: "Your order has been placed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/orders/my"] });
      setTokenAmount("");
      setPricePerToken("");
    },
    onError: (error: Error) => {
      toast({
        title: "Order Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest("DELETE", `/api/marketplace/orders/${orderId}`);
    },
    onSuccess: () => {
      toast({
        title: "Order Cancelled",
        description: "Your order has been cancelled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/orders/my"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitOrder = () => {
    if (!selectedProject || !tokenAmount || !pricePerToken) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    createOrderMutation.mutate({
      projectId: selectedProject,
      orderType,
      tokenAmount,
      pricePerToken,
    });
  };

  const buyOrders = orders?.filter(o => o.orderType === "buy" && o.status === "open") || [];
  const sellOrders = orders?.filter(o => o.orderType === "sell" && o.status === "open") || [];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-7xl mx-auto p-4 py-8">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            data-testid="link-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2">Token Marketplace</h1>
          <p className="text-muted-foreground">
            Trade project tokens with other investors at NAV-based prices
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Trading Form */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Place Order</CardTitle>
              <CardDescription>Create a buy or sell order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Project</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger data-testid="select-project">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Order Type</Label>
                <Select value={orderType} onValueChange={(v: any) => setOrderType(v)}>
                  <SelectTrigger data-testid="select-order-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Token Amount</Label>
                <Input
                  type="number"
                  placeholder="0.000000"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  data-testid="input-token-amount"
                />
              </div>

              <div>
                <Label>Price per Token (NGNTS)</Label>
                <Input
                  type="number"
                  placeholder="100.00"
                  value={pricePerToken}
                  onChange={(e) => setPricePerToken(e.target.value)}
                  data-testid="input-price-per-token"
                />
              </div>

              <Button
                onClick={handleSubmitOrder}
                disabled={createOrderMutation.isPending}
                className="w-full"
                data-testid="button-submit-order"
              >
                <Plus className="w-4 h-4 mr-2" />
                Place {orderType === "buy" ? "Buy" : "Sell"} Order
              </Button>
            </CardContent>
          </Card>

          {/* Order Book */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Order Book</CardTitle>
              <CardDescription>
                {selectedProject ? "Active buy and sell orders" : "Select a project to view orders"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedProject ? (
                <div className="text-center py-12 text-muted-foreground">
                  Select a project to view the order book
                </div>
              ) : ordersLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Buy Orders */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <h3 className="font-semibold">Buy Orders</h3>
                    </div>
                    <div className="space-y-2">
                      {buyOrders.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No buy orders</p>
                      ) : (
                        buyOrders.map((order: any) => (
                          <div
                            key={order.id}
                            className="p-3 bg-green-50 dark:bg-green-950/20 rounded-md"
                            data-testid={`order-buy-${order.id}`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{order.tokenAmount} tokens</p>
                                <p className="text-sm text-muted-foreground">
                                  @ ₦{parseFloat(order.pricePerToken).toFixed(2)}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-green-600">Buy</Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Sell Orders */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                      <h3 className="font-semibold">Sell Orders</h3>
                    </div>
                    <div className="space-y-2">
                      {sellOrders.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No sell orders</p>
                      ) : (
                        sellOrders.map((order: any) => (
                          <div
                            key={order.id}
                            className="p-3 bg-red-50 dark:bg-red-950/20 rounded-md"
                            data-testid={`order-sell-${order.id}`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{order.tokenAmount} tokens</p>
                                <p className="text-sm text-muted-foreground">
                                  @ ₦{parseFloat(order.pricePerToken).toFixed(2)}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-red-600">Sell</Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* My Orders */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>My Orders</CardTitle>
            <CardDescription>View and manage your active and completed orders</CardDescription>
          </CardHeader>
          <CardContent>
            {!myOrders || myOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                You have no orders yet
              </div>
            ) : (
              <div className="space-y-2">
                {myOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 border rounded-md"
                    data-testid={`my-order-${order.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <Badge variant={order.orderType === "buy" ? "default" : "secondary"}>
                        {order.orderType.toUpperCase()}
                      </Badge>
                      <div>
                        <p className="font-medium">{order.tokenAmount} tokens</p>
                        <p className="text-sm text-muted-foreground">
                          @ ₦{parseFloat(order.pricePerToken).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={order.status === "open" ? "outline" : "secondary"}>
                        {order.status}
                      </Badge>
                      {order.status === "open" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => cancelOrderMutation.mutate(order.id)}
                          disabled={cancelOrderMutation.isPending}
                          data-testid={`button-cancel-${order.id}`}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
