import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";

const PresaleFactoryModule = buildModule("PresaleFactoryModule", (m) => {
  const token = m.contract("MintableERC20");
  const presale = m.contract("Presale");

  const presaleFactory = m.contract("PresaleFactory", [
    presale,
    token,
    parseEther("0.001"),
    "0xc4b3272222E7635488cD5524a8fdA01BA7970568",
  ]);

  return { presaleFactory };
});

export default PresaleFactoryModule;
