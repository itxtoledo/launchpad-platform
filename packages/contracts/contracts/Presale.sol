// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./MintableERC20.sol";

error InvalidEtherSent(uint256 amountSent, uint256 requiredAmount);
error PresaleNotActive();
error PresaleNotStarted();
error PresaleEnded();
error HardCapExceeded(uint256 currentContribution, uint256 maxContribution);
error SoftCapNotReached();
error NoTokensToClaim();
error PresaleStillActive();
error SoftCapAlreadyReached();
error InvalidSoftCapPrice();

error NoContributionToRefund();

contract Presale is OwnableUpgradeable {
    address public factoryAddress;
    MintableERC20 public token;

    uint256 public price;
    uint256 public hardCap;
    uint256 public softCap;
    uint256 public startTime;
    uint256 public endTime;
    uint256 public softCapPrice;

    uint256 public totalContributed;
    bool public softCapReached;

    mapping(address => uint256) public tokenContributions;
    mapping(address => uint256) public ethContributions;

    event NewContribution(address indexed contributor, uint256 amount);
    event EtherWithdrawn(address indexed to, uint256 amount);
    event TokenWithdrawn(address indexed to, uint256 amount);
    event TokensClaimed(address indexed claimer, uint256 amount);
    event EthRefunded(address indexed user, uint256 amount);

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address owner_,
        address token_,
        uint256 price_,
        uint256 hardCap_,
        uint256 softCap_,
        uint256 startTime_,
        uint256 endTime_,
        uint256 softCapPrice_,
        address factoryAddress_
    ) external initializer {
        __Ownable_init(owner_);

        if (softCap_ > 0) {
            if (softCapPrice_ == 0) {
                revert InvalidSoftCapPrice();
            }
            if (softCapPrice_ < price_) {
                revert InvalidSoftCapPrice();
            }
        }

        factoryAddress = factoryAddress_;
        token = MintableERC20(token_);
        price = price_;
        hardCap = hardCap_;
        softCap = softCap_;
        startTime = startTime_;
        endTime = endTime_;
        softCapPrice = softCapPrice_;
    }

    function contribute(uint256 amount) external payable {
        if (block.timestamp < startTime) revert PresaleNotStarted();
        if (endTime != 0 && block.timestamp > endTime) revert PresaleEnded();

        uint256 currentPrice = price;
        if (softCapReached) {
            currentPrice = softCapPrice;
        }

        uint256 total = amount * currentPrice;

        if (total != msg.value) revert InvalidEtherSent(msg.value, total);

        if (totalContributed + msg.value > hardCap)
            revert HardCapExceeded(totalContributed, hardCap);

        totalContributed += msg.value;
        ethContributions[msg.sender] += msg.value;
        tokenContributions[msg.sender] += amount * 10 ** token.decimals();

        if (!softCapReached && totalContributed >= softCap) {
            softCapReached = true;
        }

        emit NewContribution(msg.sender, amount);
    }

    function claimTokens() external {
        if (softCap > 0 && !softCapReached) revert SoftCapNotReached();
        uint256 amountToClaim = tokenContributions[msg.sender];
        if (amountToClaim == 0) revert NoTokensToClaim();

        tokenContributions[msg.sender] = 0;
        token.mint(msg.sender, amountToClaim);

        emit TokensClaimed(msg.sender, amountToClaim);
    }

    function refund() external {
        if (block.timestamp <= endTime) revert PresaleStillActive();
        if (softCapReached) revert SoftCapAlreadyReached();
        uint256 refundAmount = ethContributions[msg.sender];
        if (refundAmount == 0) revert NoContributionToRefund();

        ethContributions[msg.sender] = 0;
        payable(msg.sender).transfer(refundAmount);

        emit EthRefunded(msg.sender, refundAmount);
    }

    function withdrawETH() external onlyOwner {
        if (softCap > 0 && !softCapReached) revert SoftCapNotReached();
        uint256 balance = address(this).balance;
        uint256 fee = balance / 100; // 1% fee
        uint256 amountToOwner = balance - fee;

        // Transfer fee to factory
        payable(factoryAddress).transfer(fee);
        // Transfer remaining amount to owner
        payable(owner()).transfer(amountToOwner);

        emit EtherWithdrawn(owner(), amountToOwner);
    }

    function withdrawToken(address token_) external onlyOwner {
        MintableERC20(token_).transfer(owner(), token.balanceOf(address(this)));

        emit TokenWithdrawn(owner(), token.balanceOf(address(this)));
    }
}
