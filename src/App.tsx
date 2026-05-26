import React, { useState } from "react";
import Backstory from "./components/Backstory";
import MainGame from "./components/MainGame";

export default function App() {
  const [gameState, setGameState] = useState<"backstory" | "playing">("backstory");
  const [playerName, setPlayerName] = useState("楚明熙");
  const [eraName, setEraName] = useState("昭武");
  const [initialStats, setInitialStats] = useState<any>(null);

  const handleBackstoryComplete = (name: string, era: string, stats: any) => {
    setPlayerName(name);
    setEraName(era);
    setInitialStats(stats);
    setGameState("playing");
  };

  return (
    <div className="bg-[#0a0a0b] min-h-screen text-[#e0d7cc] selection:bg-amber-950/40 selection:text-amber-100">
      {gameState === "backstory" ? (
        <Backstory onComplete={handleBackstoryComplete} />
      ) : (
        <MainGame initialPlayerName={playerName} initialEraName={eraName} initialStats={initialStats} />
      )}
    </div>
  );
}
