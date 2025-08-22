// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Leaderboard {
    address public owner;
    uint256 public registrationFee = 0.1 ether; // 0.1 MON
    uint256 public maxWinners = 5;

    struct Player {
        uint256 highScore;
        bool registered;
    }

    mapping(address => Player) public players;
    address[] public playerAddresses;

    event Registered(address indexed player, uint256 feePaid);
    event ScoreUpdated(address indexed player, uint256 newHighScore);
    event Withdrawn(address indexed owner, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    function register() external payable {
        require(!players[msg.sender].registered, "Already registered");
        require(msg.value == registrationFee, "Fee is 0.1 MON");

        players[msg.sender].registered = true;
        playerAddresses.push(msg.sender);

        emit Registered(msg.sender, msg.value);
    }

    function updateScore(uint256 newScore) external {
        require(players[msg.sender].registered, "Not registered");

        if (newScore > players[msg.sender].highScore) {
            players[msg.sender].highScore = newScore;
            emit ScoreUpdated(msg.sender, newScore);
        }
    }

    function getPlayer(address player) external view returns (uint256 highScore, bool registered) {
        Player memory p = players[player];
        return (p.highScore, p.registered);
    }

    function getPlayers() external view returns (address[] memory) {
        return playerAddresses;
    }

    // ✅ Helper function: check contract balance
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ✅ Owner withdraws prize pool
    function withdraw() external onlyOwner {
        uint256 amount = address(this).balance;
        require(amount > 0, "No balance");
        payable(owner).transfer(amount);

        emit Withdrawn(owner, amount);
    }
}