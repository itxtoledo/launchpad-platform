# Launchpad Platform

Welcome to the **Launchpad Platform**! 🚀 This is an open-source project designed to provide a comprehensive solution for tokenizing assets on the blockchain. Our platform enables you to create, manage, and trade tokenized assets securely and efficiently. 

## How It Works 🛠️

This project is structured as a monorepo, managed with `pnpm` and `turbo`. It consists of two main parts:

-   **`apps/app`**: This is the frontend application, built with React and Vite. It provides the user interface for interacting with the Launchpad platform, including creating, managing, and trading tokenized assets. It uses `wagmi` for blockchain interaction.
-   **`packages/contracts`**: This package contains the Solidity smart contracts for the Launchpad platform, developed using Hardhat. These contracts define the core logic for asset Launchpad, secure transactions, and automated agreements.

## Running 🚀

To get the project up and running, follow these steps:

1.  **Install Dependencies**:
    Navigate to the project root and install all dependencies using `pnpm`:
    ```bash
    pnpm install
    ```

2.  **Smart Contracts Setup**:
    Navigate to the `packages/contracts` directory:
    ```bash
    cd packages/contracts
    ```
    Compile the smart contracts:
    ```bash
    npx hardhat compile
    ```
    Run tests for the smart contracts (optional, but recommended):
    ```bash
    npx hardhat test
    ```
    Export the ABI of the contracts:
    ```bash
    npx hardhat export-abi
    ```
    Deploy the smart contracts to a development network:
    ```bash
    npx hardhat ignition deploy ignition/modules/PresaleFactory.ts --network <your-network>
    ```
    *Note: You might need to start a local Hardhat network first in a separate terminal: `npx hardhat node` and then use `--network localhost` in the deploy command.*

3.  **Frontend Application Setup**:
    Navigate back to the project root and then into the `apps/app` directory:
    ```bash
    cd ../../apps/app
    ```
    Start the frontend development server:
    ```bash
    pnpm dev
    ```
    The application should now be accessible in your browser, usually at `http://localhost:5173` (as indicated by `vite.config.ts` in a Vite project).

## Features 🌟

- **Asset Launchpad**: Tokenize a variety of assets such as real estate, art, and more.
- **Secure Transactions**: Ensure safe and transparent transactions on the blockchain.
- **User-Friendly Interface**: Easy-to-use interface for both novice and experienced users.
- **Smart Contracts**: Automate and enforce agreements with smart contracts.
- **Open Source**: Completely open-source and customizable to fit your needs.

## Usage 📖

- **Create Tokens**: Define and create your asset-backed tokens.
- **Manage Tokens**: View and manage your tokens in the dashboard.
- **Trade Tokens**: Facilitate the buying and selling of tokens securely.

## Contributing 🤝

We welcome contributions from the community! Here’s how you can help:

1. Fork the repository.
2. Create a new branch.
3. Make your changes.
4. Submit a pull request.

## License 📜

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments 🙏

- Thanks to all the contributors who have helped make this project a success.
- Special thanks to the open-source community for providing tools and resources.

Happy tokenizing! 🎉
