const FACTORY_ADDRESSES: Record<number, string> = {
  1: '0xDe49657Ff4E77E0ee7996518C5c631ee18a36979',        // Ethereum Mainnet Address
  11155111: '0x80c46b8CB4dA625d7a99a78490b304A63A785C2E', // Sepolia Testnet Address
  1337: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',     // Hardhat Local Node Address
  31337: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',    // Hardhat Local Node Address
  42220: '0x4a8C3d5528cADaEdFF94163ab1969B0c48027C05',   // Celo Mainnet Address
  44787: '0x12a20423c79e23827354470f88Ac9E6B3bfffd04',   // Celo Alfajores Testnet
  10: '0xE8D6ddf1118083f4e65Ed62e14E4bFaFA2f57A56',      // Optimism Mainnet Address
  42161: '0xCa9bfeA615149323C333dE60A41aAd5e9F2348F8',   // Arbitrum One Address
};

export const DEFAULT_QUOTE_ADDRESSES: Record<number, string> = {
  1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',        // Ethereum Mainnet WETH
  11155111: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', // Sepolia WETH
  1337: '0x5FbDB2315678afecb367f032d93F642f64180aa3',     // Hardhat Local Mock WETH Address
  31337: '0x5FbDB2315678afecb367f032d93F642f64180aa3',    // Hardhat Local Mock WETH Address
  42220: '0x471EcE3750Da237f93B8E339c536989b8978a438',   // Celo WETH / Native Quote
  44787: '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B',
  10: '0x4200000000000000000000000000000000000006',      // Optimism WETH
  42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',   // Arbitrum WETH
};

export const getLaunchFactoryAddress = (chainId: number | undefined): `0x${string}` => {
  const addr = FACTORY_ADDRESSES[chainId || 1] || FACTORY_ADDRESSES[1];
  return addr as `0x${string}`;
};

export const getLaunchpadFactoryAddress = getLaunchFactoryAddress;

export const getQuoteAddress = (chainId: number | undefined): `0x${string}` => {
  const addr = DEFAULT_QUOTE_ADDRESSES[chainId || 1] || DEFAULT_QUOTE_ADDRESSES[1];
  return addr as `0x${string}`;
};

// Legacy export for fallback compatibility
export const LAUNCHPAD_FACTORY_ADDRESS = '0xE8D6ddf1118083f4e65Ed62e14E4bFaFA2f57A56' as `0x${string}`;

