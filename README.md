# Launchpad 🚀

A decentralized, fair-launch token launchpad powered by bonding curves on **Celo**, **Optimism**, and **Arbitrum**. Launchpad allows anyone to deploy customizable ERC-20 tokens instantly with zero creation fees, built-in creator tax options, and automatic liquidity graduation.

---

## 🌟 Key Features

- **Free Token Launch:** Create and launch tokens with 0 upfront creation fees.
- **Fair Bonding Curve:** Automated market maker (AMM) bonding curve algorithm for instant liquidity, buying, and selling.
- **Custom Creator Revenue:** Set up to 10% creator tax with custom creator fee wallet allocation or automated holder fee-sharing/burn mode.
- **Automatic Graduation:** When real reserve threshold is met (e.g. 2,000 CELO on Celo or 1 ETH on L2s), the token automatically graduates to DEX liquidity.
- **Multi-Chain Ready:** Deployed and configured for Celo, Optimism, and Arbitrum.
- **Modern Web3 Interface:** Built with Next.js 14, Tailwind CSS, Wagmi v2, Viem, and RainbowKit.

---

## 🛠️ Tech Stack

### Smart Contracts
- **Language:** Solidity `^0.8.20`
- **Framework:** Hardhat
- **Libraries:** OpenZeppelin Contracts v5 (`Ownable`, `ReentrancyGuard`, `ERC20`)

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS, Lucide React Icons
- **Web3 Libraries:** Wagmi v2, Viem, RainbowKit, TanStack React Query
- **Language:** TypeScript

---

## 📁 Repository Structure

```
launchpad/
├── contracts/               # Solidity Smart Contracts
│   ├── LaunchpadFactory.sol # Main Factory managing bonding curves & trades
│   └── LaunchpadToken.sol   # ERC-20 Token template minted by Factory
├── scripts/                 # Deployment scripts
│   └── deploy.js            # Hardhat network deployment script
├── test/                    # Contract unit tests
│   └── launchpad.test.js    # Hardhat test suite
├── frontend/                # Next.js 14 Web Application
│   ├── src/
│   │   ├── app/             # Next.js App Router pages (Launch, Trade, Home)
│   │   ├── components/      # UI components (Navbar, Logo, Web3 Providers)
│   │   └── contracts/       # Contract ABIs and addresses mapping
│   ├── package.json
│   └── tailwind.config.js
├── hardhat.config.js        # Hardhat configuration
├── package.json             # Root contract dependencies & scripts
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- `npm` or `yarn`
- MetaMask or any Web3 Wallet

---

### 1. Smart Contract Setup & Deployment

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```env
   PRIVATE_KEY=your_wallet_private_key_here
   ```

3. **Compile contracts:**
   ```bash
   npm run compile
   ```

4. **Run unit tests:**
   ```bash
   npm test
   ```

5. **Deploy to network:**
   ```bash
   # Deploy to Celo Mainnet
   npx hardhat run scripts/deploy.js --network celo

   # Deploy to Optimism Mainnet
   npx hardhat run scripts/deploy.js --network optimism

   # Deploy to Arbitrum One
   npx hardhat run scripts/deploy.js --network arbitrum
   ```

---

### 2. Frontend Application Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create `.env.local` inside `frontend/`:
   ```env
   NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_reown_walletconnect_project_id
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⛓️ Supported Networks & Deployed Contracts

| Network | Chain ID | Factory Contract Address |
| :--- | :--- | :--- |
| **Celo Mainnet** | `42220` | `0x12a20423c79e23827354470f88Ac9E6B3bfffd04` |
| **Celo Alfajores Testnet** | `44787` | `0x12a20423c79e23827354470f88Ac9E6B3bfffd04` |
| **Optimism Mainnet** | `10` | `0xE8D6ddf1118083f4e65Ed62e14E4bFaFA2f57A56` |
| **Arbitrum One** | `42161` | `0xCa9bfeA615149323C333dE60A41aAd5e9F2348F8` |

---

## 📜 Smart Contract Mechanics

### Token Distribution
- **Total Supply:** 1,000,000,000 tokens (1 Billion)
- **Bonding Curve Reserve:** 800,000,000 tokens (80%)
- **Creator Allocation:** 200,000,000 tokens (20%) reserved for creator team/marketing upon token creation.

### Trading Fees
- **Protocol Fee:** 0.5% (50 BPS) collected on buys and sells sent directly to protocol owner.
- **Creator Tax:** Configurable from 0% to 10% (0–1000 BPS), distributed to specified `creatorFeeWallet` or burned if holder fee-sharing is enabled.

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).
