import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import LeaderboardABI from "../abis/LeaderboardABI.json";
import "./Leaderboard.css";

const CONTRACT_ADDRESS = "0x72fe344E7097cE94fc0F6955eC080Fa40cc79008"; // replace with your deployed contract

function shortenWallet(address) {
  return address.slice(0, 6) + "..." + address.slice(-4);
}

function getRankDisplay(rank) {
  if (rank === 0) return "🥇 1";
  if (rank === 1) return "🥈 2";
  if (rank === 2) return "🥉 3";
  return rank + 1;
}

export default function Leaderboard() {
  const [topPlayers, setTopPlayers] = useState([]);
  const [topScores, setTopScores] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchLeaderboard() {
    try {
      if (!window.ethereum) return;
      setLoading(true);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, LeaderboardABI, provider);

      const [players, scores] = await contract.getTop10();
      setTopPlayers(players);
      setTopScores(scores.map((s) => Number(s)));
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 10000);
    return () => clearInterval(interval);
  }, []);

  function getRankClass(rank) {
    if (rank === 0) return "gold";
    if (rank === 1) return "silver";
    if (rank === 2) return "bronze";
    return "";
  }

  return (
    <div className="leaderboard">
      <h2>🏆 Top 10 Players</h2>

      {loading ? (
        <div className="spinner"></div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Wallet</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {topPlayers.map((addr, i) => (
              <tr key={addr} className={getRankClass(i)}>
                <td>{getRankDisplay(i)}</td>
                <td>
                  <a
                    href={`https://explorer.monad.xyz/address/${addr}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {shortenWallet(addr)}
                  </a>
                </td>
                <td>{topScores[i]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}