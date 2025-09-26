import { config } from "hardhat";
import fs from "fs";
import path from "path";
import { glob } from "glob";
import { execSync } from "child_process";

async function main() {
  // Obter o chain ID da linha de comando se fornecido
  const desiredChainId = process.argv[2];

  console.log(
    desiredChainId
      ? `Iniciando verificação de contratos para rede ${desiredChainId}...`
      : "Iniciando verificação de contratos em todas as redes disponíveis..."
  );

  // Verificar se a configuração de networks está disponível
  if (!config.networks) {
    throw new Error(
      "Configuração de redes não encontrada no hardhat.config.ts"
    );
  }

  // Encontrar todos os arquivos deployed_addresses.json em todas as pastas de deployment
  const deploymentFiles = glob.sync(
    path.resolve(
      __dirname,
      "../ignition/deployments/chain-*/deployed_addresses.json"
    )
  );

  if (deploymentFiles.length === 0) {
    throw new Error("Nenhum arquivo de deployment encontrado");
  }

  console.log(
    `Encontrados ${deploymentFiles.length} deployments para verificar\n`
  );

  // Filter deployments if a specific chainId is provided
  const filteredDeploymentFiles = desiredChainId
    ? deploymentFiles.filter((file) => file.includes(`chain-${desiredChainId}`))
    : deploymentFiles;

  if (desiredChainId && filteredDeploymentFiles.length === 0) {
    throw new Error(
      `Nenhum deployment encontrado para chainId ${desiredChainId}`
    );
  }

  // Para cada arquivo de deployment, executar a verificação
  for (const deploymentPath of filteredDeploymentFiles) {
    try {
      // Extrair o chain ID do caminho do arquivo
      const chainIdMatch = deploymentPath.match(/chain-(\d+)/);
      if (!chainIdMatch) {
        console.log(
          `Não foi possível extrair o chain ID do caminho: ${deploymentPath}`
        );
        continue;
      }

      const chainId = chainIdMatch[1];

      // Verificar se a rede está configurada no hardhat
      if (!config.networks[chainId]) {
        console.log(
          `⚠️ Configuração de rede não encontrada para ChainID: ${chainId}, pulando...`
        );
        continue;
      }

      console.log(`\n--------------------------------------------------`);
      console.log(`Verificando tokens para chain ID: ${chainId}`);

      // Ler os dados do deployment
      const deploymentData = JSON.parse(
        fs.readFileSync(deploymentPath, "utf8")
      );

      // Encontrar os endereços do StandardERC20 e MintableERC20
      let standardErc20Address = null;
      let mintableErc20Address = null;

      for (const key in deploymentData) {
        if (key.includes("StandardERC20")) {
          standardErc20Address = deploymentData[key];
        }
        if (key.includes("MintableERC20")) {
          mintableErc20Address = deploymentData[key];
        }
      }

      // Verificar se ambos os endereços foram encontrados
      if (!standardErc20Address) {
        console.log(
          `⚠️ StandardERC20 não encontrado para chain ID ${chainId}, pulando...`
        );
        continue;
      }
      if (!mintableErc20Address) {
        console.log(
          `⚠️ MintableERC20 não encontrado para chain ID ${chainId}, pulando...`
        );
        continue;
      }

      console.log(`► StandardERC20: ${standardErc20Address}`);
      console.log(`► MintableERC20: ${mintableErc20Address}`);

      // Verificar os contratos usando o comando direto do hardhat
      console.log(`\nVerificando StandardERC20 na rede ${chainId}...`);
      try {
        execSync(
          `npx hardhat verify --network ${chainId} ${standardErc20Address}`,
          { stdio: "inherit" }
        );
        console.log(
          `✅ StandardERC20 verificado com sucesso na rede ${chainId}`
        );
      } catch (error: any) {
        console.log(`❌ Erro ao verificar StandardERC20: ${error.message}`);
      }

      console.log(`\nVerificando MintableERC20 na rede ${chainId}...`);
      try {
        execSync(
          `npx hardhat verify --network ${chainId} ${mintableErc20Address}`,
          { stdio: "inherit" }
        );
        console.log(
          `✅ MintableERC20 verificado com sucesso na rede ${chainId}`
        );
      } catch (error: any) {
        console.log(`❌ Erro ao verificar MintableERC20: ${error.message}`);
      }
    } catch (error: any) {
      console.error(`Erro ao processar o arquivo ${deploymentPath}:`, error);
    }
  }

  console.log("\n--------------------------------------------------");
  console.log("Processo de verificação concluído para todas as redes!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error("Erro fatal:", error);
  process.exitCode = 1;
});
