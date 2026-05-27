import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User, Shield, Coins, Heart, Activity, Sparkles, BookOpen, Clock, Gift,
  Bookmark, Award, ChevronRight, MessageSquare, Flame, Check, Baby, AlertCircle,
  Dices, ArrowRight, PenTool, Coffee, Moon, Sparkle
} from "lucide-react";
import { Character, Child, PlayerStats, StoryLog, Memorial } from "../types";
import { INITIAL_CHARACTERS, BITFEN_HIERARCHY, STATIC_MEMORIALS } from "../data";
import {
  getLocalSummonText,
  getLocalChatText,
  getLocalGiftText,
  getLocalPromoteText,
  getLocalBirthText,
  getLocalStoryContinue
} from "../utils/fallbackStory";

interface MainGameProps {
  initialPlayerName: string;
  initialEraName: string;
  initialStats?: PlayerStats | null;
}

export default function MainGame({ initialPlayerName, initialEraName, initialStats }: MainGameProps) {
  // --- Game States ---
  const [player, setPlayer] = useState<PlayerStats>(() => {
    const saved = localStorage.getItem("lanyanhoshui_player");
    if (saved) return JSON.parse(saved);
    return {
      name: initialPlayerName,
      eraName: initialEraName,
      health: initialStats?.health ?? 95,
      treasury: initialStats?.treasury ?? 250000,
      authority: initialStats?.authority ?? 80,
      prestige: initialStats?.prestige ?? 75,
      stability: initialStats?.stability ?? 85,
      year: 1,
      month: 1
    };
  });

  const [characters, setCharacters] = useState<Character[]>(() => {
    const saved = localStorage.getItem("lanyanhoshui_characters");
    if (saved) return JSON.parse(saved);
    return INITIAL_CHARACTERS;
  });

  const [children, setChildren] = useState<Child[]>(() => {
    const saved = localStorage.getItem("lanyanhoshui_children");
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [storyLogs, setStoryLogs] = useState<StoryLog[]>(() => {
    const saved = localStorage.getItem("lanyanhoshui_logs");
    if (saved) return JSON.parse(saved);
    return [
      {
        id: "start",
        title: "御极元年 · 登基大典",
        content: `大晟皇帝【${initialPlayerName}】于太和殿继位登基，改元【${initialEraName}】。南璟云率御前暗卫护驾，萧鹤贤于金銮朝堂肃清政敌。普天同庆，恩赦天下。`,
        type: "system",
        year: 1,
        month: 1
      }
    ];
  });

  const [activeTab, setActiveTab] = useState<"harem" | "court" | "nursery" | "chronicle" | "sandbox">("harem");
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

  // Derive the active character to prevent stale detailed panel update bugs
  const activeChar = selectedCharacter
    ? (characters.find(c => c.id === selectedCharacter.id) || selectedCharacter)
    : null;

  // --- Archive & Save Slots States ---
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [slotsData, setSlotsData] = useState<Record<string, any>>({
    slot_1: localStorage.getItem("lanyanhoshui_save_slot_1") ? JSON.parse(localStorage.getItem("lanyanhoshui_save_slot_1")!) : null,
    slot_2: localStorage.getItem("lanyanhoshui_save_slot_2") ? JSON.parse(localStorage.getItem("lanyanhoshui_save_slot_2")!) : null,
    slot_3: localStorage.getItem("lanyanhoshui_save_slot_3") ? JSON.parse(localStorage.getItem("lanyanhoshui_save_slot_3")!) : null,
  });

  const handleSaveToSlot = (slotKey: string) => {
    const saveData = {
      player,
      characters,
      children,
      storyLogs,
      timestamp: new Date().toLocaleString("zh-CN", { hour12: false })
    };
    localStorage.setItem(`lanyanhoshui_save_${slotKey}`, JSON.stringify(saveData));
    setSlotsData(prev => ({ ...prev, [slotKey]: saveData }));
  };

  const handleLoadFromSlot = (slotKey: string) => {
    const saved = slotsData[slotKey];
    if (!saved) return;
    setPlayer(saved.player);
    setCharacters(saved.characters);
    setChildren(saved.children);
    setStoryLogs(saved.storyLogs);
    setShowArchiveModal(false);
    setSelectedCharacter(null);
    setActionOutput(null);
  };

  const handleResetGame = () => {
    if (window.confirm("陛下当真要‘乾坤重洗’，清空当前大内所有卷册，重新御极历劫么？（存档金册的数据不会被清空）")) {
      localStorage.removeItem("lanyanhoshui_player");
      localStorage.removeItem("lanyanhoshui_characters");
      localStorage.removeItem("lanyanhoshui_children");
      localStorage.removeItem("lanyanhoshui_logs");
      window.location.reload();
    }
  };

  // --- Modal & Action States ---
  const [customInput, setCustomInput] = useState("");
  const [actionOutput, setActionOutput] = useState<{ type: string; title: string; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPromoteDropdown, setShowPromoteDropdown] = useState(false);

  // --- Memorial State (Court tab) ---
  const [memorialIndex, setMemorialIndex] = useState(0);
  const [memorialLogs, setMemorialLogs] = useState<Record<string, string>>({}); // keeps track of chosen results

  // --- Sandbox State (Free AI tab) ---
  const [sandboxPrompt, setSandboxPrompt] = useState("");
  const [sandboxStory, setSandboxStory] = useState<string>("在大晟殿，熏炉散着袅袅轻烟，群臣高唱，诸妃恭候。陛下，请将您的圣裁或游历写于下方天书，微臣当为您撰写起卷……");

  // --- Child Birth Choice Modal ---
  const [pendingBirth, setPendingBirth] = useState<{ consort: Character; id: string } | null>(null);
  const [babyName, setBabyName] = useState("");

  const [pregnancyEventFlag, setPregnancyEventFlag] = useState<string[]>([]); // track who got pregnant notification in logs

  // --- Save states to localStorage ---
  useEffect(() => {
    localStorage.setItem("lanyanhoshui_player", JSON.stringify(player));
  }, [player]);

  useEffect(() => {
    localStorage.setItem("lanyanhoshui_characters", JSON.stringify(characters));
  }, [characters]);

  useEffect(() => {
    localStorage.setItem("lanyanhoshui_children", JSON.stringify(children));
  }, [children]);

  useEffect(() => {
    localStorage.setItem("lanyanhoshui_logs", JSON.stringify(storyLogs));
  }, [storyLogs]);

  // Helper inside loop or state
  const addLog = (title: string, content: string, type: StoryLog["type"]) => {
    const newLog: StoryLog = {
      id: "log_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      title,
      content,
      type,
      year: player.year,
      month: player.month
    };
    setStoryLogs(prev => [newLog, ...prev]);
  };

  // --- Progression: Next Month ---
  const handleNextMonth = () => {
    setActionOutput(null);
    setSelectedCharacter(null);

    // 1. Advance month/year
    let nextMonth = player.month + 1;
    let nextYear = player.year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }

    // 2. Adjust treasury costs, restore health
    const totalCost = characters.length * 1500 + children.length * 2000;
    const nextTreasury = Math.max(0, player.treasury - totalCost + 45000); // 45k monthly tax revenue base
    const nextHealth = Math.min(100, player.health + 2);

    setPlayer(prev => ({
      ...prev,
      month: nextMonth,
      year: nextYear,
      treasury: nextTreasury,
      health: nextHealth
    }));

    // 3. Process Pregnancy changes for each characters
    setCharacters(prevChars => {
      const nextChars = prevChars.map(c => {
        if (c.isPregnant) {
          const nextProg = c.pregnantProgress + 2; // +2 progress per month
          if (nextProg >= 10) {
            // Trigger birth step immediately as pending birth
            setPendingBirth({ consort: c, id: c.id });
            return { ...c, isPregnant: false, pregnantProgress: 0 };
          }
          return { ...c, pregnantProgress: nextProg };
        }
        return c;
      });
      return nextChars;
    });

    // Random status adjustments or random monthly news logs
    const randomSeed = Math.random();
    let monthlyEventText = "";
    if (randomSeed < 0.2) {
      // Imperial stability bump
      monthlyEventText = `有两江官民称颂【${player.eraName}】恩泽宏大，天下儒生多有文章，社稷安稳。`;
      setPlayer(prev => ({ ...prev, stability: Math.min(100, prev.stability + 4), prestige: Math.min(100, prev.prestige + 2) }));
      addLog(`${player.eraName}朝野瑞言`, monthlyEventText, "system");
    } else if (randomSeed < 0.35) {
      // Normal tax news
      monthlyEventText = `内务府呈递账册：本月拨付后宫寝殿及内廷用度合计${totalCost}两。本月太仓进项白银四万五千两。`;
      addLog(`内务府月报录`, monthlyEventText, "system");
    } else {
      monthlyEventText = `新月如钩，御书房太监秉烛侍候，百官皆安，大晟江山静好。`;
      addLog(`太监苏青山月记`, monthlyEventText, "system");
    }
  };

  // --- Character actions invoking server endpoints ---

  // Action: Summon Consort / Grace (翻牌侍寝)
  const handleSummon = async (char: Character) => {
    setIsSubmitting(true);
    setActionOutput(null);

    const dataPayload = {
      character: char,
      actionType: "summon",
      playerInput: customInput,
      playerStats: player
    };

    const randomPregCheck = Math.random() * 100;
    let isNowPregnant = false;
    let updatedHistory = [...char.relationshipHistory];
    let pregMsg = "";

    // Check if character is not already pregnant and fits the fertility percentage
    if (!char.isPregnant && randomPregCheck < char.fertility + 10) {
      isNowPregnant = true;
      pregMsg = `【天降麟喜】御医连夜按脉确诊：${char.name}（${char.bitfen}）承御龙泽已凝结胎元，已被确认为【身怀龙元】！请主上静候龙子诞生。`;
      updatedHistory.push(`【${player.eraName}${player.year}年${player.month}月】：蒙帝宿雨露，喜报结珠孕育龙胎。`);
    } else {
      updatedHistory.push(`【${player.eraName}${player.year}年${player.month}月】：翻牌临幸，极乐侍宿，鱼水交融。`);
    }

    let storyText = "";
    try {
      const res = await fetch("/api/character-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataPayload)
      });
      if (res.ok) {
        const data = await res.json();
        storyText = data.text;
      } else {
        throw new Error("Server response not OK");
      }
    } catch (error) {
      console.warn("Falling back to local character storyteller for Summon...", error);
      storyText = getLocalSummonText(char, customInput, player);
    }

    setCharacters(prev => prev.map(c => {
      if (c.id === char.id) {
        return {
          ...c,
          affection: Math.min(100, c.affection + 12),
          isPregnant: isNowPregnant ? true : c.isPregnant,
          pregnantProgress: isNowPregnant ? 1 : c.pregnantProgress,
          relationshipHistory: updatedHistory
        };
      }
      return c;
    }));

    setActionOutput({
      type: "summon",
      title: `今夜 · 翻牌召幸【${char.name}】`,
      text: storyText + (pregMsg ? `\n\n${pregMsg}` : "")
    });

    addLog(`帝王临幸龙榻`, `帝今夜翻牌【${char.name}】侍宿殿寝。${pregMsg || "鱼水缱绻，君妾恩爱笃深。"}`, "harem");
    setCustomInput("");
    setIsSubmitting(false);
  };

  // Action: Chat with Consort (同游谈天)
  const handleChat = async (char: Character) => {
    setIsSubmitting(true);
    setActionOutput(null);

    const dataPayload = {
      character: char,
      actionType: "chat",
      playerInput: customInput,
      playerStats: player
    };

    let storyText = "";
    try {
      const res = await fetch("/api/character-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataPayload)
      });
      if (res.ok) {
        const data = await res.json();
        storyText = data.text;
      } else {
        throw new Error("Server response not OK");
      }
    } catch (error) {
      console.warn("Falling back to local character storyteller for Chat...", error);
      storyText = getLocalChatText(char, customInput, player);
    }

    setCharacters(prev => prev.map(c => {
      if (c.id === char.id) {
        return {
          ...c,
          affection: Math.min(100, c.affection + 5),
          relationshipHistory: [...c.relationshipHistory, `【${player.eraName}${player.year}年${player.month}月】：偏殿随性谈心闲叙。`]
        };
      }
      return c;
    }));

    setActionOutput({
      type: "chat",
      title: `午后 · 与【${char.name}】并肩微闲聊`,
      text: storyText
    });

    addLog(`偏殿闲叙雅谈`, `皇帝拉御前${char.name}于回廊抚琴漫谈古今。`, "harem");
    setCustomInput("");
    setIsSubmitting(false);
  };

  // Action: Send Gift (厚赐赏礼)
  const handleGift = async (char: Character, giftItem: string) => {
    setIsSubmitting(true);
    setActionOutput(null);

    const giftCost = 8000;
    if (player.treasury < giftCost) {
      alert("大内库银不足！赏赐需要国库耗费 8000 两白银。");
      setIsSubmitting(false);
      return;
    }

    const dataPayload = {
      character: char,
      actionType: "gift",
      playerInput: giftItem,
      playerStats: player
    };

    setPlayer(prev => ({ ...prev, treasury: prev.treasury - giftCost, prestige: Math.min(100, prev.prestige + 1) }));

    let storyText = "";
    try {
      const res = await fetch("/api/character-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataPayload)
      });
      if (res.ok) {
        const data = await res.json();
        storyText = data.text;
      } else {
        throw new Error("Server response not OK");
      }
    } catch (error) {
      console.warn("Falling back to local character storyteller for Gift...", error);
      storyText = getLocalGiftText(char, giftItem);
    }

    setCharacters(prev => prev.map(c => {
      if (c.id === char.id) {
        return {
          ...c,
          affection: Math.min(100, c.affection + 8),
          relationshipHistory: [...c.relationshipHistory, `【${player.eraName}${player.year}年${player.month}月】：赐予奇玩 ${giftItem}。`]
        };
      }
      return c;
    }));

    setActionOutput({
      type: "gift",
      title: `天子赏赐 · 【${char.name}】承恩接旨`,
      text: storyText
    });

    addLog(`御赏重礼入寝`, `赏赐${char.name}：【${giftItem}】，削国库银八千两。`, "harem");
    setIsSubmitting(false);
  };

  // Action: Promote/Demote Rank (册封晋升)
  const handlePromote = async (char: Character, targetBitfen: string) => {
    setIsSubmitting(true);
    setShowPromoteDropdown(false);
    setActionOutput(null);

    const dataPayload = {
      character: char,
      actionType: "promote",
      oldBitfen: char.bitfen,
      newBitfen: targetBitfen,
      playerStats: player
    };

    let storyText = "";
    try {
      const res = await fetch("/api/character-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataPayload)
      });
      if (res.ok) {
        const data = await res.json();
        storyText = data.text;
      } else {
        throw new Error("Server response not OK");
      }
    } catch (e) {
      console.warn("Falling back to local character storyteller for Promote...", e);
      storyText = getLocalPromoteText(char, char.bitfen, targetBitfen);
    }

    setCharacters(prev => prev.map(c => {
      if (c.id === char.id) {
        return {
          ...c,
          bitfen: targetBitfen,
          affection: Math.min(100, c.affection + 15),
          relationshipHistory: [...c.relationshipHistory, `【${player.eraName}${player.year}年${player.month}月】：明诏宣诏册封晋为【${targetBitfen}】。`]
        };
      }
      return c;
    }));

    setActionOutput({
      type: "promote",
      title: `内务府大封明礼 · 【${char.name}】晋封昭明`,
      text: storyText
    });

    addLog(`内廷大封金册`, `钦定${char.name}承印晋封【${targetBitfen}】，朝野共庆。`, "harem");
    setIsSubmitting(false);
  };

  // Action: Complete child birth after naming
  const handleBirthComplete = async () => {
    if (!pendingBirth || !babyName.trim()) {
      alert("请敕赐皇子一个庄重名讳！");
      return;
    }
    setIsSubmitting(true);

    const consort = characters.find(c => c.id === pendingBirth.id) || pendingBirth.consort;

    const dataPayload = {
      character: consort,
      actionType: "pregnant_birth",
      playerStats: player
    };

    let storyText = "";
    try {
      const res = await fetch("/api/character-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataPayload)
      });
      if (res.ok) {
        const data = await res.json();
        storyText = data.text;
      } else {
        throw new Error("Server response not OK");
      }
    } catch (err) {
      console.warn("Falling back to local character storyteller for Birth...", err);
      storyText = getLocalBirthText(consort, player);
    }

    // Create prince object
    const talentsList = ["孔孟之气 · 颖悟绝伦", "将帅豪胆 · 臂力清奇", "百工机巧 · 独具慧心", "王佐英贤 · 温润有容", "天心圣人 · 淡雅内秀"];
    const randomTalent = talentsList[Math.floor(Math.random() * talentsList.length)];

    const newPrince: Child = {
      id: "prince_" + Date.now(),
      name: babyName,
      consortId: consort.id,
      consortName: consort.name,
      age: 1, // Start age at 1 year / month-old representation
      birthMonth: player.month,
      birthYear: player.year,
      talent: randomTalent,
      health: 88 + Math.floor(Math.random() * 12),
      intelligence: 85 + Math.floor(Math.random() * 15)
    };

    setChildren(prev => [...prev, newPrince]);
    setPlayer(prev => ({
      ...prev,
      stability: Math.min(100, prev.stability + 10),
      prestige: Math.min(100, prev.prestige + 8)
    }));

    setActionOutput({
      type: "birth",
      title: `喜获嫡皇子 · 宗人府金册书名`,
      text: `${storyText}\n\n【圣诏敕命】：赐【${consort.name}】之子名讳【${babyName}】，封【大晟皇子】，玉牒注其不世天赋：【${randomTalent}】。`
    });

    addLog(`大晟皇室喜添龙脉`, `喜讯！${consort.name}御榻平安生子诞下皇子，帝赐名【${babyName}】，赏赐六宫。`, "birth");
    setPendingBirth(null);
    setBabyName("");
    setIsSubmitting(false);
  };

  // Action: Visit Child (宗人府看望培养)
  const handleVisitChild = (childId: string) => {
    setChildren(prev => prev.map(child => {
      if (child.id === childId) {
        return {
          ...child,
          age: child.age + 1,
          intelligence: Math.min(100, child.intelligence + 5),
          health: Math.min(100, child.health + 2)
        };
      }
      return child;
    }));
    addLog(`宗人府探望皇子`, `赐御书房课业并亲加考诫皇子【${children.find(c => c.id === childId)?.name}】，子嗣学问大进。`, "system");
  };

  // --- Court Action: Decide static memorials ---
  const handleMemorialDecision = (choiceIndex: number) => {
    const memorial = STATIC_MEMORIALS[memorialIndex];
    const choice = memorial.choices[choiceIndex];

    // apply stats effects safely
    setPlayer(prev => {
      const updated = { ...prev };
      Object.entries(choice.statsChange).forEach(([key, val]) => {
        const value = val as number;
        if (key === "treasury") {
          updated.treasury = Math.max(0, updated.treasury + value);
        } else if (key === "stability") {
          updated.stability = Math.max(0, Math.min(100, updated.stability + value));
        } else if (key === "prestige") {
          updated.prestige = Math.max(0, Math.min(100, updated.prestige + value));
        } else if (key === "authority") {
          updated.authority = Math.max(0, Math.min(100, updated.authority + value));
        }
      });
      return updated;
    });

    // Record decision text
    setMemorialLogs(prev => ({
      ...prev,
      [memorial.id]: choice.resultText
    }));

    addLog(`勤政朝会：${memorial.title}`, `批复抉择：${choice.text}。成果简要：${choice.resultText}`, "court");
  };

  // --- Sandbox Flow: Dynamic AI interaction ---
  const handleSandboxSubmit = async () => {
    if (!sandboxPrompt.trim()) return;
    setIsSubmitting(true);

    let storyText = "";
    try {
      const res = await fetch("/api/story-continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerInput: sandboxPrompt,
          currentContext: {
            treasury: player.treasury,
            authority: player.authority,
            year: player.year,
            month: player.month
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        storyText = data.text;
      } else {
        throw new Error("Server response not OK");
      }
    } catch (e) {
      console.warn("Falling back to local story continuation teller for Sandbox...", e);
      const data = getLocalStoryContinue(sandboxPrompt, {
        treasury: player.treasury,
        authority: player.authority,
        year: player.year,
        month: player.month
      });
      storyText = data.text;

      // Parse selection to update states
      const p = sandboxPrompt.toUpperCase();
      if (p.includes("A") || p.includes("甲")) {
        setPlayer(prev => ({
          ...prev,
          treasury: Math.max(0, prev.treasury - 10000),
          stability: Math.min(100, prev.stability + 5),
          health: Math.min(100, prev.health + 5)
        }));
        storyText = `【天意朱批：皇帝批红「准其甲项奏议」】\n\n` + storyText;
        addLog("天书圣言批示", "陛下天意朱墨判下【甲】，大晟江山温润福泽，国本安稳。", "system");
      } else if (p.includes("B") || p.includes("乙")) {
        setPlayer(prev => ({
          ...prev,
          treasury: Math.max(0, prev.treasury - 30000),
          prestige: Math.min(100, prev.prestige + 15),
          authority: Math.min(100, prev.authority + 10)
        }));
        storyText = `【天意朱批：皇帝批红「准其乙项奏议」】\n\n` + storyText;
        addLog("天书圣言批示", "陛下天意金字判下【乙】，厚赐赏礼，群臣并谢皇尊隆德。", "system");
      } else if (p.includes("C") || p.includes("丙")) {
        setPlayer(prev => ({
          ...prev,
          stability: Math.min(100, prev.stability + 10),
          prestige: Math.min(100, prev.prestige + 5),
          treasury: Math.min(500000, prev.treasury + 20000)
        }));
        storyText = `【天意朱批：皇帝批红「准其丙项奏议」】\n\n` + storyText;
        addLog("天书圣言批示", "陛下天意判下【丙】，大晟朝风气一新，国库充裕社稷升稳。", "system");
      }
    }

    setSandboxStory(storyText);
    setSandboxPrompt("");
    setIsSubmitting(false);
  };

  // Helper inside loop: find bitfen rank position
  const getBitfenBadgeStyle = (bitfen: string) => {
    if (bitfen === "君后") return "bg-[#c4a052]/20 text-[#c4a052] border-[#c4a052]/50";
    if (bitfen === "正君" || bitfen === "贵君") return "bg-[#5c1a1a]/30 text-[#e0d7cc] border-[#c4a052]/40 animate-pulse";
    if (bitfen === "卿" || bitfen === "贵人") return "bg-black/60 text-[#e0d7cc]/90 border-[#c4a052]/20";
    return "bg-black/30 text-[#e0d7cc]/50 border-neutral-800/80";
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#e0d7cc] font-serif relative flex flex-col pb-16 overflow-x-hidden">
      {/* Immersive Theme radial gradient overlays */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 50% 30%, #5c1a1a 0%, transparent 70%), radial-gradient(circle at 80% 80%, #c4a052 0%, transparent 50%)" }} />

      {/* Top Banner Status Info */}
      <header className="sticky top-0 z-40 bg-black/60 backdrop-blur-md border-b border-[#c4a052]/30 shadow-2xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-4 z-10 relative">
          
          {/* Imperial Identity Panel */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#5c1a1a] to-black border border-[#c4a052]/40 flex items-center justify-center text-lg shadow-lg">
              👑
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-bold tracking-[0.1em] text-[#c4a052]">蓝颜祸水</h1>
                <div className="h-4 w-px bg-[#c4a052]/30"></div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-medium text-[#e0d7cc]">{player.name}</h2>
                  <span className="text-[9px] uppercase font-mono tracking-widest bg-[#5c1a1a] border border-[#c4a052]/30 px-1.5 py-0.5 rounded-sm text-[#c4a052]">
                    天子
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#e0d7cc]/60 mt-0.5 flex items-center gap-1.5 font-sans">
                <Clock className="w-3.5 h-3.5 text-[#c4a052]" />
                年号：<span className="text-[#c4a052] font-semibold">{player.eraName} {player.year} 年</span> · {player.month} 月
              </p>
            </div>
          </div>

          {/* Core Numerical Attributes Panel */}
          <div className="flex flex-wrap items-center justify-center lg:justify-end gap-3 max-w-full font-sans">
            <div className="bg-black/60 border border-[#c4a052]/20 px-4 py-2 rounded-sm flex items-center gap-2.5 text-xs">
              <Coins className="w-4 h-4 text-[#c4a052]" />
              <div>
                <p className="text-[10px] text-[#c4a052]/60 uppercase tracking-widest">大晟国库储备</p>
                <p className="text-[#e0d7cc] font-serif font-semibold">{player.treasury.toLocaleString()} 两</p>
              </div>
            </div>

            <div className="bg-black/60 border border-[#c4a052]/20 px-4 py-2 rounded-sm flex items-center gap-2.5 text-xs">
              <Heart className="w-4 h-4 text-red-500" />
              <div>
                <p className="text-[10px] text-[#c4a052]/60 uppercase tracking-widest">龙体圣躬安康</p>
                <p className="text-[#e0d7cc] font-serif font-semibold">{player.health}/100</p>
              </div>
            </div>

            <div className="bg-black/60 border border-[#c4a052]/20 px-4 py-2 rounded-sm flex items-center gap-2.5 text-xs">
              <Shield className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-[10px] text-[#c4a052]/60 uppercase tracking-widest">帝王权威震慑</p>
                <p className="text-[#e0d7cc] font-serif font-semibold">{player.authority}/100</p>
              </div>
            </div>

            <div className="bg-black/60 border border-[#c4a052]/20 px-4 py-2 rounded-sm flex items-center gap-2.5 text-xs">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <div>
                <p className="text-[10px] text-[#c4a052]/60 uppercase tracking-widest">江山社稷安稳</p>
                <p className="text-[#e0d7cc] font-serif font-semibold">{player.stability}/100</p>
              </div>
            </div>

            {/* Download/Upload archive trigger */}
            <button
              onClick={() => setShowArchiveModal(true)}
              className="py-2 px-4 bg-black border border-[#c4a052]/45 text-[#c4a052] hover:text-[#e0d7cc] text-xs tracking-widest uppercase font-bold transition duration-200 rounded-sm shadow-md flex items-center gap-1.5 cursor-pointer hover:bg-[#c4a052]/15"
            >
              <Bookmark className="w-3.5 h-3.5 text-[#c4a052]" />
              金史秘宗
            </button>

            {/* Down to next month trigger */}
            <button
              id="progress-next-month-button"
              onClick={handleNextMonth}
              className="py-2 px-5 bg-[#c4a052] text-black text-xs tracking-widest uppercase font-bold hover:bg-[#d4b062] transition duration-200 rounded-sm shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Moon className="w-3.5 h-3.5 text-black" />
              下个月
            </button>
          </div>
        </div>
      </header>

      {/* Primary Subsections Selector tabs */}
      <div className="max-w-7xl mx-auto w-full px-6 mt-6 z-10 relative">
        <div className="flex border-b border-[#c4a052]/20 overflow-x-auto gap-2 scrollbar-none">
          <button
            onClick={() => { setActiveTab("harem"); setSelectedCharacter(null); setActionOutput(null); }}
            className={`py-3.5 px-5 text-xs text-nowrap md:text-sm tracking-widest font-serif font-bold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "harem" ? "border-[#c4a052] text-[#c4a052] bg-[#c4a052]/10" : "border-transparent text-[#e0d7cc]/60 hover:text-[#e0d7cc] hover:bg-[#c4a052]/5"
            }`}
          >
            <Bookmark className="w-4 h-4" />
            后宫金卷 (八男侍寝)
          </button>

          <button
            onClick={() => { setActiveTab("court"); setActionOutput(null); }}
            className={`py-3.5 px-5 text-xs text-nowrap md:text-sm tracking-widest font-serif font-bold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "court" ? "border-[#c4a052] text-[#c4a052] bg-[#c4a052]/10" : "border-transparent text-[#e0d7cc]/60 hover:text-[#e0d7cc] hover:bg-[#c4a052]/5"
            }`}
          >
            <Shield className="w-4 h-4" />
            勤政明堂 (奏折御断)
          </button>

          <button
            onClick={() => { setActiveTab("nursery"); setActionOutput(null); }}
            className={`py-3.5 px-5 text-xs text-nowrap md:text-sm tracking-widest font-serif font-bold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "nursery" ? "border-[#c4a052] text-[#c4a052] bg-[#c4a052]/10" : "border-transparent text-[#e0d7cc]/60 hover:text-[#e0d7cc] hover:bg-[#c4a052]/5"
            }`}
          >
            <Baby className="w-4 h-4" />
            诞育皇子 ({children.length})
          </button>

          <button
            onClick={() => { setActiveTab("chronicle"); setActionOutput(null); }}
            className={`py-3.5 px-5 text-xs text-nowrap md:text-sm tracking-widest font-serif font-bold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "chronicle" ? "border-[#c4a052] text-[#c4a052] bg-[#c4a052]/10" : "border-transparent text-[#e0d7cc]/60 hover:text-[#e0d7cc] hover:bg-[#c4a052]/5"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            大晟起居注
          </button>

          <button
            onClick={() => { setActiveTab("sandbox"); setActionOutput(null); }}
            className={`py-3.5 px-5 text-xs text-nowrap md:text-sm tracking-widest font-serif font-bold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "sandbox" ? "border-[#c4a052] text-[#c4a052] bg-[#c4a052]/10" : "border-transparent text-[#e0d7cc]/60 hover:text-[#e0d7cc] hover:bg-[#c4a052]/5"
            }`}
          >
            <PenTool className="w-4 h-4" />
            天书写意
          </button>
        </div>
      </div>

      {/* Principal Container Page Body */}
      <main className="max-w-7xl mx-auto w-full px-6 mt-8 flex-1 z-10 relative">
        {activeTab === "harem" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left side checklist of all consorts */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-[#c4a052]/30">
                <h3 className="text-base text-[#c4a052] flex items-center gap-1.5 font-serif tracking-widest font-bold">
                  <Flame className="w-4 h-4 text-[#c4a052]" />
                  大晟后宫图谱 · 图鉴八嫔
                </h3>
                <span className="text-[10px] text-[#e0d7cc]/50 tracking-widest uppercase">BLOSSOMS OF THE EMPIRE</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {characters.map(char => (
                  <div
                    key={char.id}
                    onClick={() => { setSelectedCharacter(char); setActionOutput(null); }}
                    className={`p-5 bg-black/60 border rounded-sm hover:border-[#c4a052]/60 transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden group ${
                      selectedCharacter?.id === char.id ? "border-[#c4a052] bg-gradient-to-br from-[#5c1a1a]/20 to-black/60 shadow-lg" : "border-[#c4a052]/20 hover:bg-black/80"
                    }`}
                  >
                    {/* Tiny pregnancy indicator */}
                    {char.isPregnant && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 py-0.5 px-2 bg-[#5c1a1a] border border-[#c4a052]/40 text-[9px] text-[#c4a052] rounded-sm font-sans tracking-wider animate-pulse font-bold">
                        🤰 孕胎({char.pregnantProgress * 10}%)
                      </div>
                    )}

                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-serif text-base text-[#e0d7cc] group-hover:text-[#c4a052] transition-colors flex items-center gap-2">
                            {char.name}
                            <span className={`text-[9px] font-sans px-2 border rounded-sm py-0.5 tracking-widest ${getBitfenBadgeStyle(char.bitfen)}`}>
                              {char.bitfen}
                            </span>
                          </h4>
                          <span className="text-[10px] text-[#e0d7cc]/40 italic mt-1 block tracking-wider">[原位: {char.originalBitfen}]</span>
                        </div>
                      </div>

                      <p className="text-xs text-[#e0d7cc]/70 line-clamp-2 leading-relaxed mb-3 font-serif">
                        {char.intro}
                      </p>
                    </div>

                    <div className="border-t border-[#c4a052]/20 pt-3 flex justify-between items-center text-[11px] text-[#e0d7cc]/60 font-sans tracking-wide">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500/20" />
                        情愫: <strong className="text-[#c4a052] font-semibold">{char.affection}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-green-500" />
                        圣体: <strong className="text-[#e0d7cc]">{char.health}%</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-purple-400" />
                        育力: <strong className="text-[#e0d7cc]">{char.fertility}%</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right side individual panel control */}
            <div className="lg:col-span-1">
              {activeChar ? (
                <div className="bg-black/80 border border-[#c4a052]/30 rounded-sm p-6 sticky top-28 shadow-2xl space-y-5 shadow-[#5c1a1a]/5">
                  {/* Detailed summary info card */}
                  <div className="text-center pb-4 border-b border-[#c4a052]/20">
                    <span className="text-[10px] text-[#c4a052] font-mono uppercase tracking-[0.2em]">{activeChar.bitfen} · 金画卷册</span>
                    <h3 className="text-xl font-serif text-[#e0d7cc] tracking-widest flex items-center justify-center gap-2 mt-2 font-semibold">
                      {activeChar.name}
                    </h3>
                    <p className="text-xs text-[#e0d7cc]/60 italic mt-2 px-3 leading-relaxed">
                      “{activeChar.personality}”
                    </p>
                  </div>

                  {/* Character stats bar checklist */}
                  <div className="space-y-4 text-xs font-serif">
                    <div>
                      <div className="flex justify-between text-[#e0d7cc]/80 mb-1 tracking-wide">
                        <span>君印好感 (情深如斯)</span>
                        <span className="text-[#c4a052] font-semibold">{activeChar.affection}/100</span>
                      </div>
                      <div className="w-full bg-[#0a0a0b] h-1.5 rounded-full overflow-hidden border border-[#c4a052]/20">
                        <div className="bg-gradient-to-r from-[#5c1a1a] to-[#c4a052] h-full transition-all duration-300" style={{ width: `${activeChar.affection}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[#e0d7cc]/80 mb-1 tracking-wide">
                        <span>龙裔蕴育 (身段受盈)</span>
                        <span className="text-green-400 font-semibold">{activeChar.health}/100</span>
                      </div>
                      <div className="w-full bg-[#0a0a0b] h-1.5 rounded-full overflow-hidden border border-[#c4a052]/20">
                        <div className="bg-emerald-600 h-full transition-all duration-300" style={{ width: `${activeChar.health}%` }} />
                      </div>
                    </div>

                    <div className="p-4 bg-black/40 rounded-sm border border-[#c4a052]/10 space-y-1.5">
                      <p className="text-[11px] text-[#c4a052] font-mono tracking-widest font-semibold">世家背景记略：</p>
                      <p className="text-[11px] text-[#e0d7cc]/80 leading-relaxed text-justify indent-4">
                        {activeChar.background}
                      </p>
                    </div>

                    {activeChar.isPregnant && (
                      <div className="p-3 bg-[#5c1a1a]/10 rounded-sm border border-[#c4a052]/20 text-xs text-[#c4a052]/90 flex items-start gap-2 animate-pulse">
                        <AlertCircle className="w-4 h-4 text-[#c4a052] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-[11px] text-[#e0d7cc]">男儿身御胎怀喜中</p>
                          <p className="text-[10px] leading-relaxed text-[#e0d7cc]/70 mt-1">
                            已历胎熟期 ({activeChar.pregnantProgress * 10}%)。每一月乾坤更替，胎元渐长。达到 100% 时，将传诏诞下大晟尊贵皇嗣。
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Interacting Panel */}
                  <div className="space-y-3 pt-3">
                    <span className="block text-[10px] text-[#c4a052] uppercase tracking-[0.15em] font-serif font-bold">圣意奉旨行动 (翻御牌 · 话桑麻 · 赏晋位)</span>
                    
                    {/* Message detail input if desired */}
                    <textarea
                      rows={2}
                      maxLength={100}
                      className="w-full bg-black/60 border border-[#c4a052]/30 text-[#e0d7cc] p-3 text-xs rounded-sm focus:outline-none focus:border-[#c4a052] transition placeholder-zinc-650 font-serif leading-relaxed"
                      placeholder="陛下今夜临御，要对他交代甚么床榻温存言辞？（选填，100字内）"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleSummon(activeChar)}
                        disabled={isSubmitting}
                        className="py-2.5 px-3 bg-[#5c1a1a] text-[#c4a052] text-xs tracking-widest font-bold uppercase hover:bg-red-955 hover:text-[#e0d7cc] transition duration-200 disabled:opacity-40 rounded-sm cursor-pointer border border-[#c4a052]/30 text-center"
                      >
                        翻牌侍寝
                      </button>

                      <button
                        onClick={() => handleChat(activeChar)}
                        disabled={isSubmitting}
                        className="py-2.5 px-3 bg-black/60 hover:bg-[#c4a052]/10 border border-[#c4a052]/30 text-[#e0d7cc] text-xs tracking-widest uppercase rounded-sm transition duration-200 disabled:opacity-40 cursor-pointer text-center"
                      >
                        传召闲聊
                      </button>
                    </div>

                    {/* Other auxiliary actions: Promote and Gift */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <button
                          onClick={() => setShowPromoteDropdown(!showPromoteDropdown)}
                          disabled={isSubmitting}
                          className="w-full py-2.5 px-3 bg-black/60 hover:bg-[#c4a052]/10 border border-[#c4a052]/30 text-[#e0d7cc] text-xs tracking-widest uppercase rounded-sm transition duration-200 flex items-center justify-between gap-1 disabled:opacity-40 cursor-pointer"
                        >
                          <span>册封金册</span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#c4a052] transform rotate-90" />
                        </button>
                        
                        {showPromoteDropdown && (
                          <div className="absolute bottom-11 left-0 w-full bg-black border border-[#c4a052]/30 rounded-sm shadow-2xl z-50 text-[11px] max-h-48 overflow-y-auto custom-scrollbar font-serif">
                            {BITFEN_HIERARCHY.map(rank => (
                              <button
                                key={rank}
                                onClick={() => handlePromote(activeChar, rank)}
                                className="w-full text-left px-4 py-2 bg-black text-[#e0d7cc] hover:bg-[#c4a052]/20 hover:text-[#c4a052] border-b border-[#c4a052]/10 transition"
                              >
                                册封【{rank}】
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Gift actions */}
                      <button
                        onClick={() => handleGift(activeChar, "上等长白山老山参及蜀锦")}
                        disabled={isSubmitting}
                        className="py-2.5 px-3 bg-black/60 hover:bg-[#c4a052]/10 border border-[#c4a052]/30 text-[#e0d7cc] text-xs tracking-widest uppercase rounded-sm transition duration-200 flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                      >
                        <Gift className="w-3.5 h-3.5 text-[#c4a052]" />
                        赏赐参宝
                      </button>
                    </div>
                  </div>

                  {/* Relation history log checklist */}
                  <div className="pt-3 border-t border-[#c4a052]/20">
                    <span className="block text-[10px] text-[#c4a052] tracking-widest font-serif font-bold mb-1.5">君臣情爱恩宠录：</span>
                    <ul className="space-y-1.5 text-[10px] text-[#e0d7cc]/50 max-h-24 overflow-y-auto pr-1">
                      {activeChar.relationshipHistory.slice().reverse().map((hist, i) => (
                        <li key={i} className="leading-relaxed border-l border-[#c4a052]/30 pl-2 hover:text-[#e0d7cc] transition-colors font-serif">
                          {hist}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="bg-black/80 border border-[#c4a052]/30 rounded-sm p-8 text-center space-y-4 sticky top-28 shadow-xl">
                  <Coffee className="w-8 h-8 text-[#c4a052] mx-auto animate-pulse" />
                  <div>
                    <h4 className="text-sm text-[#c4a052] font-serif tracking-widest font-bold">御驾听政阁</h4>
                    <p className="text-xs text-[#e0d7cc]/70 mt-2 leading-relaxed font-serif text-justify">
                      请陛下点击左壁【图鉴八嫔】中任意一位美男妃子，展读册页，在此钦赐临御、赏赏重礼、明宣册封位分等大权乾坤。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Memorials and Court Crisis */}
        {activeTab === "court" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center pb-3 border-b border-[#c4a052]/20">
              <span className="text-[#c4a052] text-xs font-mono tracking-[0.25em] uppercase">紫禁太和殿 · 勤政批章</span>
              <h3 className="text-lg text-[#e0d7cc] mt-2 font-serif tracking-widest font-bold">天子御笔 朱批山河</h3>
              <p className="text-xs text-[#e0d7cc]/60 mt-2 font-serif">
                凡折皆系社稷，御断将折国库或调升权威，望陛下谨言圣裁。
              </p>
            </div>
 
            {/* Memorial content card */}
            <div className="bg-black/80 border border-[#c4a052]/25 p-6 md:p-8 rounded-sm shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle_at_top_right,rgba(196,160,82,0.06)_0%,transparent_70%)] pointer-events-none" />
              
              <div className="flex justify-between items-center mb-4 font-sans">
                <span className="text-[10px] font-mono bg-black border border-[#c4a052]/30 text-[#c4a052] px-2.5 py-1 rounded-sm">
                  奏章第 0{memorialIndex + 1} 卷
                </span>
                <span className="text-xs text-[#c4a052] font-semibold tracking-widest uppercase">
                  {STATIC_MEMORIALS[memorialIndex].title}
                </span>
              </div>
 
              <div className="bg-black/60 p-5 rounded-sm border border-[#c4a052]/10 text-[#e0d7cc]/90 text-xs md:text-sm leading-loose indent-8 font-serif whitespace-pre-line text-justify">
                {STATIC_MEMORIALS[memorialIndex].content}
              </div>
 
              {/* Show decision result if already chosen, else options */}
              {memorialLogs[STATIC_MEMORIALS[memorialIndex].id] ? (
                <div className="mt-6 p-4 bg-[#5c1a1a]/10 border border-[#c4a052]/25 rounded-sm text-xs text-[#e0d7cc]/90 leading-relaxed space-y-4">
                  <p className="font-semibold text-[#c4a052] font-serif tracking-wider">★ 天子御批印宝：</p>
                  <p className="font-serif text-[#e0d7cc]">{memorialLogs[STATIC_MEMORIALS[memorialIndex].id]}</p>
                  
                  <div className="pt-2 font-sans">
                    <button
                      onClick={() => setMemorialIndex((prev) => (prev + 1) % STATIC_MEMORIALS.length)}
                      className="py-1.5 px-4 bg-black border border-[#c4a052]/30 text-[10px] text-[#c4a052] tracking-widest uppercase hover:bg-[#c4a052]/10 transition rounded-sm flex items-center gap-1 cursor-pointer"
                    >
                      下一折起批
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 space-y-3 font-serif">
                  <span className="block text-[10px] text-[#c4a052] tracking-widest uppercase font-bold">天子亲书朱批：</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-serif">
                    {STATIC_MEMORIALS[memorialIndex].choices.map((choice, i) => (
                      <button
                        key={i}
                        onClick={() => handleMemorialDecision(i)}
                        className="p-4 bg-black/60 hover:bg-black border border-[#c4a052]/20 hover:border-[#c4a052] transition-colors rounded-sm text-left space-y-2 group cursor-pointer"
                      >
                        <p className="text-xs font-semibold text-[#e0d7cc] group-hover:text-[#c4a052] transition-colors">
                          {choice.text}
                        </p>
                        <span className="text-[10px] text-[#e0d7cc]/40 block font-sans">
                          御判效应：{choice.effect}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Princes Nursery */}
        {activeTab === "nursery" && (
          <div className="max-w-4xl mx-auto space-y-5">
            <div className="text-center pb-3 border-b border-[#c4a052]/20">
              <span className="text-[#c4a052] text-xs font-mono tracking-[0.25em] uppercase">宗人府 · 诞育皇嗣</span>
              <h3 className="text-lg text-[#e0d7cc] mt-2 font-serif tracking-widest font-bold">宗祧有后 麟儿列阁</h3>
              <p className="text-xs text-[#e0d7cc]/60 mt-2 font-serif">
                大晟帝脉承序。流淌着纯净血脉的小皇子在此悉心教导，悉成江山栋梁。
              </p>
            </div>
 
            {/* List of princes */}
            {children.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {children.map(child => (
                  <div
                    key={child.id}
                    className="p-5 bg-black/60 border border-[#c4a052]/20 rounded-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3 font-serif">
                        <div>
                          <h4 className="font-serif text-base text-[#c4a052] font-bold">【皇嗣子】{child.name}</h4>
                          <span className="text-[10px] text-[#e0d7cc]/40 block mt-1">
                            生父：{child.consortName} · 诞于【{player.eraName} {child.birthYear}年】
                          </span>
                        </div>
                        <span className="text-[10px] bg-[#5c1a1a]/20 border border-[#c4a052]/30 text-[#c4a052] py-0.5 px-2.5 rounded-sm font-sans tracking-widest">
                          幼龄: {child.age} 岁
                        </span>
                      </div>
 
                      <p className="text-xs text-[#e0d7cc]/80 bg-black/80 p-3 rounded-sm border border-[#c4a052]/10 font-serif leading-relaxed">
                        皇子天赋根骨：<span className="text-[#c4a052] font-semibold">{child.talent}</span>
                      </p>
 
                      <div className="grid grid-cols-2 gap-3 mt-4 text-[10px] font-sans text-[#e0d7cc]/60">
                        <div className="space-y-1">
                          <p>经籍聪颖值：</p>
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-[#0a0a0b] h-1.5 rounded-full overflow-hidden border border-[#c4a052]/10">
                              <div className="bg-amber-500 h-full" style={{ width: `${child.intelligence}%` }} />
                            </div>
                            <span className="text-[#e0d7cc] font-semibold">{child.intelligence}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p>武德强健值：</p>
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-[#0a0a0b] h-1.5 rounded-full overflow-hidden border border-[#c4a052]/10">
                              <div className="bg-emerald-500 h-full" style={{ width: `${child.health}%` }} />
                            </div>
                            <span className="text-[#e0d7cc] font-semibold">{child.health}</span>
                          </div>
                        </div>
                      </div>
                    </div>
 
                    <div className="pt-4 border-t border-[#c4a052]/20 mt-4 flex gap-2">
                      <button
                        onClick={() => handleVisitChild(child.id)}
                        className="flex-1 py-2 bg-black/60 hover:bg-[#c4a052]/10 border border-[#c4a052]/30 hover:text-[#c4a052] text-xs uppercase tracking-widest transition rounded-sm flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5" />
                        召见培养 (课释诗书)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-black/60 border border-[#c4a052]/20 rounded-sm p-12 text-center space-y-4">
                <Baby className="w-10 h-10 text-[#c4a052]/40 mx-auto animate-bounce" />
                <div>
                  <h4 className="text-sm text-[#c4a052] font-serif tracking-widest font-bold">六宫静默 · 暂无麟儿</h4>
                  <p className="text-xs text-[#e0d7cc]/60 mt-2 max-w-md mx-auto leading-relaxed font-serif text-justify">
                    当前暂未有小皇子诞育登册。承乾雨露，春宵更替，男身有孕孕成后历胎怀喜数月，降生时方可赐字载入宗人府书卷。
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
 
        {/* Tab 4: Chronicle Ledger */}
        {activeTab === "chronicle" && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-[#c4a052]/20 mb-3 font-serif">
              <h3 className="text-base text-[#c4a052] font-bold tracking-widest flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#c4a052]" />
                《大晟起居注 · 永续史官大册》
              </h3>
              <span className="text-xs text-[#e0d7cc]/40">御制乾坤，永载青史</span>
            </div>
 
            <div className="bg-black/60 border border-[#c4a052]/20 p-6 rounded-sm shadow-inner max-h-[500px] overflow-y-auto pr-3 space-y-4 custom-scrollbar">
              {storyLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-5 bg-black/40 border-l-4 border-l-[#c4a052] border border-[#c4a052]/10 rounded-sm hover:bg-black/70 transition duration-150"
                >
                  <div className="flex justify-between items-center text-[10px] font-sans mb-1.5 text-[#e0d7cc]/55">
                    <span className="text-[#c4a052] font-bold tracking-widest font-serif">
                      {player.eraName} {log.year} 年 {log.month} 月 · 御墨朱批
                    </span>
                    <span className="uppercase tracking-widest text-[#c4a052]/70">
                      {log.type === "court" ? "廷断" : log.type === "harem" ? "金宫" : log.type === "birth" ? "诞息" : "社稷"}
                    </span>
                  </div>
                  <h4 className="text-xs font-serif font-bold text-[#e0d7cc] tracking-wide mt-1">
                    {log.title}
                  </h4>
                  <p className="text-xs text-[#e0d7cc]/80 leading-relaxed mt-2 text-justify font-serif">
                    {log.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
 
        {/* Tab 5: Sandbox Novel Writer */}
        {activeTab === "sandbox" && (
          <div className="max-w-4xl mx-auto space-y-5">
            <div className="text-center pb-3 border-b border-[#c4a052]/20">
              <span className="text-[#c4a052] text-xs font-mono tracking-[0.25em] uppercase">紫禁深处 · 天画手叙</span>
              <h3 className="text-lg text-[#e0d7cc] mt-2 font-serif tracking-widest font-bold">天意随笔 · 敕书大晟</h3>
              <p className="text-xs text-[#e0d7cc]/60 mt-2 font-serif">
                无视常规框架，在此随意书写君臣情仇起居，Gemini 将执笔秉承天意补全惊世长卷。
              </p>
            </div>
 
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Output block */}
              <div className="lg:col-span-2">
                <div className="bg-black/80 border border-[#c4a052]/25 p-6 rounded-sm min-h-[400px] flex flex-col justify-between shadow-2xl relative">
                  {isSubmitting ? (
                    <div className="flex-1 flex flex-col justify-center items-center py-24 space-y-4">
                      <div className="w-8 h-8 border-2 border-[#c4a052]/20 border-t-[#c4a052] rounded-full animate-spin" />
                      <p className="text-xs text-[#c4a052] font-serif tracking-widest animate-pulse font-bold">
                        乾坤磨墨中，太史官奉诏著墨，正行落笔...
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 space-y-4 text-xs md:text-sm leading-relaxed text-[#e0d7cc]/90 font-serif max-h-[480px] overflow-y-auto pr-2 custom-scrollbar text-justify antialiased">
                      {sandboxStory.split("\n\n").map((par, i) => (
                        <p key={i} className="indent-8 text-[#e0d7cc]/80 hover:text-[#e0d7cc] transition duration-150">
                          {par}
                        </p>
                      ))}
                    </div>
                  )}
 
                  <div className="pt-4 border-t border-[#c4a052]/20 mt-4 text-[10px] text-[#e0d7cc]/40 italic font-serif">
                    圣谕提示：例如“朕命南璟云等侍寝，在龙床云雨，甘言旭在外惊见...”
                  </div>
                </div>
              </div>
 
              {/* Input Control Box */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-black/60 border border-[#c4a052]/20 rounded-sm p-5 space-y-4">
                  <div className="space-y-1.5 font-serif">
                    <label className="text-[10px] text-[#c4a052] font-bold uppercase tracking-widest block">敕旨随性起草：</label>
                    <p className="text-[11px] text-[#e0d7cc]/60 leading-relaxed text-justify">
                      写下您现在希望御驾前往何殿、敕令何嫔男侍承侍何事，亦可撰述君贵情仇挣扎秘辛：
                    </p>
                  </div>
 
                  <textarea
                    rows={6}
                    maxLength={350}
                    className="w-full bg-black border border-[#c4a052]/20 text-[#e0d7cc] p-3 text-xs md:text-sm rounded-sm focus:outline-none focus:border-[#c4a052] font-serif leading-relaxed"
                    placeholder="如：今夜大雪寒冬，圣上宣甘言旭进暖阁作画。甘氏发丝微湿，玉指抚过古琴，与圣上对视，情动心迷..."
                    value={sandboxPrompt}
                    onChange={(e) => setSandboxPrompt(e.target.value)}
                  />
 
                  <button
                    onClick={handleSandboxSubmit}
                    disabled={isSubmitting || !sandboxPrompt.trim()}
                    className="w-full py-2.5 bg-[#c4a052] hover:bg-[#d4b062] text-black font-bold text-xs tracking-widest rounded-sm flex items-center justify-center gap-1.5 disabled:opacity-40 uppercase cursor-pointer"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    呈交天意 · 挥墨续写
                  </button>
 
                  <div className="text-[10px] text-[#e0d7cc]/50 pt-3.5 leading-relaxed border-t border-[#c4a052]/20 font-serif">
                    <p className="font-semibold text-[#c4a052] tracking-wider">大晟起案阁规：</p>
                    <p className="mt-1">
                      天书模式支持您与AI进行连贯对话，能完全解析玩家个性词句，续写出饱满深情的中国古风后宫起居注。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- Overlay Modal Component: Character action output dialog --- */}
      <AnimatePresence>
        {actionOutput && (
          <div className="fixed inset-0 bg-neutral-950/85 backdrop-blur-sm z-50 flex items-center justify-center px-4 py-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              className="bg-neutral-900 border border-amber-900/30 max-w-2xl w-full p-6 md:p-8 rounded-lg shadow-2xl space-y-5 flex flex-col justify-between max-h-[90vh]"
            >
              <div>
                <div className="flex justify-between items-center pb-2.5 border-b border-amber-900/10">
                  <h3 className="font-serif text-base text-amber-500 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                    {actionOutput.title}
                  </h3>
                  <span className="text-[10px] font-mono text-neutral-500">
                    大晟起居编年
                  </span>
                </div>

                <div className="bg-neutral-950/80 p-5 rounded border border-neutral-850 mt-4 text-xs md:text-sm leading-relaxed text-neutral-300 font-serif max-h-[50vh] overflow-y-auto pr-1 text-justify custom-scrollbar space-y-3 whitespace-pre-line select-none">
                  {actionOutput.text.split("\n\n").map((par, i) => (
                    <p key={i} className="indent-8 select-none hover:text-neutral-150 transition">
                      {par}
                    </p>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800/80 flex justify-end">
                <button
                  onClick={() => setActionOutput(null)}
                  className="py-2 px-5 bg-gradient-to-r from-amber-800 to-amber-955 text-neutral-100 text-xs tracking-widest rounded hover:from-amber-750 transition"
                >
                  起驾回宫 · 朕知悉了
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Overlay Modal Component: PRINCE BIRTH Naming Dialog --- */}
      <AnimatePresence>
        {pendingBirth && (
          <div className="fixed inset-0 bg-neutral-950/90 backdrop-blur-md z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-neutral-950 border-2 border-amber-600/40 max-w-md w-full p-6 rounded-lg text-center space-y-6"
            >
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono tracking-widest text-amber-500 animate-pulse">喜报降祥 · 大庆临门</span>
                <h3 className="text-xl font-serif text-amber-100">
                  大晟后嗣喜诞生！
                </h3>
              </div>

              <p className="text-xs text-neutral-400 leading-relaxed px-2">
                后宫传来急报，【{characters.find(c => c.id === pendingBirth.id)?.name || pendingBirth.consort.name}】于清晨的床帏红烛中，历经千辛万苦，顺利为您诞下了一名身强体壮的【尊贵小皇子】！
                大晟江山有后，皇陵万年。请您亲自下旨，昭告天下，恩赐皇子不世名讳：
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-mono mb-1">敕赐皇子姓名</label>
                  <input
                    type="text"
                    maxLength={10}
                    className="w-full bg-neutral-900 border border-neutral-800 text-amber-100 px-4 py-2 text-center text-sm md:text-base focus:outline-none focus:border-amber-600 rounded font-serif"
                    placeholder="敕赐皇子名（如：楚渊、楚澈、楚承乾）"
                    value={babyName}
                    onChange={(e) => setBabyName(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleBirthComplete}
                    disabled={isSubmitting || !babyName.trim()}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-600 transition text-neutral-100 text-xs tracking-widest rounded font-semibold disabled:opacity-40"
                  >
                    {isSubmitting ? "正在敕封金册大庆并通知礼部..." : "敕赐名册 · 喜贺皇子临世"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Overlay Modal Component: IMPERIAL ARCHIVES SLOTS DIALOG --- */}
      <AnimatePresence>
        {showArchiveModal && (
          <div className="fixed inset-0 bg-[#0a0a0b]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-black border-2 border-[#c4a052]/40 max-w-2xl w-full p-6 md:p-8 rounded-sm text-[#e0d7cc] space-y-6 shadow-2xl relative"
            >
              <div className="text-center font-serif relative">
                <span className="text-[10px] text-[#c4a052] font-mono tracking-[0.25em] block uppercase">大晟御极编年 · 秘阁金史</span>
                <h3 className="text-xl text-[#e0d7cc] tracking-widest font-semibold mt-1">
                  《起居注秘档·皇室金书简》
                </h3>
                <p className="text-xs text-[#e0d7cc]/50 mt-1">
                  天意无极。陛下在此誊录朱章、重宣旧契、或重洗乾坤。
                </p>
                <div className="h-px bg-gradient-to-r from-transparent via-[#c4a052]/30 to-transparent my-3.5" />
              </div>

              <div className="space-y-4 font-serif">
                {["slot_1", "slot_2", "slot_3"].map((key, index) => {
                  const save = slotsData[key];
                  const label = index === 0 ? "金书简 · 其一" : index === 1 ? "金书简 · 其二" : "金书简 · 其三";
                  return (
                    <div
                      key={key}
                      className="p-4 bg-black/60 border border-[#c4a052]/20 rounded-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-[#c4a052]/50 transition duration-200"
                    >
                      <div className="space-y-1">
                        <h4 className="text-xs text-[#c4a052] font-bold tracking-widest">{label}</h4>
                        {save ? (
                          <div className="text-[11px] text-[#e0d7cc]/70 space-y-0.5 font-sans leading-relaxed">
                            <p>年号世袭：<span className="text-[#e0d7cc] font-serif pr-2">{save.player.name} ({save.player.eraName} {save.player.year}年 {save.player.month}月)</span></p>
                            <p>大内指标：<span className="text-[#e0d7cc]">安康:{save.player.health} | 库银:{save.player.treasury.toLocaleString()}两 | 国威:{save.player.authority} | 稳定:{save.player.stability}</span></p>
                            <p className="text-[10px] text-[#c4a052]/80 italic font-mono">誊录时刻：{save.timestamp}</p>
                          </div>
                        ) : (
                          <p className="text-[11px] text-[#e0d7cc]/40 italic">暂无御笔墨迹 · 虚位留白</p>
                        )}
                      </div>

                      <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0 font-sans text-[10px]">
                        <button
                          onClick={() => handleSaveToSlot(key)}
                          className="flex-1 md:flex-none py-1.5 px-3 bg-black border border-[#c4a052]/30 hover:bg-[#c4a052]/10 text-[#c4a052] rounded-sm transition cursor-pointer"
                        >
                          御笔誊录 (存档)
                        </button>
                        {save && (
                          <button
                            onClick={() => handleLoadFromSlot(key)}
                            className="flex-1 md:flex-none py-1.5 px-3 bg-[#c4a052] text-black font-bold hover:bg-[#d4b062] rounded-sm transition cursor-pointer"
                          >
                            奉诏载入 (读档)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-[#c4a052]/20 flex justify-between items-center gap-4">
                <button
                  onClick={handleResetGame}
                  className="py-2 px-4 border border-red-900 text-red-400 hover:bg-red-955/20 text-xs tracking-widest transition rounded-sm cursor-pointer"
                >
                  乾坤重洗 (重置新局)
                </button>
                <button
                  onClick={() => setShowArchiveModal(false)}
                  className="py-2 px-6 bg-black border border-[#c4a052]/30 hover:bg-[#c4a052]/10 text-xs text-[#e0d7cc] tracking-widest transition rounded-sm cursor-pointer"
                >
                  合上秘阁 · 圣驾起驾
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Aesthetic absolute positioning margin details matching visual guidelines */}
      <footer className="fixed bottom-0 left-0 w-full bg-neutral-900/60 border-t border-neutral-900 py-1.5 px-4 z-30 flex justify-between items-center text-[9px] text-neutral-600 backdrop-blur-sm pointer-events-none">
        <span className="font-mono">Dynasty System · Reign Title: {player.eraName}</span>
        <span className="font-serif italic text-[10px]">“后宫深似海，君王步步履。”</span>
      </footer>
    </div>
  );
}
