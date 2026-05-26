import React, { useState } from "react";
import Backstory from "./components/Backstory";
import MainGame from "./components/MainGame";

export default function App() {
  const [gameState, setGameState] = useState<"backstory" | "playing">("backstory");
  const [playerName, setPlayerName] = useState("楚明熙");
  const [eraName, setEraName] = useState("昭武");

  const handleBackstoryComplete = (name: string, era: string) => {
    setPlayerName(name);
    setEraName(era);
    setGameState("playing");
  };

  return (
    <div className="bg-neutral-950 min-h-screen text-neutral-100 selection:bg-amber-900/40 selection:text-amber-100">
      {gameState === "backstory" ? (
        <Backstory onComplete={handleBackstoryComplete} />
      ) : (
        <MainGame initialPlayerName={playerName} initialEraName={eraName} />
      )}
    </div>
  );
}
