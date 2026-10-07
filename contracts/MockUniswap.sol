// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./MockWETH.sol";

contract MockUniswapPair is ERC20 {
    address public token0;
    address public token1;

    constructor(address _token0, address _token1) ERC20("Uniswap V2 Pair", "UNI-V2") {
        token0 = _token0;
        token1 = _token1;
    }

    function mint(address to, uint256 amount) external returns (uint256) {
        _mint(to, amount);
        return amount;
    }
}

contract MockUniswapFactory {
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "ZERO_ADDRESS");
        require(getPair[token0][token1] == address(0), "PAIR_EXISTS");

        MockUniswapPair newPair = new MockUniswapPair(token0, token1);
        pair = address(newPair);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);
    }
}

contract MockUniswapRouter {
    address public immutable factory;
    address public immutable WETH;

    constructor(address _factory, address _WETH) {
        factory = _factory;
        WETH = _WETH;
    }

    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint /*amountTokenMin*/,
        uint /*amountETHMin*/,
        address to,
        uint /*deadline*/
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity) {
        address pair = MockUniswapFactory(factory).getPair(token, WETH);
        if (pair == address(0)) {
            pair = MockUniswapFactory(factory).createPair(token, WETH);
        }

        MockWETH(payable(WETH)).deposit{value: msg.value}();

        ERC20(token).transferFrom(msg.sender, pair, amountTokenDesired);
        ERC20(WETH).transfer(pair, msg.value);

        liquidity = MockUniswapPair(pair).mint(to, msg.value);

        return (amountTokenDesired, msg.value, liquidity);
    }
}
