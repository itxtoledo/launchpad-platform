import { bscTestnet } from "wagmi/chains";

export const contracts = {
  [bscTestnet.id]: "0xc893aFE19dE4008F01a2C7d3c4Fd84cFDb4ea7eD",
} as const;

export const factoryAddress = contracts[bscTestnet.id];
