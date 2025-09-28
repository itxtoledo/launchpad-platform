// SPDX-License-Identifier: MIT

pragma solidity ^0.8.26;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./Presale.sol";
import "./MintableERC20.sol";

import "@openzeppelin/contracts/access/Ownable.sol";

struct PresaleParams {
    string name;
    string symbol;
    uint256 supply;
    uint256 price;
    uint256 hardCap;
    uint256 softCap;
    uint256 startTime;
    uint256 endTime;
    uint256 softCapPrice;
}

error IncorrectPresaleCreationFee(uint256 sent, uint256 required);

contract PresaleFactory is Ownable {
    Presale public immutable presale;
    MintableERC20 public immutable token;

    uint256 public presaleCreationFee;

    address[] public allPresales;
    mapping(address => address[]) private presaleToUsers;

    event PresaleCreated(address indexed presale);

    constructor(address presale_, address token_, uint256 initialFee, address ownerAddress)
        Ownable(ownerAddress)
    {
        presale = Presale(presale_);
        token = MintableERC20(token_);
        presaleCreationFee = initialFee;
    }

    function createPresale(
        PresaleParams calldata params
    ) external payable {
        if (msg.value != presaleCreationFee) revert IncorrectPresaleCreationFee(msg.value, presaleCreationFee);
        payable(address(this)).transfer(msg.value);
        address newToken = Clones.clone(address(token));
        address newPresale = Clones.clone(address(presale));

        MintableERC20(newToken).initialize({ 
            defaultAdmin_: msg.sender,
            minter_: newPresale,
            name_: params.name,
            symbol_: params.symbol,
            initialSupply_: params.supply
        });
        Presale(newPresale).initialize({ 
            owner_: msg.sender,
            token_: newToken,
            price_: params.price,
            hardCap_: params.hardCap,
            softCap_: params.softCap,
            startTime_: params.startTime,
            endTime_: params.endTime,
            softCapPrice_: params.softCapPrice,
            factoryAddress_: address(this)
        });

        allPresales.push(newPresale);

        emit PresaleCreated(newPresale);
        presaleToUsers[msg.sender].push(newToken);
    }

    function getPaginatedPresales(
        uint256 page
    ) external view returns (address[] memory) {
        uint256 totalPresales = allPresales.length;
        uint256 pageSize = 10; // Fixed page size
        if (page == 0) {
            return new address[](0);
        }
        uint256 startIndex = (page - 1) * pageSize;
        if (startIndex >= totalPresales) {
            return new address[](0);
        }
        uint256 endIndex = startIndex + pageSize;
        if (endIndex > totalPresales) {
            endIndex = totalPresales;
        }
        uint256 count = endIndex - startIndex;
        address[] memory result = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = allPresales[startIndex + i];
        }
        return result;
    }

    function getUserCreatedTokens(
        address user
    ) external view returns (address[] memory) {
        return presaleToUsers[user];
    }

    function getPaginatedPresalesDecreasingByCreation(
        uint256 page,
        uint256 pageSize
    ) external view returns (address[] memory) {
        uint256 totalPresales = allPresales.length;
        if (totalPresales == 0 || page == 0) {
            return new address[](0);
        }

        uint256 skip = (page - 1) * pageSize;
        if (skip >= totalPresales) {
            return new address[](0);
        }

        uint256 countToReturn = pageSize;
        if (skip + countToReturn > totalPresales) {
            countToReturn = totalPresales - skip;
        }

        address[] memory result = new address[](countToReturn);
        for (uint256 i = 0; i < countToReturn; i++) {
            result[i] = allPresales[totalPresales - 1 - skip - i];
        }
        return result;
    }

    receive() external payable {}

    function setPresaleCreationFee(uint256 _newFee) external onlyOwner {
        presaleCreationFee = _newFee;
    }

    function getFactoryBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner()).transfer(balance);
    }
}
