import { useReadContract } from "wagmi";
import { MintableERC20ABI } from "@launchpad-platform/contracts/abi_ts/MintableERC20";

export function useToken(tokenAddress: `0x${string}`) {
  const { data: presaleAddress, isLoading } = useReadContract({
    address: tokenAddress,
    abi: MintableERC20ABI,
    functionName: "presaleAddress",
    query: {
      enabled: !!tokenAddress,
    },
  });

  return {
    presaleAddress: presaleAddress as `0x${string}` | null,
    isLoading,
  };
}