export const LAUNCH_FACTORY_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "owner_", "type": "address" },
      { "internalType": "address", "name": "poolManager_", "type": "address" },
      { "internalType": "address", "name": "treasury_", "type": "address" },
      { "internalType": "address", "name": "priceSigner_", "type": "address" },
      { "internalType": "address", "name": "weth_", "type": "address" },
      { "internalType": "address", "name": "distributorImpl_", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "token", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "creator", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "ethIn", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "tokensOut", "type": "uint256" }
    ],
    "name": "DevBuy",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "token", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "trader", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "quoteAmount", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "tokenAmount", "type": "uint256" },
      { "indexed": false, "internalType": "bool", "name": "isBuy", "type": "bool" }
    ],
    "name": "Trade",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "token", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "creator", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "quote", "type": "address" },
      { "indexed": false, "internalType": "bytes32", "name": "poolId", "type": "bytes32" },
      { "indexed": false, "internalType": "uint160", "name": "sqrtPriceX96", "type": "uint160" },
      { "indexed": false, "internalType": "int24", "name": "openingTick", "type": "int24" },
      { "indexed": false, "internalType": "uint256", "name": "quoteUsdPrice", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "metadataUri", "type": "string" },
      { "indexed": false, "internalType": "uint24", "name": "feePpm", "type": "uint24" },
      { "indexed": false, "internalType": "address", "name": "distributor", "type": "address" }
    ],
    "name": "Launched",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "token", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "quoteAmount", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "tokenAmount", "type": "uint256" }
    ],
    "name": "Graduated",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "name": "allLaunches",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "launchCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "creationFee",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "openingFdvUsd",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paused",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "priceSigner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "router",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "treasury",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "weth",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "quotes",
    "outputs": [
      { "internalType": "bool", "name": "enabled", "type": "bool" },
      { "internalType": "uint8", "name": "decimals", "type": "uint8" },
      { "internalType": "string", "name": "symbol", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "launchNonce",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          { "internalType": "string", "name": "name", "type": "string" },
          { "internalType": "string", "name": "symbol", "type": "string" },
          { "internalType": "string", "name": "metadataUri", "type": "string" },
          { "internalType": "address", "name": "quote", "type": "address" },
          { "internalType": "uint256", "name": "quoteUsdPrice", "type": "uint256" },
          { "internalType": "uint256", "name": "priceDeadline", "type": "uint256" },
          { "internalType": "bytes", "name": "priceSignature", "type": "bytes" },
          { "internalType": "uint24", "name": "feePpm", "type": "uint24" },
          { "internalType": "bool", "name": "feesToHolders", "type": "bool" }
        ],
        "internalType": "struct LaunchFactory.LaunchParams",
        "name": "p",
        "type": "tuple"
      }
    ],
    "name": "createLaunch",
    "outputs": [
      { "internalType": "address", "name": "token", "type": "address" },
      {
        "components": [
          { "internalType": "address", "name": "currency0", "type": "address" },
          { "internalType": "address", "name": "currency1", "type": "address" },
          { "internalType": "uint24", "name": "fee", "type": "uint24" },
          { "internalType": "int24", "name": "tickSpacing", "type": "int24" },
          { "internalType": "address", "name": "hooks", "type": "address" }
        ],
        "internalType": "struct PoolKey",
        "name": "key",
        "type": "tuple"
      },
      { "internalType": "bytes32", "name": "poolId", "type": "bytes32" }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          { "internalType": "string", "name": "name", "type": "string" },
          { "internalType": "string", "name": "symbol", "type": "string" },
          { "internalType": "string", "name": "metadataUri", "type": "string" },
          { "internalType": "address", "name": "quote", "type": "address" },
          { "internalType": "uint256", "name": "quoteUsdPrice", "type": "uint256" },
          { "internalType": "uint256", "name": "priceDeadline", "type": "uint256" },
          { "internalType": "bytes", "name": "priceSignature", "type": "bytes" },
          { "internalType": "uint24", "name": "feePpm", "type": "uint24" },
          { "internalType": "bool", "name": "feesToHolders", "type": "bool" }
        ],
        "internalType": "struct LaunchFactory.LaunchParams",
        "name": "p",
        "type": "tuple"
      },
      { "internalType": "uint256", "name": "minOut", "type": "uint256" }
    ],
    "name": "createLaunchAndBuy",
    "outputs": [
      { "internalType": "address", "name": "token", "type": "address" },
      {
        "components": [
          { "internalType": "address", "name": "currency0", "type": "address" },
          { "internalType": "address", "name": "currency1", "type": "address" },
          { "internalType": "uint24", "name": "fee", "type": "uint24" },
          { "internalType": "int24", "name": "tickSpacing", "type": "int24" },
          { "internalType": "address", "name": "hooks", "type": "address" }
        ],
        "internalType": "struct PoolKey",
        "name": "key",
        "type": "tuple"
      },
      { "internalType": "bytes32", "name": "poolId", "type": "bytes32" }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "creator", "type": "address" },
      { "internalType": "uint256", "name": "nonce", "type": "uint256" },
      {
        "components": [
          { "internalType": "string", "name": "name", "type": "string" },
          { "internalType": "string", "name": "symbol", "type": "string" },
          { "internalType": "string", "name": "metadataUri", "type": "string" },
          { "internalType": "address", "name": "quote", "type": "address" },
          { "internalType": "uint256", "name": "quoteUsdPrice", "type": "uint256" },
          { "internalType": "uint256", "name": "priceDeadline", "type": "uint256" },
          { "internalType": "bytes", "name": "priceSignature", "type": "bytes" },
          { "internalType": "uint24", "name": "feePpm", "type": "uint24" },
          { "internalType": "bool", "name": "feesToHolders", "type": "bool" }
        ],
        "internalType": "struct LaunchFactory.LaunchParams",
        "name": "p",
        "type": "tuple"
      }
    ],
    "name": "predictToken",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "uniswapV2Router",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "uniswapV3PositionManager",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "router_", "type": "address" }],
    "name": "setUniswapV2Router",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "positionManager_", "type": "address" }],
    "name": "setUniswapV3PositionManager",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "graduationThreshold",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "isGraduated",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "realReserves",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "tokenAddress", "type": "address" }],
    "name": "buy",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "tokenAddress", "type": "address" },
      { "internalType": "uint256", "name": "tokenAmount", "type": "uint256" }
    ],
    "name": "sell",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "token", "type": "address" }],
    "name": "graduate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address payable", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "withdrawETH",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "withdrawToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "address", "name": "to", "type": "address" }
    ],
    "name": "withdrawUngraduatedHoldings",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const LAUNCHPAD_FACTORY_ABI = LAUNCH_FACTORY_ABI;

export const LAUNCH_TOKEN_ABI = [
  {
    "inputs": [],
    "name": "name",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "metadataUri",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "creator",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "hook",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "distributor",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "account", "type": "address" }
    ],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "address", "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const LAUNCHPAD_TOKEN_ABI = LAUNCH_TOKEN_ABI;
