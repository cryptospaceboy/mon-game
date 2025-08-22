import React, { useState, useEffect } from "react";
import Game from "./GameCanvas";
import {
  BrowserProvider,
  Contract,
  parseEther,
} from "ethers"; 
import LeaderboardABI from "../abis/LeaderboardABI.json";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import "../Dashboard.css";


const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;


const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [walletAddress, setWalletAddress] = useState(null);
  const [registered, setRegistered] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [highScore, setHighScore] = useState(0);


  const { login, logout, authenticated, user, ready } = usePrivy();
  const { wallets } = useWallets(); // ✅ new Privy way


  // Fetch leaderboard
  const fetchLeaderboard = async () => {
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


  // ✅ Get signer from Privy properly
  const getSigner = async () => {
    if (!authenticated || !user) {
      throw new Error("Not logged in with Game ID");
    }


    // Look for Privy embedded wallet first
    const embeddedWallet = wallets.find(w => w.walletClientType === "privy");


    if (embeddedWallet) {
      const provider = new BrowserProvider(await embeddedWallet.getEthereumProvider());
      return await provider.getSigner();
    }


    // fallback to injected wallet (MetaMask)
    if (window.ethereum) {
      const provider = new BrowserProvider(window.ethereum);
      return await provider.getSigner();
    }


    throw new Error("No wallet provider found");
  };


  // Sync registration + high score
  useEffect(() => {
    const checkRegistration = async () => {
      if (authenticated) {
        // pick first wallet (privy or injected)
        const mainWallet = wallets[0] || user?.wallet;
        if (!mainWallet) return;


        setWalletAddress(mainWallet.address);


        try {
          const signer = await getSigner();
          const contract = new Contract(CONTRACT_ADDRESS, LeaderboardABI, signer);
          const player = await contract.getPlayer(mainWallet.address);
          setRegistered(player[1]);
          setHighScore(Number(player[0]));
        } catch (err) {
          console.error("Error checking registration:", err);
        }
      }
    };
    checkRegistration();
  }, [authenticated, user, wallets]);


  // Register
  const handleRegister = async () => {
    try {
      if (!walletAddress || registered) return;


      const signer = await getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, LeaderboardABI, signer);


      const tx = await contract.register({
        value: parseEther("0.1"),
      });
      await tx.wait();


      alert("✅ You are now registered!");
      setRegistered(true);
      fetchLeaderboard();
    } catch (err) {
      console.error("Registration failed:", err);
      alert("❌ Registration failed: " + (err.message || err));
    }
  };


  // Add new score
  const addScore = async (score) => {
    if (!walletAddress) return;


    const playerName = walletAddress.slice(0, 6) + "..." + walletAddress.slice(-4);


    const newEntry = { name: playerName, score, date: new Date().toLocaleString() };
    const updated = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);


    setLeaderboard(updated);


    if (registered) {
      if (score > highScore) {
        try {
          const signer = await getSigner();
          const contract = new Contract(CONTRACT_ADDRESS, LeaderboardABI, signer);


          const tx = await contract.updateScore(score);
          await tx.wait();


          console.log("✅ New high score submitted:", score);
          setHighScore(score);
          fetchLeaderboard();
        } catch (err) {
          console.error("Error submitting score:", err);
        }
      } else {
        console.log("ℹ️ Score not higher than current high score, not submitted on-chain.");
      }
    } else {
      console.log("⚠️ Not registered — score not saved on-chain");
    }
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
                to save scores.
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
                  if (index === 0) medal = " 🥇";
                  else if (index === 1) medal = " 🥈";
                  else if (index === 2) medal = " 🥉";


                  return (
                    <li key={player.address}>
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
              <p><strong>Highest Score:</strong> {highScore}</p>
              <p><strong>Games Played:</strong> {leaderboard.length}</p>
            </div>
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
      </nav>


      {/* 🔥 Login with Game ID only */}
      <div className="wallet-connect">
        {!authenticated ? (
          <button onClick={login}>Login with Monad Games ID</button>
        ) : (
          <div>
            <p>👤 Logged in with Game ID</p>
            <p>
              Wallet: {walletAddress ? walletAddress.slice(0, 6) + "..." + walletAddress.slice(-4) : "—"}
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
            <button onClick={logout}>Logout</button>
          </div>
        )}
      </div>


      <div className="content">{renderContent()}</div>
    </div>
  );
};


export default Dashboard;
