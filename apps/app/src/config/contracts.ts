import { bscTestnet } from "wagmi/chains";

export const contracts = {
  [bscTestnet.id]: "0x739f1bF01e8a6e0f8F0Ab3953aBe24B815faD0FD",
} as const;

export const factoryAddress = contracts[bscTestnet.id];
