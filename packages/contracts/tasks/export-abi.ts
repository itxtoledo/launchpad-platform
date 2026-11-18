import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import * as fs from "fs";
import * as path from "path";

export default async function (
  taskArguments: any, // Use `any` for taskArguments for broader compatibility
  hre: HardhatRuntimeEnvironment
) {
  const ABI_SOURCE_DIR = path.join(hre.config.paths.artifacts, "contracts");
  const ABI_TARGET_DIR = path.join(hre.config.paths.root, "abi_ts");

  console.log(`Exporting ABIs from: ${ABI_SOURCE_DIR}`);
  console.log(`To: ${ABI_TARGET_DIR}`);

  // Ensure the target directory exists and is clean
  if (fs.existsSync(ABI_TARGET_DIR)) {
    fs.rmSync(ABI_TARGET_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(ABI_TARGET_DIR, { recursive: true });

  const files = fs.readdirSync(ABI_SOURCE_DIR, { recursive: true });

  for (const file of files) {
    if (typeof file === 'string' && file.endsWith(".json")) {
      const filePath = path.join(ABI_SOURCE_DIR, file);
      const fileContent = fs.readFileSync(filePath, "utf8");
      const jsonContent = JSON.parse(fileContent);

      if (jsonContent.abi) {
        const contractName = path.basename(file, ".json").replace(".sol", "");
        const abiVariableName = `${contractName}ABI`;
        const tsContent = `export const ${abiVariableName} = ${JSON.stringify(
          jsonContent.abi,
          null,
          2
        )} as const;\n`;
        const tsFilePath = path.join(ABI_TARGET_DIR, `${contractName}.ts`);
        fs.writeFileSync(tsFilePath, tsContent, "utf8");
        console.log(`Exported ${abiVariableName} to ${tsFilePath}`);
      }
    }
  }
  console.log("ABI export complete.");
}

