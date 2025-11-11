import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle2, Trash2, Loader2, Building2, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { createPlatformBankAccountSchema } from "@shared/schema";

type BankAccountForm = z.infer<typeof createPlatformBankAccountSchema>;

interface BankAccount {
  id: string;
  title: string;
  bankName: string;
  accountNumber: string;
  companyName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminBankAccounts() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);

  const form = useForm<BankAccountForm>({
    resolver: zodResolver(createPlatformBankAccountSchema),
    defaultValues: {
      title: "",
      bankName: "",
      accountNumber: "",
      companyName: "",
    },
  });

  const { data: accountsData, isLoading } = useQuery<{ accounts: BankAccount[] }>({
    queryKey: ["/api/admin/settings/bank-accounts"],
  });

  const accounts = accountsData?.accounts || [];
  const activeAccount = accounts.find(a => a.isActive);

  const createMutation = useMutation({
    mutationFn: async (data: BankAccountForm) => {
      const response = await apiRequest("POST", "/api/admin/settings/bank-accounts", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bank Account Created",
        description: "The bank account has been added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/bank-accounts"] });
      setShowCreateDialog(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const response = await apiRequest("PUT", `/api/admin/settings/bank-accounts/${accountId}/activate`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bank Account Activated",
        description: "This account is now active for deposits",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/bank-accounts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Activation Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/settings/bank-accounts/${accountId}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bank Account Deleted",
        description: "The bank account has been removed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/bank-accounts"] });
      setShowDeleteDialog(false);
      setSelectedAccount(null);
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Cannot delete active account",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BankAccountForm) => {
    createMutation.mutate(data);
  };

  const handleActivate = (account: BankAccount) => {
    activateMutation.mutate(account.id);
  };

  const handleDelete = (account: BankAccount) => {
    if (account.isActive) {
      toast({
        title: "Cannot Delete Active Account",
        description: "Please activate another account first",
        variant: "destructive",
      });
      return;
    }
    setSelectedAccount(account);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (selectedAccount) {
      deleteMutation.mutate(selectedAccount.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white" data-testid="text-bank-accounts-title">
            Bank Accounts
          </h2>
          <p className="text-slate-400 mt-1">
            Manage platform bank accounts for NGN deposits
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          data-testid="button-add-account"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Bank Account
        </Button>
      </div>

      {/* Active Account Summary */}
      {activeAccount && (
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Active Bank Account
              </CardTitle>
              <Badge className="bg-primary/20 text-primary border-primary/30">
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400">Title</p>
                <p className="text-white font-medium" data-testid="text-active-title">
                  {activeAccount.title}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Bank Name</p>
                <p className="text-white font-medium" data-testid="text-active-bank">
                  {activeAccount.bankName}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Account Number</p>
                <p className="text-white font-medium" data-testid="text-active-account">
                  {activeAccount.accountNumber}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Company Name</p>
                <p className="text-white font-medium" data-testid="text-active-company">
                  {activeAccount.companyName}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Accounts Table */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">All Bank Accounts</CardTitle>
          <CardDescription className="text-slate-400">
            {accounts.length} account{accounts.length !== 1 ? 's' : ''} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400">No bank accounts configured</p>
              <p className="text-sm text-slate-500 mt-1">Add your first account to start accepting deposits</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-white/5">
                    <TableHead className="text-slate-300">Title</TableHead>
                    <TableHead className="text-slate-300">Bank Name</TableHead>
                    <TableHead className="text-slate-300">Account Number</TableHead>
                    <TableHead className="text-slate-300">Company</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-slate-300 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow 
                      key={account.id} 
                      className="border-white/10 hover:bg-white/5"
                      data-testid={`row-account-${account.id}`}
                    >
                      <TableCell className="text-white font-medium">
                        {account.title}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {account.bankName}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {account.accountNumber}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {account.companyName}
                      </TableCell>
                      <TableCell>
                        {account.isActive ? (
                          <Badge className="bg-primary/20 text-primary border-primary/30">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-slate-600 text-slate-400">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {!account.isActive && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleActivate(account)}
                              disabled={activateMutation.isPending}
                              className="border-primary/30 text-primary"
                              data-testid={`button-activate-${account.id}`}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Activate
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(account)}
                            disabled={account.isActive || deleteMutation.isPending}
                            className="border-red-500/30 text-red-400"
                            data-testid={`button-delete-${account.id}`}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Account Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Add Bank Account</DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure a new bank account for platform deposits
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Account Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Main Operations Account"
                        className="bg-white/5 border-white/10 text-white"
                        data-testid="input-title"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Bank Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., First Bank of Nigeria"
                        className="bg-white/5 border-white/10 text-white"
                        data-testid="input-bank-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Account Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0123456789"
                        className="bg-white/5 border-white/10 text-white"
                        data-testid="input-account-number"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Company Name (Account Holder)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., SEEDx Nigeria Ltd"
                        className="bg-white/5 border-white/10 text-white"
                        data-testid="input-company-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false);
                    form.reset();
                  }}
                  className="border-white/10 text-slate-300"
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-create-account"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Account
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Bank Account</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete this bank account? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedAccount && (
            <div className="bg-white/5 rounded-lg p-4 space-y-2">
              <p className="text-sm text-slate-400">Account Title</p>
              <p className="text-white font-medium">{selectedAccount.title}</p>
              <p className="text-sm text-slate-400 mt-3">Bank & Account</p>
              <p className="text-white">{selectedAccount.bankName} - {selectedAccount.accountNumber}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setSelectedAccount(null);
              }}
              className="border-white/10 text-slate-300"
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              variant="destructive"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
