import { useParams } from "@tanstack/react-router";
import { useReadContract } from "wagmi";
import { MintableERC20ABI } from "@launchpad-platform/contracts/abi_ts/MintableERC20";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";

export function TokenDetails() {
  const { address } = useParams({ from: "/token/$address" });

  const {
    data: name,
    isLoading: isLoadingName,
    isError: isErrorName,
  } = useReadContract({
    address: address as `0x${string}`,
    abi: MintableERC20ABI,
    functionName: "name",
  });

  const {
    data: symbol,
    isLoading: isLoadingSymbol,
    isError: isErrorSymbol,
  } = useReadContract({
    address: address as `0x${string}`,
    abi: MintableERC20ABI,
    functionName: "symbol",
  });

  const {
    data: totalSupply,
    isLoading: isLoadingTotalSupply,
    isError: isErrorTotalSupply,
  } = useReadContract({
    address: address as `0x${string}`,
    abi: MintableERC20ABI,
    functionName: "totalSupply",
  });

  if (isLoadingName || isLoadingSymbol || isLoadingTotalSupply)
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Token Details</h1>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-3/4 mb-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  if (isErrorName || isErrorSymbol || isErrorTotalSupply)
    return <div>Error loading token details.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Token Details</h1>
      <Card>
        <CardHeader>
          <CardTitle>
            {name} ({symbol})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            <strong>Address:</strong> {address}
          </p>
          <p>
            <strong>Total Supply:</strong> {totalSupply?.toString()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
