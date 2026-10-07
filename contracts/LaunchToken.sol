// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LaunchToken is ERC20 {
    string public metadataUri;
    address public immutable creator;
    address public immutable hook;
    address public immutable distributor;

    constructor(
        string memory name_,
        string memory symbol_,
        string memory metadataUri_,
        address creator_,
        address hook_,
        address distributor_
    ) ERC20(name_, symbol_) {
        metadataUri = metadataUri_;
        creator = creator_;
        hook = hook_;
        distributor = distributor_;
        _mint(creator_, 200_000_000 * 10**decimals());
        _mint(msg.sender, 800_000_000 * 10**decimals());
    }
}
