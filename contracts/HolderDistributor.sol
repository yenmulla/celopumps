// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./interfaces/IHolderDistributor.sol";

contract HolderDistributor is IHolderDistributor {
    address public token;
    address public quote;
    address public hook;
    address public escrow;
    address public weth;
    bool public initialized;

    function initialize(
        address token_,
        address quote_,
        address hook_,
        address escrow_,
        address weth_,
        address[] calldata /*excluded*/
    ) external override {
        require(!initialized, "Already initialized");
        initialized = true;
        token = token_;
        quote = quote_;
        hook = hook_;
        escrow = escrow_;
        weth = weth_;
    }
}
