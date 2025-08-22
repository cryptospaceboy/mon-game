import React, { useState, useEffect } from "react";
import Game from "./GameCanvas";
import {
  BrowserProvider,
  Contract,
  parseEther,
} from "ethers"; // ✅ ethers v6
import LeaderboardABI from "../abis/LeaderboardABI.json";
import "../Dashboard.css";

const CONTRACT_ADDRESS = "0x72fe344E7097cE94fc0F6955eC080Fa40cc79008";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [walletAddress, setWalletAddress] = useState(null);
  const [registered, setRegistered] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

  // 🔥 Fetch leaderboard from blockchain
  const fetchLeaderboard = async () => {
    if (!window.ethereum) return;
    try {
      const provider = new BrowserProvider(window.ethereum);
      const contract = new Contract(CONTRACT_ADDRESS, LeaderboardABI, provider);

      const players = await contract.getPlayers();
      let scores = [];
      for (let i = 0; i < players.length; i++) {
        const playerData = await contract.getPlayer(players[i]);
        scores.push({
          address: players[i],
          score: Number(playerData[0]),
          registered: playerData[1],
        });
      }

      scores = scores.sort((a, b) => b.score - a.score).slice(0, 10);
      setLeaderboard(scores);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  // Function to add new score (from GameCanvas)
  const addScore = async (score) => {
    let playerName = walletAddress
      ? walletAddress.slice(0, 6) + "..." + walletAddress.slice(-4)
      : "Guest";

    const newEntry = { name: playerName, score, date: new Date().toLocaleString() };

    const updated = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    setLeaderboard(updated);

    // ✅ Only registered users can push scores on-chain
    if (walletAddress && registered) {
      try {
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new Contract(CONTRACT_ADDRESS, LeaderboardABI, signer);

        const tx = await contract.updateScore(score);
        await tx.wait();
        console.log("Score submitted on-chain:", score);
        fetchLeaderboard();
      } catch (err) {
        console.error("Error submitting score:", err);
      }
    } else if (walletAddress && !registered) {
      console.log("⚠️ Not registered — score not submitted.");
    }
  };

  // ✅ Connect wallet
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("MetaMask (or another wallet) is not installed!");
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const address = accounts[0];
      setWalletAddress(address);

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, LeaderboardABI, signer);

      const player = await contract.getPlayer(address);
      setRegistered(player[1]);

      fetchLeaderboard();
    } catch (err) {
      console.error("Wallet connection failed:", err);
      alert("❌ Wallet connection failed: " + (err.message || err));
    }
  };

  // ✅ One-click register
  const handleRegister = async () => {
    try {
      if (!walletAddress || registered) return;

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, LeaderboardABI, signer);

      const tx = await contract.register({
        value: parseEther("0.1"),
      });
      await tx.wait();

      alert("✅ You are now registered to the Leaderboard!");
      setRegistered(true);
      fetchLeaderboard();
    } catch (err) {
      console.error("Registration failed:", err);
      alert("❌ Registration failed: " + (err.message || err));
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setRegistered(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div>
            {!registered && walletAddress ? (
              <p style={{ color: "red", textAlign: "center" }}>
                ⚠️ You must{" "}
                <span
                  style={{ textDecoration: "underline", cursor: "pointer" }}
                  onClick={handleRegister}
                >
                  register (0.1 MON)
                </span>{" "}
                to save scores to the leaderboard.
              </p>
            ) : null}
            <Game onGameOver={addScore} />
          </div>
        );
    case "leaderboard":
  return (
    <div className="leaderboard">
      <h2>🏆 On-Chain Leaderboard</h2>
      {leaderboard.length > 0 ? (
        <ol>
          {leaderboard.map((player, index) => {
            let medal = "";
            if (index === 0) medal = " 🥇🏅"; // 1st place gets gold + extra ribbon
            else if (index === 1) medal = " 🥈"; // 2nd place gets silver
            else if (index === 2) medal = " 🥉"; // 3rd place gets bronze

            return (
              <li key={index}>
                {player.address.slice(0, 6)}...{player.address.slice(-4)} — {player.score}
                {medal}
              </li>
            );
          })}
        </ol>
      ) : (
        <p>No players yet.</p>
      )}
    </div>
  );
      case "profile":
        return (
          <div className="profile">
            <h2>👤 Player Profile</h2>
            <div className="profile-card">
              <p><strong>Wallet:</strong> {walletAddress || "Not connected"}</p>
              <p><strong>Status:</strong> {registered ? "✅ Registered" : "❌ Not Registered"}</p>
              <p><strong>Highest Score:</strong> {leaderboard.length > 0 ? leaderboard[0].score : 0}</p>
              <p><strong>Games Played:</strong> {leaderboard.length}</p>
            </div>
          </div>
        );
      case "history":
        return (
          <div className="history">
            <h2>📜 Game History</h2>
            {leaderboard.length > 0 ? (
              <ul>
                {leaderboard.map((game, index) => (
                  <li key={index}>
                    {game.address.slice(0, 6)}...{game.address.slice(-4)} scored {game.score}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No games played yet.</p>
            )}
          </div>
        );
      default:
        return <Game onGameOver={addScore} />;
    }
  };

  return (
    <div className="dashboard">
      <nav className="nav-bar">
        <button onClick={() => setActiveTab("dashboard")}>Dashboard</button>
        <button onClick={() => setActiveTab("leaderboard")}>Leaderboard</button>
        <button onClick={() => setActiveTab("profile")}>Profile</button>
        <button onClick={() => setActiveTab("history")}>History</button>
      </nav>

      {/* Wallet Connect/Disconnect Section */}
      <div className="wallet-connect">
        {walletAddress ? (
          <div>
            <p>
              ✅ Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </p>
            <p>
              Status:{" "}
              {registered ? (
                <span style={{ color: "green" }}>✅ Registered</span>
              ) : (
                <span
                  style={{ color: "red", cursor: "pointer", textDecoration: "underline" }}
                  onClick={handleRegister}
                >
                  ❌ Not Registered (Click to Register)
                </span>
              )}
            </p>
            <button onClick={disconnectWallet}>Disconnect</button>
          </div>
        ) : (
          <button onClick={connectWallet}>Connect Wallet</button>
        )}
      </div>

      <div className="content">{renderContent()}</div>
    </div>
  );
};

export default Dashboard;
