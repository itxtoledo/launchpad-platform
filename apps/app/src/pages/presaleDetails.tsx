import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FaucetButton } from "@/components/FaucetButton";
import { CountdownTimer } from "@/components/CountdownTimer";

import { useState, useEffect } from "react";
import { useParams } from "@tanstack/react-router";

// importing necessary wagmi contract integration
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  type BaseError,
  useReadContract,
  useAccount,
} from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatEther, formatUnits, type Address, parseUnits } from "viem";

// importing contract ABI
import presaleAbi from "@launchpad-platform/contracts/abi_ts/contracts/Presale.sol/Presale";
import tokenAbi from "@launchpad-platform/contracts/abi_ts/contracts/MintableERC20.sol/MintableERC20";
import { useReadContracts } from "wagmi";
import { useNativeCurrency } from "@/hooks";

export default function PresaleDetails() {
  const nativeCurrencySymbol = useNativeCurrency();
  const { address: connectedAddress } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { address } = useParams({ from: "/presale-details/$address" });
  const { data: hash, error, isPending, writeContract } = useWriteContract();
  const [tokenAmount, setTokenAmount] = useState("");
  const [ethTotal, setEthTotal] = useState("0");

  const presaleContract = {
    abi: presaleAbi,
    address: address as Address,
  } as const;

  const { data: presaleOwner } = useReadContract({
    ...presaleContract,
    functionName: "owner",
  });

  const isOwner = connectedAddress === presaleOwner;

  const readTokenAddress = useReadContract({
    ...presaleContract,
    functionName: "token",
  });

  const tokenContract = {
    abi: tokenAbi,
    address: readTokenAddress.data,
  } as const;

  const multicallQuery = useReadContracts({
    contracts: [
      {
        ...tokenContract,
        functionName: "name",
      },
      {
        ...tokenContract,
        functionName: "symbol",
      },
      {
        ...tokenContract,
        functionName: "totalSupply",
      },
      {
        ...presaleContract,
        functionName: "price",
      },
      {
        ...tokenContract,
        functionName: "decimals",
      },
      {
        ...presaleContract,
        functionName: "hardCap",
      },
      {
        ...presaleContract,
        functionName: "softCap", // Added softCap
      },

      {
        ...presaleContract,
        functionName: "startTime",
      },
      {
        ...presaleContract,
        functionName: "endTime",
      },
      {
        ...presaleContract,
        functionName: "totalContributed",
      },
    ],
    query: {
      enabled: readTokenAddress.data !== undefined,
    },
  });

  // Log all presale and token data to console when loaded
  useEffect(() => {
    if (multicallQuery.isSuccess && readTokenAddress.data) {
      const tokenData = {
        name: multicallQuery.data[0].result,
        symbol: multicallQuery.data[1].result,
        totalSupply: multicallQuery.data[2].result,
        decimals: multicallQuery.data[4].result,
      };

      const presaleData = {
        tokenAddress: readTokenAddress.data,
        price: multicallQuery.data[3].result,
        hardCap: multicallQuery.data[5].result,
        softCap: multicallQuery.data[6].result, // Added softCap
        startTime: multicallQuery.data[7].result,
        endTime: multicallQuery.data[8].result,
        totalContributed: multicallQuery.data[9].result,
      };

      console.log("=== TOKEN DATA ===");
      console.log(tokenData);
      console.log("=== PRESALE DATA ===");
      console.log(presaleData);
      console.log("=== FORMATTED DATA ===");
      console.log({
        token: {
          name: tokenData.name,
          symbol: tokenData.symbol,
          totalSupply: formatUnits(
            tokenData.totalSupply ?? 0n,
            tokenData.decimals ?? 18
          ),
          decimals: tokenData.decimals,
        },
        presale: {
          tokenAddress: presaleData.tokenAddress,
          price: formatEther(presaleData.price ?? 0n),
          hardCap: formatEther(presaleData.hardCap ?? 0n),
          softCap: formatEther(presaleData.softCap ?? 0n), // Added softCap
          startTime: new Date(
            Number(presaleData.startTime ?? 0n) * 1000
          ).toLocaleString(),
          endTime: new Date(
            Number(presaleData.endTime ?? 0n) * 1000
          ).toLocaleString(),
          totalContributed: formatEther(presaleData.totalContributed ?? 0n),
        },
      });
    }
  }, [multicallQuery.isSuccess, readTokenAddress.data, multicallQuery.data]);

  // Calculate ETH total when token amount or price changes
  useEffect(() => {
    if (tokenAmount && multicallQuery.data?.[3].result) {
      try {
        const price = multicallQuery.data[3].result;
        const decimals = multicallQuery.data[4].result || 18n;
        const amount = parseUnits(tokenAmount || "0", Number(decimals));
        const total = (amount * price) / parseUnits("1", Number(decimals));
        setEthTotal(formatEther(total));
      } catch (e) {
        setEthTotal("0");
      }
    } else {
      setEthTotal("0");
    }
  }, [tokenAmount, multicallQuery.data]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!connectedAddress) {
      // If not connected, open the wallet connection modal
      openConnectModal?.();
      return;
    }

    // Convert token amount to smallest unit (wei)
    const amount = parseUnits(tokenAmount || "0", Number(tokenDecimals));

    writeContract({
      address: (address as string)?.startsWith("0x")
        ? (address as Address)
        : (`0x${address ?? ""}` as Address),
      abi: presaleAbi,
      functionName: "contribute",
      args: [amount],
      value: BigInt(parseUnits(ethTotal, 18).toString()), // Send ETH value
    });
  }

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const hardCap = multicallQuery.data?.[5].result ?? 0n;
  const softCap = multicallQuery.data?.[6].result ?? 0n; // Added softCap
  const startTime = multicallQuery.data?.[7].result ?? 0n;
  const endTime = multicallQuery.data?.[8].result ?? 0n;
  const totalContributed = multicallQuery.data?.[9].result ?? 0n;
  const tokenPrice = multicallQuery.data?.[3].result ?? 0n;
  const tokenSymbol = multicallQuery.data?.[1].result ?? "";
  const tokenDecimals = multicallQuery.data?.[4].result ?? 18n;

  const currentTime = BigInt(Math.floor(Date.now() / 1000));
  const hasStarted = currentTime >= startTime;
  const hasEnded = currentTime > endTime;
  const softCapNotReached = softCap > 0n && totalContributed < softCap;
  const showRefundButton = hasEnded && softCapNotReached;

  const progressValue =
    hardCap > 0 ? Number((totalContributed * 100n) / hardCap) : 0;

  return (
    <>
      {(multicallQuery.isLoading || readTokenAddress.isLoading) && (
        <Card className="w-full max-w-4xl mx-auto my-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-5 w-full" />
              </div>
              <Skeleton className="h-10 w-32" /> {/* Space for FaucetButton */}
            </div>
          </CardHeader>
          <CardContent className="grid gap-12 lg:grid-cols-2 lg:gap-24">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="space-y-1">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-5 w-3/4" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-8 w-full" />
                <div className="flex justify-between text-sm">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-5 w-full" />
              </div>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {multicallQuery.isSuccess && (
        <Card className="w-full max-w-4xl mx-auto my-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{multicallQuery.data[0].result} Presale</CardTitle>
                <CardDescription>
                  Get in early on the {multicallQuery.data[0].result} presale.
                </CardDescription>
              </div>
              {hasStarted && !hasEnded && <FaucetButton />}
            </div>
          </CardHeader>
          <CardContent className="grid gap-12 lg:grid-cols-2 lg:gap-24">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    Token Name
                  </div>
                  <div>{multicallQuery.data[0].result}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    Token Symbol
                  </div>
                  <div>{multicallQuery.data[1].result}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    Price
                  </div>
                  <div>
                    {formatEther(multicallQuery.data[3].result ?? 0n)}{" "}
                    {nativeCurrencySymbol}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    Total Supply
                  </div>
                  <div>
                    {formatUnits(
                      multicallQuery.data[2].result ?? 0n,
                      multicallQuery.data[4].result ?? 0
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    Hard Cap
                  </div>
                  <div>
                    {formatEther(hardCap)} {nativeCurrencySymbol}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    Soft Cap
                  </div>
                  <div>
                    {formatEther(softCap)} {nativeCurrencySymbol}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    Start Time
                  </div>
                  <div>
                    {new Date(Number(startTime) * 1000).toLocaleString()}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    End Time
                  </div>
                  <div>
                    {endTime === 0n ? "No limit" : new Date(Number(endTime) * 1000).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Presale Progress
                </div>
                <Progress value={progressValue} />
                <div className="flex justify-between text-sm">
                  <div>
                    {formatEther(totalContributed)} {nativeCurrencySymbol}{" "}
                    contributed
                  </div>
                  <div>
                    {formatEther(hardCap)} {nativeCurrencySymbol} hard cap
                  </div>
                </div>
              </div>

              {isOwner && (
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Owner Actions</h2>
                  <div className="flex flex-col space-y-2">
                    <Button
                      onClick={() =>
                        writeContract({
                          address: address as Address,
                          abi: presaleAbi,
                          functionName: "withdrawETH",
                        })
                      }
                      disabled={isPending || !hasStarted}
                    >
                      {!hasStarted
                        ? "Presale Not Started"
                        : isPending
                        ? "Confirming..."
                        : "Withdraw ETH"}
                    </Button>
                    <Button
                      onClick={() =>
                        writeContract({
                          address: address as Address,
                          abi: presaleAbi,
                          functionName: "withdrawToken",
                          args: [readTokenAddress.data as Address],
                        })
                      }
                      disabled={isPending || !hasStarted}
                    >
                      {!hasStarted
                        ? "Presale Not Started"
                        : isPending
                        ? "Confirming..."
                        : "Withdraw Tokens"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-6">
              {showRefundButton ? (
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Presale Ended</h2>
                  <p className="text-muted-foreground">
                    The presale has ended and the soft cap was not reached. You
                    can now withdraw your contributed funds.
                  </p>
                  <Button
                    onClick={() =>
                      writeContract({
                        address: address as Address,
                        abi: presaleAbi,
                        functionName: "refund",
                      })
                    }
                    disabled={isPending}
                    className="w-full"
                  >
                    {isPending ? "Confirming Refund..." : "Refund"}
                  </Button>
                  {hash && <div>Transaction Hash: {hash}</div>}
                  {isConfirming && <div>Waiting for confirmation...</div>}
                  {isConfirmed && <div>Transaction confirmed.</div>}
                  {error && (
                    <div>
                      Alert:{" "}
                      {(error as BaseError).shortMessage || error.message}
                    </div>
                  )}
                </div>
              ) : !hasStarted ? (
                // Show countdown timer when presale hasn't started yet
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Presale Not Started</h2>
                  <p className="text-muted-foreground">
                    This presale has not started yet. Please wait until the
                    presale starts.
                  </p>
                  <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                    <div className="text-sm font-medium text-muted-foreground">
                      Starts in:
                    </div>
                    <CountdownTimer
                      targetDate={new Date(Number(startTime) * 1000)}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold">Contribute</h2>
                    <p className="text-muted-foreground">
                      Enter the amount of {tokenSymbol} tokens you want to
                      purchase.
                    </p>
                  </div>
                  <form onSubmit={submit} className="space-y-4">
                    {/* Token Amount Input - Uniswap Style */}
                    <div className="space-y-2">
                      <Label htmlFor="amount">From</Label>
                      <div className="relative rounded-xl bg-card border">
                        <Input
                          id="amount"
                          name="amount"
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.0"
                          value={tokenAmount}
                          onChange={(e) => setTokenAmount(e.target.value)}
                          className="h-14 pl-4 pr-20 text-xl border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 text-sm font-medium">
                          {tokenSymbol}
                        </div>
                      </div>
                    </div>

                    {/* ETH Total Display - Uniswap Style */}
                    <div className="space-y-2">
                      <Label>To</Label>
                      <div className="relative rounded-xl bg-card border">
                        <div className="h-14 pl-4 pr-20 text-xl flex items-center border-0 bg-transparent">
                          {ethTotal}
                        </div>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 text-sm font-medium">
                          {nativeCurrencySymbol}
                        </div>
                      </div>
                    </div>

                    {/* Rate Display */}
                    <div className="text-sm text-muted-foreground px-1">
                      1 {tokenSymbol} = {formatEther(tokenPrice)}{" "}
                      {nativeCurrencySymbol}
                    </div>

                    <Button type="submit" className="w-full">
                      {isPending
                        ? "Confirming..."
                        : !connectedAddress
                        ? "Connect Wallet"
                        : "Contribute"}
                    </Button>
                    {hash && <div>Transaction Hash: {hash}</div>}
                    {isConfirming && <div>Waiting for confirmation...</div>}
                    {isConfirmed && <div>Transaction confirmed.</div>}
                    {error && (
                      <div>
                        Alert:{" "}
                        {(error as BaseError).shortMessage || error.message}
                      </div>
                    )}
                  </form>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
