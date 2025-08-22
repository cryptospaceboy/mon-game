import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers"; // 👈 added
import LeaderboardABI from "../abis/LeaderboardABI.json"; // 👈 added
import "../Game.css";

export default function GameCanvas({ onGameOver }) { // 👈 allow parent to receive final score
  const gameWidth = 420;
  const gameHeight = 500;
  const basketWidth = 90;

  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(4);
  const [apples, setApples] = useState([]);
  const [basketX, setBasketX] = useState(gameWidth / 2);
  const [displayWidth, setDisplayWidth] = useState(gameWidth);

  const [fallSpeed, setFallSpeed] = useState(3);
  const [spawnRate, setSpawnRate] = useState(1500);
  const [elapsedTime, setElapsedTime] = useState(0);

  const gameRef = useRef(null);
  const timerRef = useRef(null);

  const CONTRACT_ADDRESS = "0x72fe344E7097cE94fc0F6955eC080Fa40cc79008"; // 👈 replace with deployed contract

  // ---- NEW: function to submit score on-chain ----
  async function submitScore(finalScore) {
    if (!window.ethereum) {
      console.log("Ethereum wallet not detected, skipping on-chain save.");
      return;
    }
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, LeaderboardABI, signer);

      const tx = await contract.updateScore(finalScore);
      await tx.wait();
      console.log("✅ Score submitted to chain:", finalScore);
    } catch (err) {
      console.error("❌ Error submitting score:", err);
    }
  }

  const startGame = () => {
    setScore(0);
    setLives(4);
    setApples([]);
    setIsRunning(true);
    setIsPaused(false);
    setFallSpeed(3);
    setSpawnRate(1500);
    setElapsedTime(0);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedTime((t) => t + 1);
    }, 1000);
  };

  const togglePause = () => {
    setIsPaused((prev) => !prev);
  };

  // --- Track actual displayed width ---
  useEffect(() => {
    const updateWidth = () => {
      if (gameRef.current) {
        setDisplayWidth(gameRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // --- Controls ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isRunning || isPaused) return;
      const leftKeys = ["ArrowLeft", "a", "A", "j", "J"];
      const rightKeys = ["ArrowRight", "d", "D", "l", "L"];
      const step = displayWidth < 400 ? 15 : 20;

      if (leftKeys.includes(e.key)) {
        setBasketX((x) => Math.max(0, x - step));
      }
      if (rightKeys.includes(e.key)) {
        setBasketX((x) => Math.min(displayWidth - basketWidth, x + step));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRunning, isPaused, displayWidth]);

  const handleTap = (e) => {
    if (!isRunning || isPaused) return;
    const rect = gameRef.current.getBoundingClientRect();
    const tapX = e.touches ? e.touches[0].clientX : e.clientX;
    const newX = tapX - rect.left - basketWidth / 2;
    setBasketX(Math.min(Math.max(newX, 0), displayWidth - basketWidth));
  };

  // Hearts display
  const renderHearts = () => {
    const totalLives = 4;
    const hearts = [];
    for (let i = 0; i < totalLives; i++) {
      hearts.push(i < lives ? "❤️" : "🖤");
    }
    return hearts.join(" ");
  };

  // Spawn apples (safe edges)
  useEffect(() => {
    if (!isRunning || isPaused) return;

    const spawnApple = () => {
      const edgePadding = basketWidth; // 👈 keeps apples away from side walls

      setApples((prev) => [
        ...prev,
        {
          x: Math.random() * (displayWidth - edgePadding * 2) + edgePadding,
          y: 0,
          caught: false,
        },
      ]);
    };

    spawnApple();
    const interval = setInterval(() => {
      spawnApple();
    }, spawnRate);

    return () => clearInterval(interval);
  }, [isRunning, isPaused, displayWidth, spawnRate]);

  // Apple falling + collision
  useEffect(() => {
    if (!isRunning || isPaused) return;

    const fallInterval = setInterval(() => {
      setApples((prev) => {
        const newApples = [];

        prev.forEach((a, i) => {
          const newY = a.y + fallSpeed;

          if (newY >= gameHeight - 60) {
            const caught =
              a.x > basketX - basketWidth / 2 &&
              a.x < basketX + basketWidth / 2;

            if (caught) {
              newApples.push({ ...a, y: newY, caught: true });
              setScore((s) => s + 1);
            } else {
              setLives((l) => {
                const next = l - 1;
                if (next <= 0) {
                  setIsRunning(false);
                  clearInterval(timerRef.current);

                  // --- NEW: trigger game over actions ---
                  submitScore(score); // save on-chain
                  if (onGameOver) onGameOver(score); // bubble up to Dashboard
                  return 0;
                }
                return next;
              });
            }
          } else {
            newApples.push({ ...a, y: newY });
          }
        });

        return newApples;
      });
    }, 50);

    return () => clearInterval(fallInterval);
  }, [isRunning, isPaused, basketX, fallSpeed, score]);

  // Adjust difficulty by elapsed time
  useEffect(() => {
    if (!isRunning || isPaused) return;

    if (elapsedTime < 60) {
      setFallSpeed(3);
      setSpawnRate(1500);
    } else if (elapsedTime < 120) {
      setFallSpeed(5);
      setSpawnRate(1000);
    } else {
      setFallSpeed(7);
      setSpawnRate(700);
    }
  }, [elapsedTime, isRunning, isPaused]);

  return (
    <div className="game-wrapper">
      {/* Pause button ABOVE game box, aligned left */}
      {isRunning && (
        <div className="game-header">
          <button className="pause-btn" onClick={togglePause}>
            {isPaused ? "Resume" : "Pause"}
          </button>
        </div>
      )}

      <div
        className="game-area"
        ref={gameRef}
        onClick={handleTap}
        onTouchStart={handleTap}
        onTouchMove={handleTap}
      >
        {/* HUD */}
        <div className="hud">
          <div className="score">Score: {score}</div>
          <div className="hearts">{renderHearts()}</div>
        </div>

        {/* Overlay */}
        {!isRunning && (
          <div className="overlay">
            {lives <= 0 ? (
              <>
                <h2>Game Over</h2>
                <p>Your Score: {score}</p>
                <button className="start-btn" onClick={startGame}>
                  Restart
                </button>
              </>
            ) : (
              <button className="start-btn" onClick={startGame}>
                Start Game
              </button>
            )}
          </div>
        )}

        {/* Apples */}
        {apples.map((a, i) => (
          <div
            key={i}
            className={`apple ${a.caught ? "pop" : ""}`}
            style={{
              left: a.x,
              top: a.y,
              fontSize: displayWidth < 400 ? "20px" : "24px",
            }}
            onAnimationEnd={() => {
              if (a.caught) {
                setApples((prev) => prev.filter((_, idx) => idx !== i));
              }
            }}
          >
            🍎
          </div>
        ))}

        {/* Basket */}
        {isRunning && (
          <div
            className="basket"
            style={{
              left: Math.min(basketX, displayWidth - basketWidth),
              bottom: 10,
              width: displayWidth < 400 ? "50px" : "60px",
              height: displayWidth < 400 ? "18px" : "20px",
            }}
          ></div>
        )}
      </div>
    </div>
  );
}
