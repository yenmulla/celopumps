// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";
import {FullMath} from "v4-core/src/libraries/FullMath.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {LaunchToken} from "./LaunchToken.sol";
import {LaunchHook} from "./LaunchHook.sol";
import {IHolderDistributor} from "./interfaces/IHolderDistributor.sol";

interface IWETH {
    function deposit() external payable;
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IUniswapV3NFPM {
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }

    function createAndInitializePoolIfNecessary(address token0, address token1, uint24 fee, uint160 sqrtPriceX96) external payable returns (address pool);
    function mint(MintParams calldata params) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);
}

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

interface ILaunchRouter {
    function buyWethPairWithEth(PoolKey calldata key, uint256 minOut, bytes calldata hookData)
        external
        payable
        returns (uint256);

    function buyWithEth(
        PoolKey calldata key,
        address quote,
        uint256 minQuoteOut,
        uint256 minOut,
        bytes calldata hookData
    ) external payable returns (uint256);
}

contract LaunchFactory is Ownable2Step, EIP712 {
    using PoolIdLibrary for PoolKey;
    using SafeERC20 for IERC20;

    error QuoteNotRegistered();
    error CreationFeeUnpaid();
    error LaunchesPaused();
    error PriceExpired();
    error BadPriceSignature();
    error BadPrice();
    error BadFee();
    error HookAlreadySet();
    error ZeroAddress();
    error FeeTransferFailed();
    error RouterNotSet();
    error DevBuyEmpty();

    event QuoteRegistered(address indexed quote, uint8 decimals, string symbol);
    event QuoteDisabled(address indexed quote);
    event CreationFeeSet(uint256 fee);
    event TreasurySet(address treasury);
    event PriceSignerSet(address signer);
    event RouterSet(address router);
    event PausedSet(bool paused);
    event OpeningFdvSet(uint256 fdvUsd);
    event Launched(
        address indexed token,
        address indexed creator,
        address indexed quote,
        PoolId poolId,
        uint160 sqrtPriceX96,
        int24 openingTick,
        uint256 quoteUsdPrice,
        string metadataUri,
        uint24 feePpm,
        address distributor
    );
    event DevBuy(address indexed token, address indexed creator, uint256 ethIn, uint256 tokensOut);
    event Trade(address indexed token, address indexed trader, uint256 quoteAmount, uint256 tokenAmount, bool isBuy);
    event Graduated(address indexed token, uint256 quoteAmount, uint256 tokenAmount);
    event GraduationThresholdSet(uint256 threshold);
    event EmergencyWithdraw(address indexed owner, address indexed to, uint256 amount);
    event EmergencyWithdrawToken(address indexed token, address indexed to, uint256 amount);

    struct QuoteAsset {
        bool enabled;
        uint8 decimals;
        string symbol;
    }

    struct LaunchParams {
        string name;
        string symbol;
        string metadataUri;
        address quote;
        uint256 quoteUsdPrice;
        uint256 priceDeadline;
        bytes priceSignature;
        uint24 feePpm;
        bool feesToHolders;
    }

    struct TokenFeeConfig {
        uint24 feePpm;
        bool feesToHolders;
        address feeRecipient;
        address distributor;
    }

    bytes32 public constant PRICE_TYPEHASH = keccak256("QuotePrice(address quote,uint256 usdPrice,uint256 deadline)");

    uint256 public constant SUPPLY_WHOLE = 1_000_000_000;
    int24 public constant TICK_SPACING = 200;
    uint24 public constant MIN_FEE = 0;
    uint24 public constant MAX_FEE = 100_000;
    address internal constant DEAD = 0x000000000000000000000000000000000000dEaD;

    IPoolManager public immutable poolManager;
    address public immutable weth;
    address public immutable distributorImpl;
    LaunchHook public hook;

    address public treasury;
    address public priceSigner;
    address public router;
    address public uniswapV2Router;
    address public uniswapV3PositionManager;
    uint256 public creationFee;
    uint256 public openingFdvUsd;
    uint256 public graduationThreshold = 2 ether;
    bool public paused;

    mapping(address => QuoteAsset) public quotes;
    mapping(address => uint256) public launchNonce;
    mapping(address => bool) public isGraduated;
    mapping(address => uint256) public realReserves;
    mapping(address => TokenFeeConfig) public tokenFeeConfigs;
    address[] public allLaunches;

    constructor(
        address owner_,
        IPoolManager poolManager_,
        address treasury_,
        address priceSigner_,
        address weth_,
        address distributorImpl_
    ) Ownable(owner_) EIP712("StockpadLaunchFactory", "1") {
        if (
            treasury_ == address(0) || priceSigner_ == address(0) || weth_ == address(0)
                || distributorImpl_ == address(0)
        ) revert ZeroAddress();
        poolManager = poolManager_;
        treasury = treasury_;
        priceSigner = priceSigner_;
        weth = weth_;
        distributorImpl = distributorImpl_;
        creationFee = 0;
        openingFdvUsd = 4_000e18;
    }

    function setHook(LaunchHook hook_) external onlyOwner {
        if (address(hook) != address(0)) revert HookAlreadySet();
        if (address(hook_) == address(0)) revert ZeroAddress();
        hook = hook_;
    }

    function setRouter(address router_) external onlyOwner {
        if (router_ == address(0)) revert ZeroAddress();
        router = router_;
        uniswapV2Router = router_;
        emit RouterSet(router_);
    }

    function setUniswapV2Router(address router_) external onlyOwner {
        if (router_ == address(0)) revert ZeroAddress();
        uniswapV2Router = router_;
        emit RouterSet(router_);
    }

    function setUniswapV3PositionManager(address positionManager_) external onlyOwner {
        if (positionManager_ == address(0)) revert ZeroAddress();
        uniswapV3PositionManager = positionManager_;
    }

    function registerQuote(address quote) external onlyOwner {
        uint8 dec = IERC20Metadata(quote).decimals();
        string memory sym = IERC20Metadata(quote).symbol();
        quotes[quote] = QuoteAsset({enabled: true, decimals: dec, symbol: sym});
        emit QuoteRegistered(quote, dec, sym);
    }

    function disableQuote(address quote) external onlyOwner {
        quotes[quote].enabled = false;
        emit QuoteDisabled(quote);
    }

    function setCreationFee(uint256 fee) external onlyOwner {
        creationFee = fee;
        emit CreationFeeSet(fee);
    }

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert ZeroAddress();
        treasury = treasury_;
        emit TreasurySet(treasury_);
    }

    function setPriceSigner(address signer) external onlyOwner {
        if (signer == address(0)) revert ZeroAddress();
        priceSigner = signer;
        emit PriceSignerSet(signer);
    }

    function setPaused(bool paused_) external onlyOwner {
        paused = paused_;
        emit PausedSet(paused_);
    }

    function setOpeningFdvUsd(uint256 fdvUsd) external onlyOwner {
        if (fdvUsd == 0) revert BadPrice();
        openingFdvUsd = fdvUsd;
        emit OpeningFdvSet(fdvUsd);
    }

    receive() external payable {}

    function setGraduationThreshold(uint256 threshold_) external onlyOwner {
        graduationThreshold = threshold_;
        emit GraduationThresholdSet(threshold_);
    }

    function graduate(address token) public {
        if (isGraduated[token]) revert("Already graduated");
        isGraduated[token] = true;

        uint256 quoteAmount = realReserves[token];
        uint256 tokenAmount = IERC20(token).balanceOf(address(this));

        if (router != address(0) && quoteAmount > 0 && tokenAmount > 0) {
            if (router.code.length > 0) {
                _deployUniswapLiquidity(token, quoteAmount, tokenAmount);
            }
        }

        emit Graduated(token, quoteAmount, tokenAmount);
    }

    function graduateToUniswap(address token) public {
        uint256 quoteAmount = realReserves[token];
        uint256 tokenAmount = IERC20(token).balanceOf(address(this));

        if (router == address(0)) revert RouterNotSet();
        require(quoteAmount > 0 || tokenAmount > 0, "No liquidity to add");

        _deployUniswapLiquidity(token, quoteAmount, tokenAmount);

        isGraduated[token] = true;
        emit Graduated(token, quoteAmount, tokenAmount);
    }

    function _deployUniswapLiquidity(address token, uint256 quoteAmount, uint256 tokenAmount) internal {
        realReserves[token] = 0;

        address v2Router = uniswapV2Router != address(0) ? uniswapV2Router : router;
        if (v2Router != address(0) && v2Router.code.length > 0) {
            IERC20(token).approve(v2Router, tokenAmount);
            try IUniswapV2Router02(v2Router).addLiquidityETH{value: quoteAmount}(
                token,
                tokenAmount,
                0,
                0,
                DEAD,
                block.timestamp
            ) {
                return;
            } catch {}
        }

        address v3Nfpm = uniswapV3PositionManager != address(0) ? uniswapV3PositionManager : router;
        if (v3Nfpm != address(0) && v3Nfpm.code.length > 0) {
            try IWETH(weth).deposit{value: quoteAmount}() {
                IERC20(token).approve(v3Nfpm, tokenAmount);
                IWETH(weth).approve(v3Nfpm, quoteAmount);

                address token0 = token < weth ? token : weth;
                address token1 = token < weth ? weth : token;
                bool isToken0 = token == token0;

                uint160 sqrtPriceX96 = uint160(Math.sqrt(
                    isToken0
                        ? Math.mulDiv(quoteAmount, 1 << 192, tokenAmount)
                        : Math.mulDiv(tokenAmount, 1 << 192, quoteAmount)
                ));

                try IUniswapV3NFPM(v3Nfpm).createAndInitializePoolIfNecessary(token0, token1, 3000, sqrtPriceX96) {} catch {}

                try IUniswapV3NFPM(v3Nfpm).mint(IUniswapV3NFPM.MintParams({
                    token0: token0,
                    token1: token1,
                    fee: 3000,
                    tickLower: -887220,
                    tickUpper: 887220,
                    amount0Desired: isToken0 ? tokenAmount : quoteAmount,
                    amount1Desired: isToken0 ? quoteAmount : tokenAmount,
                    amount0Min: 0,
                    amount1Min: 0,
                    recipient: DEAD,
                    deadline: block.timestamp
                })) {} catch {}
            } catch {}
        }
    }

    function withdrawETH(address payable to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        uint256 balance = address(this).balance;
        uint256 withdrawAmount = (amount > 0 && amount <= balance) ? amount : balance;
        (bool ok,) = to.call{value: withdrawAmount}("");
        if (!ok) revert FeeTransferFailed();
        emit EmergencyWithdraw(msg.sender, to, withdrawAmount);
    }

    function withdrawToken(address token, address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        uint256 balance = IERC20(token).balanceOf(address(this));
        uint256 withdrawAmount = (amount > 0 && amount <= balance) ? amount : balance;
        IERC20(token).safeTransfer(to, withdrawAmount);
        emit EmergencyWithdrawToken(token, to, withdrawAmount);
    }

    function withdrawUngraduatedHoldings(address token, address to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        uint256 tokenBal = IERC20(token).balanceOf(address(this));
        uint256 quoteBal = realReserves[token];
        realReserves[token] = 0;

        if (tokenBal > 0) {
            IERC20(token).safeTransfer(to, tokenBal);
        }
        if (quoteBal > 0) {
            (bool ok,) = to.call{value: quoteBal}("");
            if (!ok) revert FeeTransferFailed();
        }
    }

    function buy(address token) external payable {
        if (msg.value == 0) revert DevBuyEmpty();
        if (isGraduated[token]) revert("Token already graduated");

        TokenFeeConfig memory cfg = tokenFeeConfigs[token];
        uint256 feePpm = cfg.feePpm > 0 ? cfg.feePpm : 10_000;

        uint256 feeAmount = (msg.value * feePpm) / 1_000_000;
        uint256 netEthIn = msg.value - feeAmount;

        realReserves[token] += netEthIn;

        if (feeAmount > 0) {
            address recipient = cfg.feesToHolders && cfg.distributor != address(0) ? cfg.distributor : (cfg.feeRecipient != address(0) ? cfg.feeRecipient : treasury);
            (bool feeOk,) = recipient.call{value: feeAmount}("");
            if (!feeOk) revert FeeTransferFailed();
        }

        uint256 tokensOut = (netEthIn * 640_000_000 * 1e18) / (graduationThreshold > 0 ? graduationThreshold : 0.2 ether);
        uint256 tokenBal = IERC20(token).balanceOf(address(this));

        uint256 uniReserve = 160_000_000 * 1e18;
        uint256 availableForCurve = tokenBal > uniReserve ? tokenBal - uniReserve : 0;
        if (tokensOut > availableForCurve) {
            tokensOut = availableForCurve;
        }

        if (tokensOut > 0) {
            IERC20(token).safeTransfer(msg.sender, tokensOut);
        }

        emit Trade(token, msg.sender, msg.value, tokensOut, true);

        if (realReserves[token] >= graduationThreshold && !isGraduated[token]) {
            graduate(token);
        }
    }

    function sell(address token, uint256 tokenAmount) external {
        if (tokenAmount == 0) revert DevBuyEmpty();
        if (isGraduated[token]) revert("Token already graduated");

        IERC20(token).safeTransferFrom(msg.sender, address(this), tokenAmount);

        TokenFeeConfig memory cfg = tokenFeeConfigs[token];
        uint256 feePpm = cfg.feePpm > 0 ? cfg.feePpm : 10_000;

        uint256 grossEthOut = (tokenAmount * (graduationThreshold > 0 ? graduationThreshold : 0.2 ether)) / (640_000_000 * 1e18);
        if (grossEthOut > realReserves[token]) {
            grossEthOut = realReserves[token];
        }

        uint256 feeAmount = (grossEthOut * feePpm) / 1_000_000;
        uint256 netEthOut = grossEthOut - feeAmount;

        realReserves[token] -= grossEthOut;

        if (feeAmount > 0) {
            address recipient = cfg.feesToHolders && cfg.distributor != address(0) ? cfg.distributor : (cfg.feeRecipient != address(0) ? cfg.feeRecipient : treasury);
            (bool feeOk,) = recipient.call{value: feeAmount}("");
            if (!feeOk) revert FeeTransferFailed();
        }

        if (netEthOut > 0) {
            (bool ok,) = msg.sender.call{value: netEthOut}("");
            if (!ok) revert FeeTransferFailed();
        }

        emit Trade(token, msg.sender, grossEthOut, tokenAmount, false);
    }

    function launchCount() external view returns (uint256) {
        return allLaunches.length;
    }

    function predictDistributor(address creator, uint256 nonce) public view returns (address) {
        bytes32 salt = keccak256(abi.encodePacked(creator, nonce));
        return Clones.predictDeterministicAddress(distributorImpl, salt, address(this));
    }

    function predictToken(address creator, uint256 nonce, LaunchParams calldata p) public view returns (address) {
        bytes32 salt = keccak256(abi.encodePacked(creator, nonce));
        address distributor = p.feesToHolders ? predictDistributor(creator, nonce) : address(0);
        bytes32 initHash = keccak256(
            abi.encodePacked(
                type(LaunchToken).creationCode,
                abi.encode(p.name, p.symbol, p.metadataUri, creator, address(hook), distributor)
            )
        );
        return address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, initHash)))));
    }

    function createLaunch(LaunchParams calldata p)
        external
        payable
        returns (address token, PoolKey memory key, PoolId poolId)
    {
        if (msg.value < creationFee) revert CreationFeeUnpaid();
        (token, key, poolId) = _create(p, 0);

        uint256 refund = msg.value - creationFee;
        if (refund > 0) _send(msg.sender, refund);
    }

    function createLaunchAndBuy(LaunchParams calldata p, uint256 minOut)
        external
        payable
        returns (address token, PoolKey memory key, PoolId poolId)
    {
        if (msg.value < creationFee) revert CreationFeeUnpaid();
        if (router == address(0)) revert RouterNotSet();

        uint256 devBuyValue = msg.value - creationFee;
        if (devBuyValue == 0) revert DevBuyEmpty();

        (token, key, poolId) = _create(p, devBuyValue);

        uint256 tokensOut = p.quote == weth
            ? ILaunchRouter(router).buyWethPairWithEth{value: devBuyValue}(key, minOut, "")
            : ILaunchRouter(router).buyWithEth{value: devBuyValue}(key, p.quote, 0, minOut, "");

        IERC20(token).safeTransfer(msg.sender, tokensOut);
        realReserves[token] += devBuyValue;
        if (realReserves[token] >= graduationThreshold && !isGraduated[token]) {
            graduate(token);
        }
        emit DevBuy(token, msg.sender, devBuyValue, tokensOut);
    }

    function _create(LaunchParams calldata p, uint256 devBuyValue)
        internal
        returns (address token, PoolKey memory key, PoolId poolId)
    {
        if (paused) revert LaunchesPaused();
        QuoteAsset memory qa = quotes[p.quote];
        if (!qa.enabled) revert QuoteNotRegistered();
        if (p.feePpm < MIN_FEE || p.feePpm > MAX_FEE) revert BadFee();
        _verifyPrice(p);

        uint256 nonce = launchNonce[msg.sender]++;
        bytes32 salt = keccak256(abi.encodePacked(msg.sender, nonce));

        address distributor = p.feesToHolders ? Clones.cloneDeterministic(distributorImpl, salt) : address(0);
        token = address(
            new LaunchToken{salt: salt}(p.name, p.symbol, p.metadataUri, msg.sender, address(hook), distributor)
        );
        if (distributor != address(0)) _initDistributor(distributor, token, p.quote);

        tokenFeeConfigs[token] = TokenFeeConfig({
            feePpm: p.feePpm,
            feesToHolders: p.feesToHolders,
            feeRecipient: msg.sender,
            distributor: distributor
        });

        bool quoteIsCurrency0 = p.quote < token;
        (uint160 sqrtPriceX96, int24 openingTick) = _openingPrice(p.quoteUsdPrice, quoteIsCurrency0);

        key = PoolKey({
            currency0: Currency.wrap(quoteIsCurrency0 ? p.quote : token),
            currency1: Currency.wrap(quoteIsCurrency0 ? token : p.quote),
            fee: 0,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(address(hook))
        });

        if (address(hook) != address(0)) {
            hook.openLaunch(
                key,
                LaunchHook.OpenParams({
                    sqrtPriceX96: sqrtPriceX96,
                    openingTick: openingTick,
                    token: token,
                    feeRecipient: distributor != address(0) ? distributor : msg.sender,
                    quote: p.quote,
                    tokenAmount: IERC20(token).totalSupply(),
                    devBuyer: devBuyValue > 0 ? router : address(0),
                    feePpm: p.feePpm,
                    feesToHolders: p.feesToHolders
                })
            );
        }

        poolId = key.toId();
        allLaunches.push(token);

        if (creationFee > 0) _send(treasury, creationFee);

        emit Launched(
            token,
            msg.sender,
            p.quote,
            poolId,
            sqrtPriceX96,
            openingTick,
            p.quoteUsdPrice,
            p.metadataUri,
            p.feePpm,
            distributor
        );
    }

    function _initDistributor(address distributor, address token, address quote) internal {
        address escrow = address(hook.escrow());
        address[] memory excluded = new address[](6);
        excluded[0] = address(poolManager);
        excluded[1] = address(hook);
        excluded[2] = address(this);
        excluded[3] = router;
        excluded[4] = escrow;
        excluded[5] = DEAD;
        IHolderDistributor(distributor).initialize(token, quote, address(hook), escrow, weth, excluded);
    }

    function _send(address to, uint256 amount) internal {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert FeeTransferFailed();
    }

    function _verifyPrice(LaunchParams calldata p) internal view {
        if (p.quoteUsdPrice == 0) revert BadPrice();
        if (block.timestamp > p.priceDeadline) revert PriceExpired();
        if (p.priceSignature.length == 65) {
            bytes32 digest =
                _hashTypedDataV4(keccak256(abi.encode(PRICE_TYPEHASH, p.quote, p.quoteUsdPrice, p.priceDeadline)));
            if (ECDSA.recover(digest, p.priceSignature) != priceSigner) revert BadPriceSignature();
        }
    }

    function _openingPrice(uint256 quoteUsdPrice, bool quoteIsCurrency0)
        internal
        view
        returns (uint160 sqrtPriceX96, int24 openingTick)
    {
        if (quoteUsdPrice == 0 || openingFdvUsd == 0) revert BadPrice();

        uint256 num;
        uint256 den;
        if (quoteIsCurrency0) {
            num = quoteUsdPrice * SUPPLY_WHOLE;
            den = openingFdvUsd;
        } else {
            num = openingFdvUsd;
            den = quoteUsdPrice * SUPPLY_WHOLE;
        }

        uint256 sq = FullMath.mulDiv(num, 1 << 192, den);

        uint256 root = Math.sqrt(sq);
        if (root < TickMath.MIN_SQRT_PRICE || root >= TickMath.MAX_SQRT_PRICE) revert BadPrice();

        int24 rawTick = TickMath.getTickAtSqrtPrice(uint160(root));
        openingTick = _roundTick(rawTick);
        sqrtPriceX96 = TickMath.getSqrtPriceAtTick(openingTick);
    }

    function _roundTick(int24 tick) internal pure returns (int24) {
        int24 compressed = tick / TICK_SPACING;
        if (tick < 0 && tick % TICK_SPACING != 0) compressed--;
        int24 rounded = compressed * TICK_SPACING;
        int24 bound = (TickMath.MAX_TICK / TICK_SPACING) * TICK_SPACING - TICK_SPACING;
        if (rounded > bound) rounded = bound;
        if (rounded < -bound) rounded = -bound;
        return rounded;
    }
}
