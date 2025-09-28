import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { contracts } from "../config/contracts";
import PresaleFactoryABI from "@launchpad-platform/contracts/abi_ts/contracts/PresaleFactory.sol/PresaleFactory";
import { useMemo } from "react";

export function usePresaleFactory() {
  const { chainId, address } = useAccount();

  // Get the contract address based on chainId
  const contractAddress = chainId
    ? (contracts[chainId as keyof typeof contracts] as `0x${string}`)
    : undefined;

  // Write contract functions
  const {
    data: createPresaleData,
    writeContract: createPresale,
    isPending: isCreatePresalePending,
    isError: isCreatePresaleError,
    error: createPresaleError,
  } = useWriteContract();

  // Write contract functions for factory owner operations
  const {
    data: ownerWriteData,
    writeContract: writeContractOwner,
    isPending: isWritePending,
    isError: isWriteError,
    error: writeError,
  } = useWriteContract();

  // Transaction receipt for owner operations
  const { isLoading: isWriteLoading, isSuccess: isWriteSuccess } =
    useWaitForTransactionReceipt({
      hash: ownerWriteData,
    });

  // Owner-specific read functions
  const { data: ownerAddress, isLoading: isLoadingOwner } = useReadContract({
    address: contractAddress,
    abi: PresaleFactoryABI,
    functionName: "owner",
    query: {
      enabled: !!contractAddress,
    },
  });

  const {
    data: factoryBalance,
    isLoading: isLoadingFactoryBalance,
    refetch: refetchFactoryBalance,
  } = useReadContract({
    address: contractAddress,
    abi: PresaleFactoryABI,
    functionName: "getFactoryBalance",
    query: {
      enabled: !!contractAddress,
    },
  });

  const {
    data: presaleCreationFee,
    isLoading: isLoadingPresaleFee,
    refetch: refetchPresaleFee,
  } = useReadContract({
    address: contractAddress,
    abi: PresaleFactoryABI,
    functionName: "presaleCreationFee",
    query: {
      enabled: !!contractAddress,
    },
  });

  // Owner-specific write functions
  const withdrawFees = () => {
    if (!contractAddress) return;
    writeContractOwner({
      address: contractAddress,
      abi: PresaleFactoryABI,
      functionName: "withdrawFees",
    });
  };

  const setPresaleCreationFee = (fee: bigint) => {
    if (!contractAddress) return;
    writeContractOwner({
      address: contractAddress,
      abi: PresaleFactoryABI,
      functionName: "setPresaleCreationFee",
      args: [fee],
    });
  };

  // Read functions for paginated presales
  const {
    data: paginatedPresales,
    isLoading: isLoadingPaginatedPresales,
    isError: isErrorPaginatedPresales,
  } = useReadContract({
    address: contractAddress,
    abi: PresaleFactoryABI,
    functionName: "getPaginatedPresalesDecreasingByCreation",
    args: [BigInt(0), BigInt(10)], // Default values, can be overridden or passed as arguments to the hook
    query: {
      enabled: !!contractAddress,
    },
  });

  // Read functions for user created tokens
  const {
    data: userCreatedTokens,
    isLoading: isLoadingUserCreatedTokens,
    isError: isErrorUserCreatedTokens,
  } = useReadContract({
    address: contractAddress,
    abi: PresaleFactoryABI,
    functionName: "getUserCreatedTokens",
    args: [address!],
    query: {
      enabled: !!address && !!contractAddress,
    },
  });

  const isOwner = useMemo(() => {
    return ownerAddress === address;
  }, [ownerAddress, address]);

  return {
    // Contract address
    contractAddress,

    // Owner-specific read functions
    isOwner,
    ownerAddress,
    isLoadingOwner,

    factoryBalance,
    isLoadingFactoryBalance,
    refetchFactoryBalance,

    presaleCreationFee,
    isLoadingPresaleFee,
    refetchPresaleFee,

    // Paginated Presales
    paginatedPresales: paginatedPresales as `0x${string}`[] | undefined,
    isLoadingPaginatedPresales,
    isErrorPaginatedPresales,

    // User Created Tokens
    userCreatedTokens: userCreatedTokens as `0x${string}`[] | undefined,
    isLoadingUserCreatedTokens,
    isErrorUserCreatedTokens,

    // Write functions
    createPresale,
    createPresaleData,
    isCreatePresalePending,
    isCreatePresaleError,
    createPresaleError,

    // Owner-specific write functions
    withdrawFees,
    setPresaleCreationFee,
    ownerWriteData,
    isWritePending,
    isWriteError,
    writeError,
    isWriteLoading,
    isWriteSuccess,
  };
}
