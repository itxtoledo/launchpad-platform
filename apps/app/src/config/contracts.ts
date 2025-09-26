import { bscTestnet } from "wagmi/chains";

export const contracts = {
  [bscTestnet.id]: "0x7724bF73CF461979bBa0E553db39a641F6e2A9A3",
} as const;

export const factoryAddress = contracts[bscTestnet.id];
