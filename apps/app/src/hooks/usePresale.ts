import { useReadContract } from "wagmi";
import PresaleABI from "@launchpad-platform/contracts/abi_ts/contracts/Presale.sol/Presale";
import MintableERC20ABI from "@launchpad-platform/contracts/abi_ts/contracts/MintableERC20.sol/MintableERC20";

// Comprehensive hook for all presale-related contract reads
export function usePresale(presaleAddress: `0x${string}`) {
  // Direct reactive reads for presale contract
  const tokenAddress = useReadContract({
    address: presaleAddress,
    abi: PresaleABI,
    functionName: "token",
    query: {
      enabled: !!presaleAddress,
    },
  });

  const price = useReadContract({
    address: presaleAddress,
    abi: PresaleABI,
    functionName: "price",
    query: {
      enabled: !!presaleAddress,
    },
  });

  const totalContributed = useReadContract({
    address: presaleAddress,
    abi: PresaleABI,
    functionName: "totalContributed",
    query: {
      enabled: !!presaleAddress,
    },
  });

  const hardCap = useReadContract({
    address: presaleAddress,
    abi: PresaleABI,
    functionName: "hardCap",
    query: {
      enabled: !!presaleAddress,
    },
  });

  const startTime = useReadContract({
    address: presaleAddress,
    abi: PresaleABI,
    functionName: "startTime",
    query: {
      enabled: !!presaleAddress,
    },
  });

  const endTime = useReadContract({
    address: presaleAddress,
    abi: PresaleABI,
    functionName: "endTime",
    query: {
      enabled: !!presaleAddress,
    },
  });

  const softCap = useReadContract({
    address: presaleAddress,
    abi: PresaleABI,
    functionName: "softCap",
    query: {
      enabled: !!presaleAddress,
    },
  });

  const softCapReached = useReadContract({
    address: presaleAddress,
    abi: PresaleABI,
    functionName: "softCapReached",
    query: {
      enabled: !!presaleAddress,
    },
  });

  const presaleOwner = useReadContract({
    address: presaleAddress,
    abi: PresaleABI,
    functionName: "owner",
    query: {
      enabled: !!presaleAddress,
    },
  });

  const presaleFailed = useReadContract({
    address: presaleAddress,
    abi: PresaleABI,
    functionName: "presaleFailed",
    query: {
      enabled: !!presaleAddress,
    },
  });

  const hasSoftCap = useReadContract({
    address: presaleAddress,
    abi: PresaleABI,
    functionName: "hasSoftCap",
    query: {
      enabled: !!presaleAddress,
    },
  });

  // Reactive reads for token contract (requires token address to be loaded first)
  const tokenName = useReadContract({
    address: tokenAddress.data as `0x${string}`,
    abi: MintableERC20ABI,
    functionName: "name",
    query: {
      enabled: !!tokenAddress.data,
    },
  });

  const tokenSymbol = useReadContract({
    address: tokenAddress.data as `0x${string}`,
    abi: MintableERC20ABI,
    functionName: "symbol",
    query: {
      enabled: !!tokenAddress.data,
    },
  });

  const tokenTotalSupply = useReadContract({
    address: tokenAddress.data as `0x${string}`,
    abi: MintableERC20ABI,
    functionName: "totalSupply",
    query: {
      enabled: !!tokenAddress.data,
    },
  });

  const tokenDecimals = useReadContract({
    address: tokenAddress.data as `0x${string}`,
    abi: MintableERC20ABI,
    functionName: "decimals",
    query: {
      enabled: !!tokenAddress.data,
    },
  });

  return {
    tokenAddress,
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
    presaleFailed,
    hasSoftCap,
    tokenTotalSupply,
    tokenDecimals,
  };
}
