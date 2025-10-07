import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePresale } from "@/hooks/usePresale";
import { useNativeCurrency } from "@/hooks";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { CountdownTimer } from "./CountdownTimer";
import { Badge } from "./ui/badge";

interface PresaleCardProps {
  presaleAddress: `0x${string}`;
}

export function PresaleCard({ presaleAddress }: PresaleCardProps) {
  const {
    tokenName,
    tokenSymbol,
    totalContributed,
    hardCap,
    startTime,
    endTime,
    softCap,
    softCapReached,
  } = usePresale(presaleAddress);

  const nativeCurrencySymbol = useNativeCurrency();
  const currentTime = Date.now() / 1000; // Current time in seconds

  const isLoading = 
    tokenName.isLoading ||
    tokenSymbol.isLoading ||
    totalContributed.isLoading ||
    hardCap.isLoading ||
    startTime.isLoading ||
    endTime.isLoading ||
    softCap.isLoading ||
    softCapReached.isLoading;

  const progress = hardCap.data && Number(hardCap.data) > 0 ? (Number(totalContributed.data || 0) / Number(hardCap.data)) * 100 : 0;
  const softCapProgress = softCap.data && Number(softCap.data) > 0 ? (Number(totalContributed.data || 0) / Number(softCap.data)) * 100 : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4 mb-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-10 w-full mt-4" />
        </CardContent>
      </Card>
    );
  }

  // Convert bigints to numbers for time calculations
  const startTimeNum = Number(startTime.data);
  const endTimeNum = Number(endTime.data);

  // Determine presale status
  const hasStarted = startTime.data !== undefined && currentTime >= startTimeNum;
  const hasEnded = endTime.data !== undefined && currentTime >= endTimeNum && endTimeNum !== 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {tokenName.data} ({tokenSymbol.data})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Raised Amount */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Raised</span>
            <span>
              {totalContributed.data !== undefined ? (Number(totalContributed.data) / 1e18).toFixed(4) : "0.0000"} {nativeCurrencySymbol}
            </span>
          </div>
          <Progress value={progress} className="w-full" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>
              {totalContributed.data !== undefined ? (Number(totalContributed.data) / 1e18).toFixed(4) : "0.0000"} / {hardCap.data !== undefined ? (Number(hardCap.data) / 1e18).toFixed(4) : "0.0000"} {nativeCurrencySymbol}
            </span>
          </div>
        </div>

        {/* Soft Cap Status */}
        {softCap.data !== undefined && Number(softCap.data) > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span>Soft Cap</span>
              <Badge variant={softCapReached.data ? "default" : "secondary"}>
                {softCapReached.data ? "Achieved" : "Not Reached"}
              </Badge>
            </div>
            <Progress value={softCapProgress} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>
                {totalContributed.data !== undefined ? (Number(totalContributed.data) / 1e18).toFixed(4) : "0.0000"} / {softCap.data !== undefined ? (Number(softCap.data) / 1e18).toFixed(4) : "0.0000"} {nativeCurrencySymbol}
              </span>
            </div>
          </div>
        )}

        {/* Status and Countdown */}
        <div className="mb-4">
          {!hasStarted ? (
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Starts in:</span>
                <CountdownTimer targetDate={new Date(Number(startTime.data) * 1000)} />
            </div>
          ) : hasEnded ? (
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant="destructive">Ended</Badge>
            </div>
          ) : (
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant="success">Active</Badge>
            </div>
          )}
        </div>

        <Link to={`/presale-details/${presaleAddress}`}>
          <Button className="w-full">View Details</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
