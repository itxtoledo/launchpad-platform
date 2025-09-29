import { useReadContract } from "wagmi";
import PresaleABI from "@launchpad-platform/contracts/abi_ts/contracts/Presale.sol/Presale";
import MintableERC20ABI from "@launchpad-platform/contracts/abi_ts/contracts/MintableERC20.sol/MintableERC20";

// npx hardhat verify --network 97 0x739f1bF01e8a6e0f8F0Ab3953aBe24B815faD0FD "0xDF423c4D82626F57B04bAc63cDCBc4EaDb97E4Db" "0x8119aE7F1c8ecb910d6D6eec01B6508ad8F8FFF4" "1000000000000000" "0xc4b3272222E7635488cD5524a8fdA01BA7970568"
// TODO use multicall
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
  };
}
