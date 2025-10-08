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
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  type BaseError,
  useAccount,
} from "wagmi";
import { formatEther, formatUnits, type Address, parseUnits } from "viem";

// importing contract ABI
import presaleAbi from "@launchpad-platform/contracts/abi_ts/contracts/Presale.sol/Presale";
import { useNativeCurrency } from "@/hooks";
import { usePresale } from "@/hooks/usePresale";

export default function PresaleDetails() {
  const nativeCurrencySymbol = useNativeCurrency();
  const { address: connectedAddress } = useAccount();
  const { address } = useParams({ from: "/presale-details/$address" });
  const { data: hash, error, isPending, writeContract } = useWriteContract();
  const [tokenAmount, setTokenAmount] = useState("");
  const [ethTotal, setEthTotal] = useState("0");

  // Use the enhanced custom hook for all presale data
  const {
    tokenAddress: readTokenAddress,
    tokenName,
    tokenSymbol,
    price,
    totalContributed,
    hardCap,
    startTime,
    endTime,
    softCap,
    softCapReached,
    presaleOwner,
    presaleFailed: presaleFailedStatus,
    hasSoftCap,
    tokenTotalSupply,
    tokenDecimals,
  } = usePresale(address as `0x${string}`);

  // No additional data is needed since the hook provides everything
  const additionalDataLoading = false;

  // Calculate if the connected address is the owner
  const isOwner = connectedAddress === presaleOwner.data;

  // Log all presale and token data to console when loaded
  useEffect(() => {
    if (readTokenAddress.isSuccess && price.isSuccess) {
      const tokenData = {
        name: tokenName.data || "",
        symbol: tokenSymbol.data || "",
        totalSupply: (tokenTotalSupply.data as bigint) || 0n,
        decimals: (tokenDecimals.data as bigint) || 18n,
      };

      const presaleData = {
        tokenAddress: readTokenAddress.data,
        price: (price.data as bigint) || 0n,
        hardCap: (hardCap.data as bigint) || 0n,
        softCap: (softCap.data as bigint) || 0n,
        startTime: (startTime.data as bigint) || 0n,
        endTime: (endTime.data as bigint) || 0n,
        totalContributed: (totalContributed.data as bigint) || 0n,
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
            Number(tokenData.decimals ?? 18n)
          ),
          decimals: tokenData.decimals,
        },
        presale: {
          tokenAddress: presaleData.tokenAddress,
          price: formatEther(presaleData.price ?? 0n),
          hardCap: formatEther(presaleData.hardCap ?? 0n),
          softCap: formatEther(presaleData.softCap ?? 0n),
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
  }, [
    readTokenAddress.isSuccess,
    price.isSuccess,
    tokenName.data,
    tokenSymbol.data,
    tokenTotalSupply.data,
    tokenDecimals.data,
    readTokenAddress.data,
    price.data,
    hardCap.data,
    softCap.data,
    startTime.data,
    endTime.data,
    totalContributed.data,
  ]);

  // Calculate ETH total when token amount or price changes
  useEffect(() => {
    if (tokenAmount && price.data) {
      try {
        const priceValue = BigInt((price.data as bigint) || 0n);
        const decimalsValue = BigInt((tokenDecimals.data as bigint) || 18n);
        const amount = parseUnits(tokenAmount || "0", Number(decimalsValue));
        const total =
          (amount * priceValue) / parseUnits("1", Number(decimalsValue));
        setEthTotal(formatEther(total));
      } catch (e) {
        setEthTotal("0");
      }
    } else {
      setEthTotal("0");
    }
  }, [tokenAmount, price.data, tokenDecimals.data]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Convert token amount to smallest unit (wei)
    const amount = parseUnits(
      tokenAmount || "0",
      Number((tokenDecimals.data as bigint) || 18n)
    );

    writeContract({
      address: address as Address,
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

  // Calculate current time and states
  const currentTime = BigInt(Math.floor(Date.now() / 1000));
  const hasStarted = currentTime >= BigInt((startTime.data as bigint) || 0n);
  const hasEnded = currentTime > BigInt((endTime.data as bigint) || 0n);
  const isPresaleSuccessful = hasEnded && Boolean(softCapReached.data);
  const showRefundButton = Boolean(presaleFailedStatus.data);
  const showClaimTokensButton = isPresaleSuccessful && !showRefundButton;

  // Calculate progress value
  const progressValue =
    hardCap.data && BigInt(hardCap.data as bigint) > 0n
      ? Number(
          (BigInt((totalContributed.data as bigint) || 0n) * 100n) /
            BigInt(hardCap.data as bigint)
        )
      : 0;

  return (
    <>
      {(readTokenAddress.isLoading ||
        price.isLoading ||
        tokenName.isLoading ||
        tokenSymbol.isLoading ||
        hardCap.isLoading ||
        totalContributed.isLoading ||
        startTime.isLoading ||
        endTime.isLoading ||
        softCap.isLoading ||
        softCapReached.isLoading ||
        presaleOwner.isLoading ||
        presaleFailedStatus.isLoading ||
        hasSoftCap.isLoading ||
        tokenTotalSupply.isLoading ||
        tokenDecimals.isLoading ||
        additionalDataLoading) && (
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
      {readTokenAddress.isSuccess &&
        price.isSuccess &&
        tokenName.isSuccess &&
        tokenSymbol.isSuccess &&
        hardCap.isSuccess &&
        totalContributed.isSuccess &&
        startTime.isSuccess &&
        endTime.isSuccess &&
        softCap.isSuccess &&
        softCapReached.isSuccess &&
        presaleOwner.isSuccess &&
        presaleFailedStatus.isSuccess &&
        hasSoftCap.isSuccess &&
        tokenTotalSupply.isSuccess &&
        tokenDecimals.isSuccess &&
        !additionalDataLoading && (
          <Card className="w-full max-w-4xl mx-auto my-8">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>
                    {String(tokenName.data || "Unknown Token")} Presale
                  </CardTitle>
                  <CardDescription>
                    Get in early on the{" "}
                    {String(tokenName.data || "Unknown Token")} presale.
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
                    <div>{String(tokenName.data || "")}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">
                      Token Symbol
                    </div>
                    <div>{String(tokenSymbol.data || "")}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">
                      Price
                    </div>
                    <div>
                      {formatEther(BigInt((price.data as bigint) || 0n))}{" "}
                      {nativeCurrencySymbol}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">
                      Total Supply
                    </div>
                    <div>
                      {formatUnits(
                        BigInt((tokenTotalSupply.data as bigint) || 0n),
                        Number((tokenDecimals.data as bigint) || 18n)
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">
                      Hard Cap
                    </div>
                    <div>
                      {formatEther(BigInt((hardCap.data as bigint) || 0n))}{" "}
                      {nativeCurrencySymbol}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">
                      Soft Cap
                    </div>
                    <div>
                      {formatEther(BigInt((softCap.data as bigint) || 0n))}{" "}
                      {nativeCurrencySymbol}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">
                      Start Time
                    </div>
                    <div>
                      {new Date(
                        Number(BigInt((startTime.data as bigint) || 0n)) * 1000
                      ).toLocaleString()}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">
                      End Time
                    </div>
                    <div>
                      {new Date(
                        Number(BigInt((endTime.data as bigint) || 0n)) * 1000
                      ).toLocaleString()}
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
                      {formatEther(
                        BigInt((totalContributed.data as bigint) || 0n)
                      )}{" "}
                      {nativeCurrencySymbol} contributed
                    </div>
                    <div>
                      {formatEther(BigInt((hardCap.data as bigint) || 0n))}{" "}
                      {nativeCurrencySymbol} hard cap
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
                            args: [readTokenAddress.data as `0x${string}`],
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
                {hasEnded ? (
                  // Presale has ended - show different UI based on success/failure
                  showRefundButton ? (
                    // Presale failed - show refund button
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold">Presale Failed</h2>
                      <p className="text-muted-foreground">
                        The presale has ended and the soft cap was not reached.
                        You can now withdraw your contributed funds.
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
                        {isPending ? "Confirming Refund..." : "Refund Funds"}
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
                  ) : showClaimTokensButton ? (
                    // Presale was successful - show claim tokens button
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold">Presale Successful</h2>
                      <p className="text-muted-foreground">
                        Congratulations! The presale has ended successfully. You
                        can now claim your tokens.
                      </p>
                      <Button
                        onClick={() =>
                          writeContract({
                            address: address as Address,
                            abi: presaleAbi,
                            functionName: "claimTokens",
                          })
                        }
                        disabled={isPending}
                        className="w-full"
                      >
                        {isPending ? "Confirming Claim..." : "Claim Tokens"}
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
                  ) : (
                    // General ended state (this shouldn't happen if logic is correct)
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold">Presale Ended</h2>
                      <p className="text-muted-foreground">
                        The presale has ended. Check back later for more
                        information.
                      </p>
                    </div>
                  )
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
                        targetDate={
                          new Date(
                            Number(BigInt((startTime.data as bigint) || 0n)) *
                              1000
                          )
                        }
                      />
                    </div>
                  </div>
                ) : (
                  // Active presale - show buying inputs
                  <>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold">Contribute</h2>
                      <p className="text-muted-foreground">
                        Enter the amount of {String(tokenSymbol.data || "")}{" "}
                        tokens you want to purchase.
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
                            {String(tokenSymbol.data || "")}
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
                        1 {String(tokenSymbol.data || "")} ={" "}
                        {formatEther(BigInt((price.data as bigint) || 0n))}{" "}
                        {nativeCurrencySymbol}
                      </div>

                      {/* Countdown to presale end if there is an end time and it's different from 0 */}
                      {endTime.data &&
                        BigInt((endTime.data as bigint) || 0n) > 0n && (
                          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                            <div className="text-sm font-medium text-muted-foreground">
                              Ends in:
                            </div>
                            <CountdownTimer
                              targetDate={
                                new Date(
                                  Number(
                                    BigInt((endTime.data as bigint) || 0n)
                                  ) * 1000
                                )
                              }
                            />
                          </div>
                        )}

                      <Button
                        type="submit"
                        disabled={isPending}
                        className="w-full"
                      >
                        {isPending ? "Confirming..." : "Contribute"}
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
