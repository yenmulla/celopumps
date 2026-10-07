// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./LaunchpadToken.sol";

interface IUniswapV2Router02 {
    function factory() external view returns (address);
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
}

contract LaunchpadFactory is Ownable, ReentrancyGuard {
    struct TokenInfo {
        address tokenAddress;
        address creator;
        uint256 virtualCeloReserves;
        uint256 virtualTokenReserves;
        uint256 realCeloReserves;
        uint256 realTokenReserves;
        bool isGraduated;
        uint256 creatorTaxBps;
        address creatorFeeWallet;
        bool holderFeeSharing;
        string name;
        string symbol;
        string description;
        string twitter;
        string telegram;
        string imageUrl;
    }

    uint256 public constant FEE_PERCENT_BPS = 50; // 0.5% (in basis points)
    uint256 public immutable GRADUATION_THRESHOLD;
    uint256 public constant CREATION_FEE = 0; // Free to launch!

    // Bonding Curve Constants
    uint256 public immutable INITIAL_VIRTUAL_ASSET;
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1 Billion tokens
    uint256 public constant INITIAL_REAL_TOKEN_RESERVE = 800_000_000 * 10**18; // 80% for bonding curve

    // DEX Router (e.g. Ubeswap Router on Celo)
    address public dexRouter;

    mapping(address => TokenInfo) public tokens;
    address[] public allTokens;

    event TokenCreated(address indexed token, address indexed creator, string name, string symbol, string description, string imageUrl);
    event Trade(address indexed token, address indexed trader, uint256 celoAmount, uint256 tokenAmount, bool isBuy);
    event Graduated(address indexed token, uint256 celoAmount, uint256 tokenAmount);

    constructor(
        uint256 _graduationThreshold,
        uint256 _initialVirtualAsset,
        address _dexRouter
    ) Ownable(msg.sender) {
        GRADUATION_THRESHOLD = _graduationThreshold;
        INITIAL_VIRTUAL_ASSET = _initialVirtualAsset;
        dexRouter = _dexRouter;
    }

    function setDexRouter(address _router) external onlyOwner {
        dexRouter = _router;
    }

    function createToken(
        string memory name,
        string memory symbol,
        string memory description,
        string memory twitter,
        string memory telegram,
        string memory imageUrl,
        uint256 creatorTaxBps,
        address creatorFeeWallet,
        bool holderFeeSharing
    ) external payable nonReentrant returns (address) {
        // Free to launch - no creation fee requirement
        require(creatorTaxBps <= 1000, "Tax too high"); // Max 10%

        LaunchpadToken newToken = new LaunchpadToken(name, symbol, TOTAL_SUPPLY, address(this));

        TokenInfo memory info = TokenInfo({
            tokenAddress: address(newToken),
            creator: msg.sender,
            virtualCeloReserves: INITIAL_VIRTUAL_ASSET,
            virtualTokenReserves: INITIAL_REAL_TOKEN_RESERVE,
            realCeloReserves: 0,
            realTokenReserves: INITIAL_REAL_TOKEN_RESERVE,
            isGraduated: false,
            creatorTaxBps: creatorTaxBps,
            creatorFeeWallet: creatorFeeWallet == address(0) ? msg.sender : creatorFeeWallet,
            holderFeeSharing: holderFeeSharing,
            name: name,
            symbol: symbol,
            description: description,
            twitter: twitter,
            telegram: telegram,
            imageUrl: imageUrl
        });

        tokens[address(newToken)] = info;
        allTokens.push(address(newToken));

        // Send remaining 20% to creator (marketing, team, etc.)
        newToken.transfer(msg.sender, TOTAL_SUPPLY - INITIAL_REAL_TOKEN_RESERVE);

        emit TokenCreated(address(newToken), msg.sender, name, symbol, description, imageUrl);

        // Handle initial buy if user sent extra CELO
        uint256 buyAmount = msg.value - CREATION_FEE;
        if (buyAmount > 0) {
            _buy(address(newToken), buyAmount, msg.sender);
        }

        // Protocol fee for creation
        payable(owner()).transfer(CREATION_FEE);

        return address(newToken);
    }

    function buy(address tokenAddress) external payable nonReentrant {
        _buy(tokenAddress, msg.value, msg.sender);
    }

    function _buy(address tokenAddress, uint256 amount, address buyer) internal {
        TokenInfo storage info = tokens[tokenAddress];
        require(info.tokenAddress != address(0), "Token not found");
        require(!info.isGraduated, "Token already graduated");
        require(amount > 0, "Amount must be > 0");

        uint256 protocolFee = (amount * FEE_PERCENT_BPS) / 10000;
        uint256 creatorTax = (amount * info.creatorTaxBps) / 10000;
        uint256 celoIn = amount - protocolFee - creatorTax;

        uint256 currentK = info.virtualCeloReserves * info.virtualTokenReserves;
        uint256 newVirtualCeloReserves = info.virtualCeloReserves + celoIn;
        uint256 newVirtualTokenReserves = currentK / newVirtualCeloReserves;

        uint256 tokensOut = info.virtualTokenReserves - newVirtualTokenReserves;
        require(tokensOut <= info.realTokenReserves, "Not enough tokens in curve");

        info.virtualCeloReserves = newVirtualCeloReserves;
        info.virtualTokenReserves = newVirtualTokenReserves;
        info.realCeloReserves += celoIn;
        info.realTokenReserves -= tokensOut;

        LaunchpadToken(tokenAddress).transfer(buyer, tokensOut);

        // Fee collection
        payable(owner()).transfer(protocolFee);
        _distributeCreatorTax(tokenAddress, creatorTax);

        emit Trade(tokenAddress, buyer, celoIn, tokensOut, true);

        if (info.realCeloReserves >= GRADUATION_THRESHOLD) {
            _graduate(tokenAddress);
        }
    }

    function sell(address tokenAddress, uint256 tokenAmount) external nonReentrant {
        TokenInfo storage info = tokens[tokenAddress];
        require(info.tokenAddress != address(0), "Token not found");
        require(tokenAmount > 0, "Amount must be > 0");

        LaunchpadToken(tokenAddress).transferFrom(msg.sender, address(this), tokenAmount);

        uint256 currentK = info.virtualCeloReserves * info.virtualTokenReserves;
        uint256 newVirtualTokenReserves = info.virtualTokenReserves + tokenAmount;
        uint256 newVirtualCeloReserves = currentK / newVirtualTokenReserves;

        uint256 celoOut = info.virtualCeloReserves - newVirtualCeloReserves;

        uint256 protocolFee = (celoOut * FEE_PERCENT_BPS) / 10000;
        uint256 creatorTax = (celoOut * info.creatorTaxBps) / 10000;
        uint256 netCeloOut = celoOut - protocolFee - creatorTax;

        require(netCeloOut <= info.realCeloReserves, "Not enough liquidity");

        info.virtualCeloReserves = newVirtualCeloReserves;
        info.virtualTokenReserves = newVirtualTokenReserves;
        info.realCeloReserves -= celoOut;
        info.realTokenReserves += tokenAmount;

        payable(msg.sender).transfer(netCeloOut);
        payable(owner()).transfer(protocolFee);
        _distributeCreatorTax(tokenAddress, creatorTax);

        emit Trade(tokenAddress, msg.sender, celoOut, tokenAmount, false);
    }

    function _distributeCreatorTax(address tokenAddress, uint256 amount) internal {
        if (amount == 0) return;
        TokenInfo storage info = tokens[tokenAddress];

        if (info.holderFeeSharing) {
            uint256 currentK = info.virtualCeloReserves * info.virtualTokenReserves;
            uint256 newVirtualCeloReserves = info.virtualCeloReserves + amount;
            uint256 newVirtualTokenReserves = currentK / newVirtualCeloReserves;
            uint256 tokensToBurn = info.virtualTokenReserves - newVirtualTokenReserves;

            if (tokensToBurn > 0 && tokensToBurn <= info.realTokenReserves) {
                info.virtualCeloReserves = newVirtualCeloReserves;
                info.virtualTokenReserves = newVirtualTokenReserves;
                info.realCeloReserves += amount;
                info.realTokenReserves -= tokensToBurn;
                LaunchpadToken(tokenAddress).transfer(address(0xdead), tokensToBurn);
            } else {
                payable(info.creatorFeeWallet).transfer(amount);
            }
        } else {
            payable(info.creatorFeeWallet).transfer(amount);
        }
    }

    function _graduate(address tokenAddress) internal {
        TokenInfo storage info = tokens[tokenAddress];
        info.isGraduated = true;

        uint256 celoAmount = info.realCeloReserves;
        uint256 tokenAmount = info.realTokenReserves;

        if (celoAmount > 0 && tokenAmount > 0 && dexRouter != address(0)) {
            // Check if router exists on-chain (e.g. Ubeswap on Celo Mainnet / Testnet)
            if (dexRouter.code.length > 0) {
                info.realCeloReserves = 0;
                info.realTokenReserves = 0;

                // Approve router to spend token liquidity
                LaunchpadToken(tokenAddress).approve(dexRouter, tokenAmount);

                // Add liquidity to Ubeswap / DEX router and burn LP tokens for permanent lock
                IUniswapV2Router02(dexRouter).addLiquidityETH{value: celoAmount}(
                    tokenAddress,
                    tokenAmount,
                    0, // Slippage tolerance 0 for fair launch graduation
                    0, // Slippage tolerance 0 for fair launch graduation
                    address(0xdead), // Burn LP tokens for permanent rug-pull protection
                    block.timestamp
                );
            }
        }

        emit Graduated(tokenAddress, celoAmount, tokenAmount);
    }

    function withdrawGraduatedLiquidity(address tokenAddress) external nonReentrant {
        TokenInfo storage info = tokens[tokenAddress];
        require(info.tokenAddress != address(0), "Token not found");
        require(info.isGraduated, "Token not graduated yet");
        require(msg.sender == info.creator || msg.sender == owner(), "Not authorized");

        uint256 celoAmount = info.realCeloReserves;
        uint256 tokenAmount = info.realTokenReserves;

        info.realCeloReserves = 0;
        info.realTokenReserves = 0;

        payable(msg.sender).transfer(celoAmount);
        if (tokenAmount > 0) {
            LaunchpadToken(tokenAddress).transfer(msg.sender, tokenAmount);
        }
    }

    function getTokens() external view returns (address[] memory) {
        return allTokens;
    }
}
