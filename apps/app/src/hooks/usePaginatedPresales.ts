import { useReadContract } from "wagmi";
import { usePublicClient } from "wagmi";
import { contracts } from "../config/contracts";
import PresaleFactoryABI from "@launchpad-platform/contracts/abi_ts/contracts/PresaleFactory.sol/PresaleFactory";

export function usePaginatedPresales(
  page: number = 1,
  pageSize: number = 10,
  sort: "asc" | "desc" = "desc"
) {
  const publicClient = usePublicClient();
  const chainId = publicClient?.chain?.id;

  // Get the contract address based on chainId from public client
  const contractAddress = chainId
    ? (contracts[chainId as keyof typeof contracts] as `0x${string}`)
    : undefined;

  const {
    data: presales,
    isLoading,
    isError,
  } = useReadContract({
    address: contractAddress,
    abi: PresaleFactoryABI,
    functionName:
      sort === "desc"
        ? "getPaginatedPresalesDecreasingByCreation"
        : "getPaginatedPresales",
    args: sort === "desc" ? [BigInt(page), BigInt(pageSize)] : [BigInt(page)],
    query: {
      enabled: !!contractAddress && page > 0,
    },
  });

  return {
    presales: presales as `0x${string}`[] | undefined,
    isLoading,
    isError,
  };
}
