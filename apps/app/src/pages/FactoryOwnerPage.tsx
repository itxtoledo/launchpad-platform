import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { parseEther, formatEther } from "viem";
import { usePresaleFactory } from "../hooks/usePresaleFactory";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "@/components/ui/sonner";

export function FactoryOwnerPage() {
  const { isConnected } = useAccount();
  const [newFee, setNewFee] = useState("");

  // Use the PresaleFactory hook
  const {
    isOwner,
    withdrawFees,
    setPresaleCreationFee,
    isWritePending,
    isWriteError,
    writeError,
    isWriteSuccess,
    presaleCreationFee,
    isLoadingPresaleFee,
    refetchPresaleFee,
    factoryBalance,
    isLoadingFactoryBalance,
    refetchFactoryBalance,
  } = usePresaleFactory();

  const handleWithdraw = () => {
    withdrawFees();
  };

  const handleSetFee = () => {
    try {
      const feeInWei = parseEther(newFee);
      setPresaleCreationFee(feeInWei);
    } catch (error) {
      toast("Error", {
        description: "Invalid fee amount. Please enter a valid number.",
      });
    }
  };

  // Refetch data on successful transactions and show notifications
  useEffect(() => {
    if (isWriteSuccess) {
      refetchFactoryBalance();
      refetchPresaleFee();
      toast("Transaction Successful", {
        description: "Operation completed successfully.",
      });
    }
  }, [isWriteSuccess, refetchFactoryBalance, refetchPresaleFee]);

  // Show error notifications when transactions fail
  useEffect(() => {
    if (isWriteError && writeError) {
      toast("Transaction Failed", {
        description:
          writeError.message || "An error occurred during the transaction.",
      });
    }
  }, [isWriteError, writeError]);

  if (!isConnected) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please connect your wallet to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You are not the owner of the Presale Factory contract.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Presale Factory Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Factory Balance</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingFactoryBalance ? (
              <p>Loading balance...</p>
            ) : (
              <p className="text-2xl font-semibold mb-4">
                {factoryBalance ? formatEther(factoryBalance) : "0"} ETH
              </p>
            )}
            <Button onClick={handleWithdraw} disabled={isWritePending}>
              {isWritePending ? "Processing..." : "Withdraw Fees"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Creation Fee</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPresaleFee ? (
              <p>Loading fee...</p>
            ) : (
              <p className="text-2xl font-semibold mb-4">
                {presaleCreationFee ? formatEther(presaleCreationFee) : "0"} ETH
              </p>
            )}
            <div className="flex flex-col space-y-4">
              <Label htmlFor="new-fee">Set New Creation Fee (ETH)</Label>
              <Input
                id="new-fee"
                type="number"
                value={newFee}
                onChange={(e) => setNewFee(e.target.value)}
                placeholder="e.g., 0.01"
              />
              <Button onClick={handleSetFee} disabled={isWritePending}>
                {isWritePending ? "Processing..." : "Update Fee"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
