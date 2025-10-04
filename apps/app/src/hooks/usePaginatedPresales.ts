import { useReadContract } from "wagmi";
import PresaleFactoryABI from "@launchpad-platform/contracts/abi_ts/contracts/PresaleFactory.sol/PresaleFactory";

export function usePaginatedPresales(
  page: number = 1,
  pageSize: number = 10,
  sort: "asc" | "desc" = "desc"
) {
  // Get the contract address based on chainId
  const contractAddress = import.meta.env.VITE_PRESALE_FACTORY;

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
