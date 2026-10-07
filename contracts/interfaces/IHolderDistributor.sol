// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IHolderDistributor {
    function initialize(
        address token,
        address quote,
        address hook,
        address escrow,
        address weth,
        address[] calldata excluded
    ) external;
}
