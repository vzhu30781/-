import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User, Shield, Coins, Heart, Activity, Sparkles, BookOpen, Clock, Gift,
  Bookmark, Award, ChevronRight, MessageSquare, Flame, Check, Baby, AlertCircle,
  Dices, ArrowRight, PenTool, Coffee, Moon, Sparkle, Settings, Megaphone
} from "lucide-react";
import { Character, Child, PlayerStats, StoryLog, Memorial } from "../types";
import { INITIAL_CHARACTERS, BITFEN_HIERARCHY, STATIC_MEMORIALS } from "../data";
import {
  RANDOM_MONTHLY_EVENTS,
  DYNAMIC_MEMORIAL_POOL,
  PRINCE_EVENTS_POOL,
  getPostBirthMemoryText,
  MonthlyEvent,
  DynamicMemorial,
  PrinceEvent
} from "../utils/extraStoryPools";
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
  // --- Check client-side mode (Dev VS Visitor Subdomains) ---
  const isDevelopmentMode = () => {
    if (typeof window === "undefined") return false;
    const hostname = window.location.hostname;
    const searchParams = new URLSearchParams(window.location.search);
    return (
      hostname.includes("-dev-") ||
      hostname.includes("localhost") ||
      hostname.includes("127.0.0.1") ||
      searchParams.get("dev") === "true" ||
      searchParams.get("admin") === "true"
    );
  };

  const isPlaceholderImage = (url?: string) => {
    if (!url) return true;
    return url.includes("input_file") || url.includes("placeholder");
  };

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

  const [activeTab, setActiveTab] = useState<"harem" | "court" | "nursery" | "chronicle" | "sandbox" | "admin">("harem");
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
  const [actionOutput, setActionOutput] = useState<{ type: string; title: string; text: string; characterId?: string; portraitImg?: string; } | null>(null);
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

  // --- Enhanced Game States for Features ---
  // Monthly random events
  const [activeMonthlyEvent, setActiveMonthlyEvent] = useState<MonthlyEvent | null>(null);
  const [monthlyEventOutcome, setMonthlyEventOutcome] = useState<string | null>(null);

  // Post-birth memory triggers (1 month later)
  const [lastMonthBirthConsortId, setLastMonthBirthConsortId] = useState<string | null>(() => {
    return localStorage.getItem("lanyanhoshui_last_month_birth") || null;
  });
  const [activePostBirthMemory, setActivePostBirthMemory] = useState<{ consort: Character; title: string; story: string } | null>(null);

  // Dynamic memorials list (new memorials appended each month)
  const [memorials, setMemorials] = useState<Memorial[]>(() => {
    const saved = localStorage.getItem("lanyanhoshui_memorials");
    if (saved) return JSON.parse(saved);
    return STATIC_MEMORIALS;
  });

  // Bestowing custom noble title (封号) states
  const [isBestowingTitle, setIsBestowingTitle] = useState(false);
  const [customTitleInput, setCustomTitleInput] = useState("");

  // Prince training stories
  const [activePrinceEvent, setActivePrinceEvent] = useState<{ child: Child; event: PrinceEvent; statEffect: string } | null>(null);

  // Palace Draft (选秀) state triggers
  const [showDraftView, setShowDraftView] = useState(false);
  const [draftCandidates, setDraftCandidates] = useState<any[]>([]);

  // 7-day rivalry shuraba event states
  const [turnCount, setTurnCount] = useState<number>(() => {
    const saved = localStorage.getItem("lanyanhoshui_turn_count");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [activeRivalryEvent, setActiveRivalryEvent] = useState<any | null>(null);
  const [rivalryEventOutcome, setRivalryEventOutcome] = useState<string | null>(null);
  const [currentDraftIndex, setCurrentDraftIndex] = useState(0);

  // --- Dynamic Portrait & Administrator States ---
  const [selectedAdminCharId, setSelectedAdminCharId] = useState<string>("nanjingyun");
  const [selectedAdminScenario, setSelectedAdminScenario] = useState<string>("default");
  const [adminImageUrl, setAdminImageUrl] = useState<string>("");

  // Real-time backend system notices and custom overrides states
  const [systemNotice, setSystemNotice] = useState<string>("");
  const [serverStoryOverrides, setServerStoryOverrides] = useState<Record<string, string>>({});

  // Developer form states for real-time publishing
  const [adminCharName, setAdminCharName] = useState<string>("");
  const [adminCharTitle, setAdminCharTitle] = useState<string>("");
  const [adminCharBitfen, setAdminCharBitfen] = useState<string>("");
  const [adminCharIntro, setAdminCharIntro] = useState<string>("");
  const [adminCharPersonality, setAdminCharPersonality] = useState<string>("");
  const [adminCharBackground, setAdminCharBackground] = useState<string>("");
  const [adminOverrideSummon, setAdminOverrideSummon] = useState<string>("");
  const [adminOverrideChat, setAdminOverrideChat] = useState<string>("");
  const [adminOverrideGift, setAdminOverrideGift] = useState<string>("");
  const [adminOverridePromote, setAdminOverridePromote] = useState<string>("");
  const [adminNotice, setAdminNotice] = useState<string>("");
  const [adminSubmitting, setAdminSubmitting] = useState<boolean>(false);

  // Sync state with server database on load and set up periodic real-time polling (every 8 seconds)
  useEffect(() => {
    const fetchServerData = async () => {
      try {
        const res = await fetch("/api/characters");
        if (res.ok) {
          const data = await res.json();
          if (data.systemNotice) {
            setSystemNotice(data.systemNotice);
            setAdminNotice(data.systemNotice);
          }
          if (data.storyOverrides) {
            setServerStoryOverrides(data.storyOverrides);
          }
          if (data.characters && Array.isArray(data.characters)) {
            setCharacters(prev => {
              // Map over existing characters list to merge server-side customizations
              // This preserves player-specific states (affection, health) while dynamically updating story metadata and custom portraits
              const updated = prev.map((local: Character) => {
                const svr = data.characters.find((s: Character) => s.id === local.id);
                if (svr) {
                  return {
                    ...local,
                    name: svr.name,
                    customTitle: svr.customTitle !== undefined ? svr.customTitle : local.customTitle,
                    intro: svr.intro,
                    background: svr.background,
                    personality: svr.personality,
                    avatar: svr.avatar || local.avatar,
                    portraits: { ...(local.portraits || {}), ...(svr.portraits || {}) }
                  };
                }
                return local;
              });

              // Add newly configured characters that exist on the server database but are missing in client state:
              const missingChars = data.characters.filter((s: Character) => !prev.some((local: Character) => local.id === s.id));
              return [...updated, ...missingChars];
            });
          }
        }
      } catch (err) {
        console.error("Failed to load backend server-side real-time state database:", err);
      }
    };

    fetchServerData(); // Initial load

    // Polling interval (8 seconds) to retrieve developer's live updates instantly
    const intervalId = setInterval(fetchServerData, 8000);
    return () => clearInterval(intervalId);
  }, []);

  // Prevent visitor players from manually remaining on admin tab
  useEffect(() => {
    if (!isDevelopmentMode() && activeTab === "admin") {
      setActiveTab("harem");
    }
  }, [activeTab]);

  // Update administrative form bindings when current character or override sets change
  useEffect(() => {
    const char = characters.find(c => c.id === selectedAdminCharId);
    if (char) {
      setAdminCharName(char.name || "");
      setAdminCharTitle(char.customTitle || "");
      setAdminCharBitfen(char.bitfen || "");
      setAdminCharIntro(char.intro || "");
      setAdminCharPersonality(char.personality || "");
      setAdminCharBackground(char.background || "");
      
      const summonKey = `${selectedAdminCharId}_summon`;
      const chatKey = `${selectedAdminCharId}_chat`;
      const giftKey = `${selectedAdminCharId}_gift`;
      const promoteKey = `${selectedAdminCharId}_promote`;
      
      setAdminOverrideSummon(serverStoryOverrides[summonKey] || "");
      setAdminOverrideChat(serverStoryOverrides[chatKey] || "");
      setAdminOverrideGift(serverStoryOverrides[giftKey] || "");
      setAdminOverridePromote(serverStoryOverrides[promoteKey] || "");
    }
  }, [selectedAdminCharId, characters, serverStoryOverrides]);

  const getScenarioPortrait = (charId: string, scenario: "summon" | "chat" | "gift" | "promote" | "default") => {
    const exactChar = characters.find(c => c.id === charId);
    if (!exactChar) return undefined;

    if (exactChar.portraits && exactChar.portraits[scenario]) {
      return exactChar.portraits[scenario];
    }
    if (exactChar.portraits && exactChar.portraits.default) {
      return exactChar.portraits.default;
    }
    if (exactChar.avatar) {
      return exactChar.avatar;
    }

    // Pre-loaded mappings for our main characters:
    if (charId === "liumingche") {
      switch (scenario) {
        case "summon": return "/assets/input_file_5.png";
        case "chat": return "/assets/input_file_1.png";
        case "gift": return "/assets/input_file_6.png";
        case "promote": return "/assets/input_file_0.png";
        default: return "/assets/input_file_1.png";
      }
    }
    if (charId === "nanjingyun") {
      switch (scenario) {
        case "summon": return "/assets/input_file_10.png";
        case "chat": return "/assets/input_file_9.png";
        case "gift": return "/assets/input_file_8.png";
        case "promote": return "/assets/input_file_11.png";
        default: return "/assets/input_file_8.png";
      }
    }
    return undefined;
  };

  const handleAdminImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      alert("请选择有效的图片文件！");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64String = reader.result as string;
      setAdminSubmitting(true);
      
      try {
        const uploadRes = await fetch("/api/admin/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64: base64String,
            filename: `char_${selectedAdminCharId}_${selectedAdminScenario}`
          })
        });

        if (!uploadRes.ok) {
          throw new Error("图片大内金轴网络分发不畅！");
        }

        const uploadData = await uploadRes.json();
        if (!uploadData.success || !uploadData.url) {
          throw new Error(uploadData.error || "大内图库没能成功保存图片！");
        }

        const serverImageUrl = uploadData.url;
        const portraitsUpdate = {
          [selectedAdminScenario]: serverImageUrl
        };

        const updateRes = await fetch("/api/admin/update-character", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            characterId: selectedAdminCharId,
            portraits: portraitsUpdate
          })
        });

        if (updateRes.ok) {
          const updateData = await updateRes.json();
          if (updateData.success) {
            setCharacters(prev => prev.map(c => {
              if (c.id === selectedAdminCharId) {
                const updatedPortraits = {
                  ...(c.portraits || {}),
                  [selectedAdminScenario]: serverImageUrl
                };
                return {
                  ...c,
                  avatar: selectedAdminScenario === "default" ? serverImageUrl : (c.avatar || serverImageUrl),
                  portraits: updatedPortraits
                };
              }
              return c;
            }));
            alert("【圣上圣旨录入】成功上传全新定制立绘！此更新已经固化于大内服务器，所有登入游历大晟的阁下即可即时生效、共览群像！");
          } else {
            throw new Error(updateData.error);
          }
        } else {
          throw new Error("绑定立绘到嫔妃失败！");
        }
      } catch (err: any) {
        alert("上传立绘时出错：" + err.message);
      } finally {
        setAdminSubmitting(false);
      }
    };
    reader.onerror = () => {
      alert("读取大内绘卷失败，请重新尝试选择！");
    };
    reader.readAsDataURL(file);
  };

  const handleAdminSaveUrl = async () => {
    if (!adminImageUrl.trim()) {
      alert("请输入有效的网页图片直链地址！");
      return;
    }
    setAdminSubmitting(true);

    try {
      const portraitsUpdate = {
        [selectedAdminScenario]: adminImageUrl.trim()
      };

      const updateRes = await fetch("/api/admin/update-character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: selectedAdminCharId,
          portraits: portraitsUpdate
        })
      });

      if (updateRes.ok) {
        const updateData = await updateRes.json();
        if (updateData.success) {
          setCharacters(prev => prev.map(c => {
            if (c.id === selectedAdminCharId) {
              const updatedPortraits = {
                ...(c.portraits || {}),
                [selectedAdminScenario]: adminImageUrl.trim()
              };
              return {
                ...c,
                avatar: selectedAdminScenario === "default" ? adminImageUrl.trim() : (c.avatar || adminImageUrl.trim()),
                portraits: updatedPortraits
              };
            }
            return c;
          }));
          alert("【大内直笔画轴】网页图片直链地址成功绑定！已编入大晟服务器金卷，其他所有阁下切入本页即见最新画卷！");
          setAdminImageUrl("");
        } else {
          throw new Error(updateData.error);
        }
      } else {
        throw new Error("直连绑定更新失败");
      }
    } catch (err: any) {
      alert("直联绑定出错：" + err.message);
    } finally {
      setAdminSubmitting(false);
    }
  };

  const handleSaveCharacterAdmin = async () => {
    setAdminSubmitting(true);
    try {
      const payload = {
        characterId: selectedAdminCharId,
        name: adminCharName,
        bitfen: adminCharBitfen,
        intro: adminCharIntro,
        personality: adminCharPersonality,
        background: adminCharBackground,
        customTitleField: adminCharTitle,
        customActionOverrides: {
          summon: adminOverrideSummon,
          chat: adminOverrideChat,
          gift: adminOverrideGift,
          promote: adminOverridePromote
        }
      };

      const res = await fetch("/api/admin/update-character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCharacters(prev => prev.map(c => {
            if (c.id === selectedAdminCharId) {
              return {
                ...c,
                name: adminCharName,
                bitfen: adminCharBitfen,
                intro: adminCharIntro,
                personality: adminCharPersonality,
                background: adminCharBackground,
                customTitle: adminCharTitle
              };
            }
            return c;
          }));
          if (data.storyOverrides) {
            setServerStoryOverrides(data.storyOverrides);
          }
          alert(`【全大晟朝野分发大成】成功更新并分发【${adminCharName}】之玉牌背景、性格及起居注自定义过场剧本！所有游离玩家的客户端即刻刷新展示。`);
        } else {
          alert("大德不合：" + (data.error || "未知瑕疵"));
        }
      } else {
        throw new Error("无法成功连接到大内殿宇服务器");
      }
    } catch (err: any) {
      alert("朝堂金笔宣发失败：" + err.message);
    } finally {
      setAdminSubmitting(false);
    }
  };

  const handleSaveNoticeAdmin = async () => {
    setAdminSubmitting(true);
    try {
      const res = await fetch("/api/admin/save-system-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemNotice: adminNotice
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSystemNotice(adminNotice);
          alert("【德音圣旨恩泽】成功修改并分发全大晟国策通告！其他客官重新加载即见大红通告滚动展示。");
        } else {
          alert("国策宣告失败：" + (data.error || "未知故障"));
        }
      } else {
        throw new Error("连接服务器通告端口中断");
      }
    } catch (err: any) {
      alert("国策布告发布失败：" + err.message);
    } finally {
      setAdminSubmitting(false);
    }
  };

  const handleResetServerDb = async () => {
    if (!window.confirm("大内极机密警示：陛下当真要‘彻底重置服务器端大本金卷’，将所有的主创定制全男立绘，多男主戏份，以及您撰写的滚动起居告示重归乾坤太初吗？此举万难反悔，只为修复测试使用！")) {
      return;
    }
    setAdminSubmitting(true);
    try {
      const res = await fetch("/api/admin/save-system-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetDb: true })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          alert("乾坤九变已遂！云端系统已重组，请等候页面重新招入九五大典...");
          window.location.reload();
        } else {
          throw new Error(data.error);
        }
      } else {
        throw new Error("重整河山服务器未予回应");
      }
    } catch (err: any) {
      alert("朝野江山重洗出错：" + err.message);
    } finally {
      setAdminSubmitting(false);
    }
  };

  useEffect(() => {
    if (lastMonthBirthConsortId) {
      localStorage.setItem("lanyanhoshui_last_month_birth", lastMonthBirthConsortId);
    } else {
      localStorage.removeItem("lanyanhoshui_last_month_birth");
    }
  }, [lastMonthBirthConsortId]);

  useEffect(() => {
    localStorage.setItem("lanyanhoshui_memorials", JSON.stringify(memorials));
  }, [memorials]);

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

  useEffect(() => {
    localStorage.setItem("lanyanhoshui_turn_count", turnCount.toString());
  }, [turnCount]);

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

    // 4. Generate and append a brand new dynamic memorial to memorials state list
    const randomDynamicIndex = Math.floor(Math.random() * DYNAMIC_MEMORIAL_POOL.length);
    const mTemplate = DYNAMIC_MEMORIAL_POOL[randomDynamicIndex];
    const newMemorialId = `dm_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const customizedM: Memorial = {
      id: newMemorialId,
      title: `${mTemplate.title} · ${nextYear}年${nextMonth}月`,
      content: mTemplate.content,
      choices: mTemplate.choices.map(c => ({
        text: c.text,
        effect: c.effect,
        statsChange: c.statsChange,
        resultText: c.resultText
      }))
    };

    setMemorials(prev => {
      const updated = [...prev, customizedM];
      // Set our index to direct to this brand new memorial
      setMemorialIndex(prevIndex => updated.length - 1);
      return updated;
    });

    // 5. Trigger automated post-birth memories if a birth took place 1 month ago
    if (lastMonthBirthConsortId) {
      const birthChar = characters.find(c => c.id === lastMonthBirthConsortId);
      if (birthChar) {
        const memData = getPostBirthMemoryText(birthChar);
        setActivePostBirthMemory({
          consort: birthChar,
          title: memData.title,
          story: memData.story
        });
      }
      setLastMonthBirthConsortId(null);
    }

    // 6. Increment Turn Count and check for Harem Rivalry Event (every 7 turns)
    const nextTurnCount = turnCount + 1;
    setTurnCount(nextTurnCount);

    if (nextTurnCount % 7 === 0) {
      // Trigger dynamic / fallback jealousy rivalry shuraba event!
      triggerRivalryEvent();
    } else {
      // Trigger Standard Monthly Plot Event
      const eventIndex = Math.floor(Math.random() * RANDOM_MONTHLY_EVENTS.length);
      const chosenEvent = RANDOM_MONTHLY_EVENTS[eventIndex];
      setActiveMonthlyEvent(chosenEvent);
      setMonthlyEventOutcome(null);
    }

    // Logging the transition
    addLog(`天道岁序更替换新`, `${player.eraName}${nextYear}年${nextMonth}月清晨更替，大内朱扉钟长鸣，迎万寿朱批。`, "system");
  };

  const triggerRivalryEvent = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/rivalry-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characters, player })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveRivalryEvent(data);
        setRivalryEventOutcome(null);
      } else {
        throw new Error("Rivalry API failure status");
      }
    } catch (e) {
      console.error("Failed trigger rivalry event, using fallback logic instead:", e);
      const activeCandidates = characters.filter(c => !c.isColdPalace);
      if (activeCandidates.length >= 2) {
        const sorted = [...activeCandidates].sort(() => Math.random() - 0.5);
        setActiveRivalryEvent({
          title: `【后宫龃龉 · ${sorted[0].name}与${sorted[1].name}之醋怒】`,
          description: `正阳廊路，细雨零星。今日清扫长阶时，【${sorted[0].name}】因昨朝圣躬多留驾了一刻钟，与迎面偶遇折梅的【${sorted[1].name}】起了剧烈牙舌龃龉。两人拉扯衣袂互不示弱，委屈愤懑。陛下尊步适逢驾临。`,
          choices: [
            {
              text: `当面偏重并安抚【${sorted[0].name}】`,
              resultText: `陛下轻轻揽着【${sorted[0].name}】揉折指尖宽慰，他顿时破涕为笑，满眼得势的温顺伏帖；旁人【${sorted[1].name}】则拂袖落悲，哀戚掩面退去。`,
              statsChange: { authority: 2, stability: -1 },
              affectionChange: { [sorted[0].id]: 15, [sorted[1].id]: -12 }
            },
            {
              text: `当面偏好并安抚【${sorted[1].name}】`,
              resultText: `陛下亲执【${sorted[1].name}】玉指温柔好言揉哄。他长出了满心快意，娇憨浅笑，气得原本自信的【${sorted[0].name}】红了朱唇、咬唇委屈离场。`,
              statsChange: { authority: 2, stability: -1 },
              affectionChange: { [sorted[0].id]: -12, [sorted[1].id]: 15 }
            }
          ]
        });
        setRivalryEventOutcome(null);
      }
    } finally {
      setIsSubmitting(false);
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
      text: storyText + (pregMsg ? `\n\n${pregMsg}` : ""),
      characterId: char.id,
      portraitImg: getScenarioPortrait(char.id, "summon")
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
      text: storyText,
      characterId: char.id,
      portraitImg: getScenarioPortrait(char.id, "chat")
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
      text: storyText,
      characterId: char.id,
      portraitImg: getScenarioPortrait(char.id, "gift")
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
      text: storyText,
      characterId: char.id,
      portraitImg: getScenarioPortrait(char.id, "promote")
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
    setLastMonthBirthConsortId(consort.id); // Triggers loving memory next month!
    setPendingBirth(null);
    setBabyName("");
    setIsSubmitting(false);
  };

  // Action: Visit and Cultivate/Train Child (宗人府深度抚教)
  const trainChild = (child: Child, actionType: "intellect" | "martial" | "garden") => {
    let costType = "";
    let statModifier: Partial<PlayerStats> = {};
    let childModifier: Partial<Child> = {};
    const dialogueEventTrigger = Math.random() < 0.6; // 60% chance to trigger rich dialog story!

    if (actionType === "intellect") {
      if (player.health < 15) {
        alert("陛下深感龙体欠安（健康低于15），当前无法躬亲指导皇子书卷。");
        return;
      }
      costType = "龙体精力损耗（健康-10）";
      statModifier = { health: Math.max(5, player.health - 10) };
      childModifier = { intelligence: Math.min(100, child.intelligence + Math.floor(Math.random() * 3) + 4) };
    } else if (actionType === "martial") {
      if (player.treasury < 5000) {
        alert("大晟帑银不足 5000 两！无法采购重甲与羽箭来锤炼儿臣。");
        return;
      }
      costType = "拨付太仓帑银 5000两";
      statModifier = { treasury: Math.max(0, player.treasury - 5000) };
      childModifier = { health: Math.min(100, child.health + Math.floor(Math.random() * 3) + 4) };
    } else if (actionType === "garden") {
      if (player.treasury < 3000) {
        alert("大晟帑银不足 3000 两！无法在御花园摆设皇家金秋桂宴。");
        return;
      }
      costType = "采购桂糕耗银 3000两";
      statModifier = { treasury: Math.max(0, player.treasury - 3000), prestige: Math.min(100, player.prestige + 3) };
      childModifier = {
        intelligence: Math.min(100, child.intelligence + 2),
        health: Math.min(100, child.health + 2)
      };
    }

    // Apply basic updates
    setPlayer(prev => ({ ...prev, ...statModifier }));
    setChildren(prev => prev.map(c => {
      if (c.id === child.id) {
        return {
          ...c,
          ...childModifier,
          age: c.age + 1 // Add growth age (years of progress)
        };
      }
      return c;
    }));

    // Trigger narrative plot!
    if (dialogueEventTrigger) {
      let eventIdx = 0;
      if (actionType === "intellect") eventIdx = 0; // 书斋御前解卷
      else if (actionType === "martial") eventIdx = 1; // 皇家羽林演武
      else if (actionType === "garden") eventIdx = 2; // 御花园金秋折桂
      else eventIdx = Math.floor(Math.random() * PRINCE_EVENTS_POOL.length);

      const chosenEvent = PRINCE_EVENTS_POOL[eventIdx];
      setActivePrinceEvent({
        child,
        event: chosenEvent,
        statEffect: `皇朝敕书：由于大帝的悉心扶化，皇子【${child.name}】身心根基提升（${
          actionType === "intellect" ? "聪慧 +4" : actionType === "martial" ? "强健 +4" : "聪慧与健康各 +2"
        }）。此次抚养消耗：【${costType}】。`
      });

      addLog(`圣主亲传皇嗣`, `天子亲临宗人府培养皇嗣【${child.name}】且触发了父子回忆【${chosenEvent.title}】。`, "birth");
    } else {
      setActionOutput({
        type: "visit",
        title: `抚育大晟皇嗣 · 考诫呈奏`,
        text: `陛下召见了【${child.name}】进行圣意抚育。皇儿在殿前听从陛下谆谆教导，承继皇家文韬武功。\n\n【效果】：皇嗣【${child.name}】得道大进，${
          actionType === "intellect" ? "文墨思辨值（智慧）增加" : actionType === "martial" ? "筋骨强悍值（健康）增加" : "智慧与武德国学双双增长"
        }！陛下此行消耗：${costType}。`
      });

      addLog(`宗人府常例抚儿`, `圣主考诫小儿【${child.name}】之经籍武德，子嗣深受策勉。`, "birth");
    }
  };

  // --- New Feature Action: Bestow custom titles (起封号) ---
  const handleBestowTitle = (char: Character, titleName: string) => {
    if (!titleName.trim()) {
      alert("请钦定一个风雅的封号！");
      return;
    }
    if (titleName.trim().length > 4) {
      alert("封号字数过于冗杂，祖制至多四个字！");
      return;
    }

    setCharacters(prev => prev.map(c => {
      if (c.id === char.id) {
        return {
          ...c,
          customTitle: titleName.trim(),
          relationshipHistory: [...c.relationshipHistory, `【${player.eraName}${player.year}年${player.month}月】：天恩浩荡，陛下朱笔御批，特恩赐皇家至尊封号【${titleName.trim()}】。`]
        };
      }
      return c;
    }));

    setActionOutput({
      type: "bestow_title",
      title: `朱金册封典 · 赐予御牌号`,
      text: `大晟天子御案前，黄锦册页徐徐铺展。陛下朱批御笔，钦赐【${char.name}】客观彰显世家圣眷之尊贵封号：\n\n     【 ${titleName.trim()} 】\n\n此后内廷上下皆尊称其为「${char.bitfen} · ${titleName.trim()}殿下」。其见圣旨感泣零涕，恩宠万代。`
    });

    addLog(`朱笔恩赐封号`, `圣眷绵延！陛下御笔钦点，赏赐【${char.name}】皇家专属封号【${titleName.trim()}】。`, "harem");
    setIsBestowingTitle(false);
    setCustomTitleInput("");
  };

  // --- New Feature Action: Cast to Cold Palace (打入冷宫) ---
  const handleCastToColdPalace = async (char: Character) => {
    setIsSubmitting(true);
    setActionOutput(null);
    try {
      const res = await fetch("/api/character-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character: char, actionType: "cold_palace" })
      });
      const data = await res.json();
      
      setCharacters(prev => prev.map(c => {
        if (c.id === char.id) {
          return {
            ...c,
            isColdPalace: true,
            affection: Math.max(0, Math.floor(c.affection * 0.1)), // Dropped heavily!
            relationshipHistory: [...c.relationshipHistory, `【${player.eraName}${player.year}年${player.month}月】：天颜震怒，帝御笔批红，剥夺名分恩享，幽禁冷宫洗罪所。`]
          };
        }
        return c;
      }));
      
      setPlayer(prev => ({
        ...prev,
        authority: Math.min(100, prev.authority + 10), // Iron fist increases authority
        stability: Math.max(0, prev.stability - 8),    // Panic drops stability
        prestige: Math.max(0, prev.prestige - 10)      // Scandal drops prestige
      }));
      
      setActionOutput({
        type: "cold_palace",
        title: `降罪诏令：打入冷宫 · ${char.name}`,
        text: data.text,
        characterId: char.id,
        portraitImg: getScenarioPortrait(char.id, "default") // Standard look grayed in UI later
      });
      
      addLog(`天威雷霆降罪`, `因圣意降诏废黜，男妃【${char.name}】褫夺外戴，囚入冷宫。`, "harem");
    } catch (err) {
      console.error("Failed to cast to cold palace:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- New Feature Action: Reconcile from Cold Palace (重归于好) ---
  const handleReconcileFromColdPalace = async (char: Character) => {
    setIsSubmitting(true);
    setActionOutput(null);
    try {
      const res = await fetch("/api/character-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character: char, actionType: "cold_palace_reconcile" })
      });
      const data = await res.json();
      
      setCharacters(prev => prev.map(c => {
        if (c.id === char.id) {
          return {
            ...c,
            isColdPalace: false,
            affection: Math.min(100, c.affection + 45), // Reconnect with emperor's warmth
            relationshipHistory: [...c.relationshipHistory, `【${player.eraName}${player.year}年${player.month}月】：圣御躬亲临御冷室，携其手，宣布免罪复宠归还后宫。`]
          };
        }
        return c;
      }));
      
      setPlayer(prev => ({
        ...prev,
        stability: Math.min(100, prev.stability + 10),
        prestige: Math.min(100, prev.prestige + 8)
      }));
      
      setActionOutput({
        type: "cold_palace_reconcile",
        title: `朱颜承恩：重修旧好 · ${char.name}`,
        text: data.text,
        characterId: char.id,
        portraitImg: getScenarioPortrait(char.id, "chat")
      });
      
      addLog(`天恩破冰复宠`, `大开龙恩！圣上躬亲临御寒窑带回【${char.name}】，冰释前嫌重宠如初。`, "harem");
    } catch (err) {
      console.error("Failed to reconcile from cold palace:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- New Feature Action: Execute/Kill in Cold Palace (直接赐死) ---
  const handleKillInColdPalace = async (char: Character) => {
    if (!confirm(`【天威禁断】陛下，直接赐死将致【${char.name}】香消玉殒，该存盘角色永久销毁（不可逆）。确定要执行最无情的赐死极刑吗？`)) {
      return;
    }
    setIsSubmitting(true);
    setActionOutput(null);
    try {
      const res = await fetch("/api/character-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character: char, actionType: "cold_palace_kill" })
      });
      const data = await res.json();
      
      setPlayer(prev => ({
        ...prev,
        authority: Math.min(100, prev.authority + 15), // Absolute fear
        prestige: Math.max(0, prev.prestige - 15),     // Tragedy drops prestige
        stability: Math.max(0, prev.stability - 12)    // Panic drops stability
      }));
      
      setActionOutput({
        type: "cold_palace_kill",
        title: `白练断魂：赐死 · ${char.name}`,
        text: data.text
      });
      
      addLog(`天怒断魂赐死`, `极刑伏诛：冷宫男妃【${char.name}】被赐白练鸠酒，魂归太虚自此永久销毁。`, "harem");

      // Filter him out of the characters array permanently for this currently active save!
      setCharacters(prev => {
        const filtered = prev.filter(c => c.id !== char.id);
        // Switch selected character to prevent stale display
        if (filtered.length > 0) {
          setSelectedCharacter(filtered[0]);
        } else {
          setSelectedCharacter(null);
        }
        return filtered;
      });
      
    } catch (err) {
      console.error("Failed to execute consort in cold palace:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- New Feature Action: Spring Palace Draft / 选秀 ---
  const startPalaceDraft = () => {
    if (player.treasury < 20000) {
      alert("国库帑银（不足20,000两）短缺，无法承办全国规模秀男大选开支！");
      return;
    }

    setPlayer(prev => ({ ...prev, treasury: prev.treasury - 20000 }));

    const firstNames = ["林", "沈", "陆", "温", "萧", "裴", "顾", "苏", "贺", "云"];
    const lastNames = ["羽清", "容华", "和舒", "景白", "雪澄", "青野", "寒玉", "玉堂", "书墨", "秋泓", "素怀"];
    const backgrounds = [
      "苏杭织造府主事之第，饱读江南词话，生性温柔若酥，一双清水桃花眼中满是柔和情丝。",
      "陇西镇抚都尉幺子，常年塞北挽雕弓，心性烈而傲性，因追狼违规而在秀名册上除名转呈大晟大闱。",
      "前大学士清流之后，苦心研读经籍，自有一种竹韵墨香，面如白玉，极其自持傲霜。",
      "洋庄洋行通事大管事之外甥，精西洋百工机巧之术，喜爱披银狐风毛披风，言辞诙谐好玩。",
      "蜀中药圣世家少宗主之弟，精膳食调配，爱挂满身五彩流苏香荷包，举止高贵矜持。"
    ];
    const personalities = ["温润如水", "赤烈英傲", "墨寒风骨", "洋行伶俐", "药香高贵"];

    const list = Array.from({ length: 3 }).map((_, i) => {
      const gName = firstNames[Math.floor(Math.random() * firstNames.length)] + lastNames[Math.floor(Math.random() * lastNames.length)];
      const gBackground = backgrounds[Math.floor(Math.random() * backgrounds.length)];
      const gPersonality = personalities[Math.floor(Math.random() * personalities.length)];
      return {
        id: "drafted_" + Date.now() + "_" + i + "_" + Math.floor(Math.random() * 100),
        name: gName,
        originalBitfen: "官男子",
        bitfen: "官男子",
        intro: `秀美过人，于内廷参选，生性${gPersonality}。`,
        background: gBackground,
        personality: gPersonality,
        affection: 15 + Math.floor(Math.random() * 10),
        health: 80 + Math.floor(Math.random() * 18),
        fertility: 15 + Math.floor(Math.random() * 20),
        intelligence: 75 + Math.floor(Math.random() * 20),
        pregnantProgress: 0,
        isPregnant: false,
        relationshipHistory: [`【${player.eraName}三年一度内廷大选】：蒙大晟圣天大喜留牌子，宣降圣命迎驾充纳后宫聘承印。`]
      };
    });

    setDraftCandidates(list);
    setCurrentDraftIndex(0);
    setShowDraftView(true);

    addLog(`重开大选春闱`, `春帷新启，钦命举行大晟三年一度秀男大选，国库特批黄金两万对全境海选。`, "system");
  };

  // --- Court Action: Decide static memorials ---
  const handleMemorialDecision = (choiceIndex: number) => {
    const memorial = memorials[memorialIndex];
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

          {isDevelopmentMode() && (
            <button
              onClick={() => { setActiveTab("admin"); setActionOutput(null); }}
              className={`py-3.5 px-5 text-xs text-nowrap md:text-sm tracking-widest font-serif font-bold transition-all flex items-center gap-2 border-b-2 ${
                activeTab === "admin" ? "border-[#c4a052] text-[#c4a052] bg-[#c4a052]/10" : "border-transparent text-[#e0d7cc]/60 hover:text-[#e0d7cc] hover:bg-[#c4a052]/5"
              }`}
            >
              <Settings className="w-4 h-4 text-amber-500" />
              大内画卷部 (管理者)
            </button>
          )}
        </div>
      </div>

      {/* Principal Container Page Body */}
      <main className="max-w-7xl mx-auto w-full px-6 mt-8 flex-1 z-10 relative">
        {/* System Dynamic Marquee Announcement */}
        {systemNotice && (
          <div className="bg-gradient-to-r from-amber-950/40 via-neutral-900 to-amber-950/40 border border-[#c4a052]/20 rounded p-2.5 mb-6 flex items-center justify-between gap-3 animate-fade-in font-serif text-xs">
            <span className="flex items-center gap-1.5 text-amber-500 font-bold shrink-0">
              <Megaphone className="w-3.5 h-3.5 animate-bounce text-amber-400" />
              大晟布告 (实时推送)：
            </span>
            <marquee className="text-[#e0d7cc]/90 text-xs tracking-wider" scrollamount="3">
              {systemNotice}
            </marquee>
          </div>
        )}

        {activeTab === "harem" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left side checklist of all consorts */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-[#c4a052]/30 gap-2">
                <h3 className="text-base text-[#c4a052] flex items-center gap-1.5 font-serif tracking-widest font-bold">
                  <Flame className="w-4 h-4 text-[#c4a052]" />
                  大晟后宫图谱 · 图鉴后宫金卷
                </h3>
                <button
                  onClick={startPalaceDraft}
                  className="py-1.5 px-3 bg-[#5c1a1a] hover:bg-neutral-900 border border-[#c4a052]/50 text-[#c4a052] hover:text-white text-[10px] md:text-xs tracking-wider uppercase font-bold rounded-sm flex items-center gap-1.5 transition duration-200 cursor-pointer shadow-lg hover:shadow-red-900/30"
                >
                  👑 圣上召秀选秀 (耗白银两万)
                </button>
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
                    {/* Tiny pregnancy or cold palace indicator */}
                    {char.isColdPalace ? (
                      <div className="absolute top-2 right-2 flex items-center gap-1 py-0.5 px-2 bg-neutral-900 border border-red-500/50 text-[9px] text-red-400 rounded-sm font-sans tracking-wider font-bold animate-pulse">
                        ❄️ 冷宫幽禁
                      </div>
                    ) : char.isPregnant ? (
                      <div className="absolute top-2 right-2 flex items-center gap-1 py-0.5 px-2 bg-[#5c1a1a] border border-[#c4a052]/40 text-[9px] text-[#c4a052] rounded-sm font-sans tracking-wider animate-pulse font-bold">
                        🤰 孕胎({char.pregnantProgress * 10}%)
                      </div>
                    ) : null}

                     <div className="flex gap-4 items-start">
                      {(() => {
                        const portrait = getScenarioPortrait(char.id, "default");
                        if (portrait && !isPlaceholderImage(portrait)) {
                          return (
                            <div className="relative w-14 h-20 overflow-hidden rounded border border-[#c4a052]/30 bg-neutral-950 flex-shrink-0 shadow-md">
                              <img
                                src={portrait}
                                referrerPolicy="no-referrer; same-origin"
                                alt={char.name}
                                className={`w-full h-full object-cover object-top transition-all duration-300 ${
                                  char.isColdPalace ? "grayscale contrast-125 opacity-40 brightness-75" : ""
                                }`}
                                onError={(e) => {
                                  (e.target as any).style.display = 'none';
                                }}
                              />
                            </div>
                          );
                        } else {
                          return (
                            <div className="relative w-14 h-20 rounded border border-[#c4a052]/40 bg-gradient-to-b from-[#3a0f10] to-[#120505] flex-shrink-0 flex flex-col items-center justify-center p-1.5 shadow-md">
                              <span className="text-[10px] text-amber-500/70 font-mono scale-90 mb-0.5">大内</span>
                              <span className="text-[13px] font-serif font-black text-amber-100/95 tracking-widest bg-black/40 px-1 py-0.5 rounded-sm border border-[#c4a052]/10 leading-none">
                                {char.name.charAt(0)}
                              </span>
                              <span className="text-[9px] text-[#e0d7cc]/60 font-serif scale-85 leading-none mt-1">
                                {char.name.slice(1)}
                              </span>
                              <span className="absolute inset-0.5 border border-[#c4a052]/10 rounded-sm pointer-events-none" />
                            </div>
                          );
                        }
                      })()}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1.5">
                          <div>
                            <h4 className="font-serif text-[15px] text-[#e0d7cc] group-hover:text-[#c4a052] transition-colors flex flex-wrap items-center gap-1.5 leading-tight">
                              {char.customTitle && (
                                <span className="text-amber-300 font-bold bg-[#c4a052]/20 px-1 border border-amber-400/40 text-[10px] rounded-sm tracking-widest font-serif">
                                  【{char.customTitle}】
                                </span>
                              )}
                              {char.name}
                              <span className={`text-[9px] font-sans px-2 border rounded-sm py-0.5 tracking-widest ${getBitfenBadgeStyle(char.bitfen)}`}>
                                {char.bitfen}
                              </span>
                            </h4>
                            <span className="text-[10px] text-[#e0d7cc]/40 italic mt-0.5 block tracking-wider">[原位: {char.originalBitfen}]</span>
                          </div>
                        </div>

                        <p className="text-xs text-[#e0d7cc]/70 line-clamp-2 leading-relaxed font-serif">
                          {char.intro}
                        </p>
                      </div>
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
                    <h3 className="text-xl font-serif text-[#e0d7cc] tracking-widest flex items-center justify-center gap-1.5 mt-2 font-semibold">
                      {activeChar.customTitle && (
                        <span className="text-amber-300 font-bold bg-[#c4a052]/20 px-1 border border-amber-400/35 text-xs rounded-sm tracking-widest font-serif">
                          {activeChar.customTitle}
                        </span>
                      )}
                      {activeChar.name}
                    </h3>
                    <p className="text-xs text-[#e0d7cc]/60 italic mt-2 px-3 leading-relaxed">
                      “{activeChar.personality}”
                    </p>
                  </div>

                  {(() => {
                    const portrait = getScenarioPortrait(activeChar.id, "default");
                    if (portrait && !isPlaceholderImage(portrait)) {
                      return (
                        <div className="relative w-full aspect-[2/3] overflow-hidden rounded border border-[#c4a052]/30 bg-neutral-950 shadow-lg shadow-[#5c1a1a]/10 max-h-[320px]">
                          <img
                            src={portrait}
                            referrerPolicy="no-referrer; same-origin"
                            alt={activeChar.name}
                            className={`w-full h-full object-cover object-top hover:scale-102 transition-all duration-300 ${
                              activeChar.isColdPalace ? "grayscale contrast-125 opacity-40 brightness-75" : ""
                            }`}
                            onError={(e) => {
                              (e.target as any).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                          <div className="absolute top-1.5 left-1.5 w-2 h-2 border-t border-l border-[#c4a052]/60" />
                          <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-[#c4a052]/60" />
                          <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-[#c4a052]/60" />
                          <div className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b border-r border-[#c4a052]/60" />
                        </div>
                      );
                    } else {
                      return (
                        <div className="relative w-full aspect-[2/3] rounded border border-[#c4a052]/35 bg-gradient-to-br from-[#1c0a0a] via-neutral-950 to-[#221010] shadow-lg flex flex-col justify-center items-center p-6 text-center max-h-[320px] overflow-hidden">
                          <div className="absolute inset-2 border border-[#c4a052]/10 rounded-sm pointer-events-none" />
                          <div className="absolute inset-x-0 top-6 text-[#c4a052]/15 text-5xl font-serif text-center select-none pointer-events-none">大晟宫禁</div>
                          
                          <div className="z-10 bg-[#5c1a1a]/15 border border-[#c4a052]/25 p-4 rounded-sm space-y-2">
                            <span className="text-[10px] text-amber-500 tracking-[0.25em] font-serif block font-bold leading-none mb-1">天子后供御笔</span>
                            <h4 className="text-lg font-serif text-amber-100 tracking-widest leading-none font-bold mb-1.5">{activeChar.name}</h4>
                            <p className="text-[10px] text-[#e0d7cc]/60 font-serif leading-relaxed px-1">
                              尚未录入专属高清起居姿貌图。陛下可点按上方「大内画卷部」为该嫔妃上载绑定高清肖像图。
                            </p>
                          </div>
                        </div>
                      );
                    }
                  })()}
                  {activeChar.isColdPalace ? (
                    <div className="space-y-4 pt-4 animate-fadeIn">
                      <div className="bg-gradient-to-br from-[#120505] via-[#240a0a] to-black p-4 rounded-sm border-2 border-red-950/70 text-center relative overflow-hidden space-y-3.5 shadow-2xl">
                        <span className="text-[10px] text-red-500 font-serif tracking-[0.2em] font-bold block">
                          ❄️ 冷宫禁苑 · 罪人羁留所
                        </span>
                        
                        <p className="text-xs text-neutral-300 font-serif leading-relaxed px-2 text-justify">
                          【{activeChar.name}】身负昔日罪旨，幽居在重锁密布之冷宫西北角。寒风呜咽、落雪摧窗，这里炭火全无、吃食敷衍。他一袭旧布单衣，早无封号名位，容色也消瘦枯惨。
                        </p>
                        
                        <div className="h-[1px] bg-red-950/50 w-full" />
                        
                        <p className="text-[10px] text-[#c4a052]/90 font-serif">
                          你悄然驾临废置冷室。看着昔日娇贵傲然的他如今瑟瑟缩缩、朝不保夕，圣意欲要如何发落：
                        </p>

                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                          <button
                            onClick={() => handleReconcileFromColdPalace(activeChar)}
                            disabled={isSubmitting}
                            className="py-2.5 px-2 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-serif font-bold uppercase rounded-sm transition duration-200 cursor-pointer text-center flex flex-col justify-center items-center gap-0.5"
                          >
                            <span className="text-[11px]">重归于好</span>
                            <span className="text-[8px] text-emerald-400/60 font-sans leading-none">【特恩释罪复宠】</span>
                          </button>

                          <button
                            onClick={() => handleKillInColdPalace(activeChar)}
                            disabled={isSubmitting}
                            className="py-2.5 px-2 bg-red-950/70 hover:bg-red-900 border border-red-500/40 text-rose-300 text-xs font-serif font-bold uppercase rounded-sm transition duration-200 cursor-pointer text-center flex flex-col justify-center items-center gap-0.5"
                          >
                            <span className="text-[11px]">直接赐死</span>
                            <span className="text-[8px] text-rose-400/60 font-sans leading-none">【此档永久删除】</span>
                          </button>
                        </div>
                      </div>

                      {/* Relation history log checklist */}
                      <div className="pt-3 border-t border-[#c4a052]/20">
                        <span className="block text-[10px] text-[#c4a052] tracking-widest font-serif font-bold mb-1.5">君臣情爱恩宠录：</span>
                        <ul className="space-y-1.5 text-[10px] text-[#e0d7cc]/50 max-h-24 overflow-y-auto pr-1">
                          {activeChar.relationshipHistory.slice().reverse().map((hist, i) => (
                            <li key={i} className="leading-relaxed border-l border-red-900/40 pl-2 hover:text-[#e0d7cc] transition-colors font-serif">
                              {hist}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
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

                      {/* Other auxiliary actions: Promote, Gift, and Bestow custom noble titles */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="relative">
                          <button
                            onClick={() => { setShowPromoteDropdown(!showPromoteDropdown); setIsBestowingTitle(false); }}
                            disabled={isSubmitting}
                            className="w-full py-2.5 px-2 bg-black/60 hover:bg-[#c4a052]/10 border border-[#c4a052]/30 text-[#e0d7cc] text-[10px] md:text-xs tracking-wider uppercase rounded-sm transition duration-200 flex items-center justify-between gap-1 disabled:opacity-40 cursor-pointer"
                          >
                            <span>册封金册</span>
                            <ChevronRight className="w-3 h-3 text-[#c4a052] transform rotate-90" />
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
                          className="py-2.5 px-2 bg-black/60 hover:bg-[#c4a052]/10 border border-[#c4a052]/30 text-[#e0d7cc] text-[10px] md:text-xs tracking-wider uppercase rounded-sm transition duration-200 flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
                        >
                          赏赐参宝
                        </button>

                        {/* Bestow Title action toggle */}
                        <button
                          onClick={() => { setIsBestowingTitle(!isBestowingTitle); setShowPromoteDropdown(false); }}
                          disabled={isSubmitting}
                          className="py-2.5 px-2 bg-[#5c1a1a]/40 hover:bg-[#5c1a1a]/80 border border-[#c4a052]/30 text-[#e0d7cc] text-[10px] md:text-xs tracking-wider uppercase rounded-sm transition duration-200 flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
                        >
                          钦赐封号
                        </button>
                      </div>

                      {/* Bestowing noble title interactive input row */}
                      {isBestowingTitle && (
                        <div className="p-3 bg-black/90 border border-[#c4a052]/30 rounded-sm space-y-2 font-serif transition">
                          <p className="text-[10px] text-[#c4a052] tracking-wider">★ 钦赐专属封号（最长4字，如：“熹”、“容”、“庄”、“令”）：</p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={4}
                              className="flex-1 bg-black border border-[#c4a052]/40 text-[#e0d7cc] text-xs px-2 py-1.5 rounded-sm focus:outline-none focus:border-[#c4a052] font-serif"
                              placeholder="如: 宸"
                              value={customTitleInput}
                              onChange={(e) => setCustomTitleInput(e.target.value)}
                            />
                            <button
                              onClick={() => handleBestowTitle(activeChar, customTitleInput)}
                              className="px-3 py-1.5 bg-[#5c1a1a] border border-[#c4a052]/40 text-[#c4a052] text-xs hover:text-white rounded-sm transition cursor-pointer"
                            >
                              敕封
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Red Iron-fist Cast to Cold Palace trigger button */}
                      <button
                        onClick={() => handleCastToColdPalace(activeChar)}
                        disabled={isSubmitting}
                        className="w-full mt-2 py-2.5 px-3 bg-[#1a0a0a]/45 hover:bg-red-950/40 border border-red-950 hover:border-red-500/40 text-red-400 text-xs tracking-widest font-serif font-bold uppercase rounded-sm transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-30"
                      >
                        ❄️ 降罪：褫夺外侍·打入冷宫 ❄️
                      </button>

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
                  )}
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
                  {memorials[memorialIndex]?.title || "军机奏折"}
                </span>
              </div>
 
              <div className="bg-black/60 p-5 rounded-sm border border-[#c4a052]/10 text-[#e0d7cc]/90 text-xs md:text-sm leading-loose indent-8 font-serif whitespace-pre-line text-justify">
                {memorials[memorialIndex]?.content}
              </div>
 
              {/* Show decision result if already chosen, else options */}
              {memorials[memorialIndex] && memorialLogs[memorials[memorialIndex].id] ? (
                <div className="mt-6 p-4 bg-[#5c1a1a]/10 border border-[#c4a052]/25 rounded-sm text-xs text-[#e0d7cc]/90 leading-relaxed space-y-4">
                  <p className="font-semibold text-[#c4a052] font-serif tracking-wider">★ 天子御批印宝：</p>
                  <p className="font-serif text-[#e0d7cc]">{memorialLogs[memorials[memorialIndex].id]}</p>
                  
                  <div className="pt-2 font-sans">
                    <button
                      onClick={() => setMemorialIndex((prev) => (prev + 1) % memorials.length)}
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
                    {memorials[memorialIndex]?.choices.map((choice, i) => (
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
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <div className="text-center pb-4 border-b border-[#c4a052]/20">
              <span className="text-[#c4a052] text-xs font-mono tracking-[0.25em] uppercase">宗人府 · 诞育皇嗣</span>
              <h3 className="text-xl text-[#e0d7cc] mt-2 font-serif tracking-[0.15em] font-bold">宗祧有后 麟儿列阁</h3>
              <p className="text-xs text-[#e0d7cc]/60 mt-2 font-serif max-w-2xl mx-auto leading-relaxed">
                大晟帝脉承序，血脉绵延。在此，陛下可悉心抚育宫中诞下的各皇嗣皇女，督考其武艺、政术、文采，使大晟社稷千古永续。
              </p>
            </div>

            {children.length === 0 ? (
              <div className="bg-black/80 border border-[#c4a052]/20 rounded p-12 text-center text-neutral-400 font-serif space-y-4 max-w-2xl mx-auto">
                <div className="w-16 h-16 rounded-full bg-[#5c1a1a]/10 border border-[#c4a052]/30 flex items-center justify-center mx-auto text-3xl">
                  👶
                </div>
                <h4 className="text-sm font-bold text-[#c4a052]">大晟内廷暂无皇嗣降世</h4>
                <p className="text-xs text-[#e0d7cc]/60 max-w-md mx-auto leading-relaxed">
                  陛下当前暂无诞育皇子。可携各宫男妃侍寝（男儿身御胎怀喜），待宠爱欢娱孕育期满10月后，便会有麟儿金殿诞生，封诰谱命！
                </p>
                <div className="pt-2">
                  <span className="text-[10px] text-zinc-500 block">龙精虎猛 · 侍寝喜育生皇嗣</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {children.map((child) => (
                  <div
                    key={child.id}
                    className="bg-black/80 border border-[#c4a052]/20 rounded-sm p-4 relative overflow-hidden flex flex-col justify-between"
                  >
                    {/* Palace styling background pattern */}
                    <div className="absolute top-0 right-0 w-20 h-20 bg-[#c4a052]/5 rounded-bl-full pointer-events-none" />
                    
                    <div>
                      {/* Name/Identity Header */}
                      <div className="flex justify-between items-start pb-2 border-b border-[#c4a052]/10 mb-3">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-amber-100 font-serif flex items-center gap-1.5">
                            <Baby className="w-4 h-4 text-amber-500 animate-pulse" />
                            皇子：${child.name}
                          </h4>
                          <span className="text-[10px] text-zinc-500 block font-mono">
                            AGE: ${child.age} 岁 · 诞于建元 ${child.birthYear}年 ${child.birthMonth}月
                          </span>
                        </div>
                        <span className="text-[10px] text-[#c4a052] font-semibold border border-[#c4a052]/40 bg-[#c4a052]/5 px-2 py-0.5 rounded-sm">
                          父妃：${child.consortName}
                        </span>
                      </div>

                      {/* Attributes list */}
                      <div className="grid grid-cols-3 gap-2 text-center col-span-1 border-0">
                        <div className="p-2 bg-neutral-950/60 border border-neutral-800 rounded-sm">
                          <span className="text-[9px] text-neutral-500 block uppercase">才华命格</span>
                          <span className="text-xs font-serif text-amber-400 font-bold block mt-1">
                            ${child.talent}
                          </span>
                        </div>
                        
                        <div className="p-2 bg-neutral-950/60 border border-neutral-800 rounded-sm">
                          <span className="text-[9px] text-neutral-500 block uppercase">书文聪慧</span>
                          <span className="text-xs font-bold block mt-1 text-sky-400">
                            ${child.intelligence} / 100
                          </span>
                        </div>

                        <div className="p-2 bg-neutral-950/60 border border-neutral-800 rounded-sm">
                          <span className="text-[9px] text-neutral-500 block uppercase">体格龙骼</span>
                          <span className="text-xs font-bold block mt-1 text-emerald-400">
                            ${child.health} / 100
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Panel for Cultivation */}
                    <div className="pt-3 border-t border-[#c4a052]/10 space-y-2 font-serif mt-3">
                      <span className="text-[10px] text-[#c4a052]/80 font-bold block">★ 圣皇躬亲督学抚育：</span>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => trainChild(child, "intellect")}
                          className="py-1 px-1 bg-sky-950/70 hover:bg-sky-900/90 text-sky-200 border border-sky-500/30 text-[10px] tracking-widest font-serif font-bold transition rounded-sm cursor-pointer"
                        >
                          文墨精修
                          <span className="text-[8px] text-sky-400/80 block mt-0.5 font-sans">(健康-10)</span>
                        </button>

                        <button
                          onClick={() => trainChild(child, "martial")}
                          className="py-1 px-1 bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-200 border border-emerald-500/30 text-[10px] tracking-widest font-serif font-bold transition rounded-sm cursor-pointer"
                        >
                          武备演练
                          <span className="text-[8px] text-emerald-400/80 block mt-0.5 font-sans">(帑银-5k)</span>
                        </button>

                        <button
                          onClick={() => trainChild(child, "garden")}
                          className="py-1 px-1 bg-amber-950/70 hover:bg-amber-900/90 text-amber-200 border border-amber-500/30 text-[10px] tracking-widest font-serif font-bold transition rounded-sm cursor-pointer"
                        >
                          御苑设宴
                          <span className="text-[8px] text-amber-400/80 block mt-0.5 font-sans">(帑银-3k)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Sandbox (天书阁/沙盒交互) */}
        {activeTab === "sandbox" && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <div className="text-center pb-4 border-b border-[#c4a052]/20">
              <span className="text-[#c4a052] text-xs font-mono tracking-[0.25em] uppercase">金銮玄天阁 · 天舆墨诏</span>
              <h3 className="text-xl text-[#e0d7cc] mt-2 font-serif tracking-[0.15em] font-bold">玄天无极书台</h3>
              <p className="text-xs text-[#e0d7cc]/60 mt-2 font-serif max-w-2xl mx-auto leading-relaxed">
                陛下，此阁连线大内大史大模型天基！您可随意御笔手书一切荒诞、离奇、亦或惊世骇俗的江山之变与后宫行记，起居院将极速落笔，为您实时谱写宏图。
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Input Area (Left) */}
              <div className="lg:col-span-5 bg-black/80 border border-[#c4a052]/20 p-5 rounded-sm space-y-4 font-serif">
                <span className="text-xs text-[#c4a052] font-bold tracking-widest block border-b border-[#c4a052]/10 pb-2">
                  ✍️ 御笔手书天命召命
                </span>
                
                <div className="space-y-1.5">
                  <label className="text-[11px] text-zinc-400 block font-serif">陛下钦旨诏文内容：</label>
                  <textarea
                    rows={6}
                    className="w-full bg-neutral-950 border border-[#c4a052]/20 text-[#e0d7cc] p-3 text-xs rounded focus:outline-none focus:border-[#c4a052] leading-relaxed font-serif custom-scrollbar"
                    value={sandboxPrompt}
                    onChange={(e) => setSandboxPrompt(e.target.value)}
                    placeholder="例如：御册封江南美男子。或朕携宠臣微服私访遇袭，侍卫以身护驾共度春宵..."
                  />
                </div>

                <button
                  onClick={handleSandboxSubmit}
                  disabled={isSubmitting || !sandboxPrompt.trim()}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-700 to-red-950 hover:from-amber-600 hover:to-red-900 text-[#e0d7cc] text-xs font-bold font-serif tracking-widest uppercase transition border border-[#c4a052]/40 shadow-md cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <PenTool className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  朱砂落款：御笔落字成册
                </button>
              </div>

              {/* Story Result (Right) */}
              <div className="lg:col-span-7 bg-black/80 border border-[#c4a052]/20 p-5 rounded-sm space-y-4 font-serif relative">
                <div className="space-y-1">
                  <span className="text-xs text-[#c4a052] font-bold tracking-widest block">
                    📖 【皇史起居注 · 天书玄章】
                  </span>
                  <div className="text-[10px] text-zinc-500 font-mono">LIVE RECORD OF CELESTIAL REIGN</div>
                </div>

                <div className="p-4 bg-[#5c1a1a]/5 border border-[#c4a052]/10 rounded-sm text-xs text-[#e0d7cc] leading-loose text-justify min-h-[220px] whitespace-pre-wrap select-text selection:bg-amber-900 selection:text-white font-serif relative overflow-y-auto max-h-[400px] custom-scrollbar">
                  {/* Decorative background overlay mark */}
                  <div className="absolute inset-0 flex items-center justify-center text-4xl font-serif text-[#c4a052]/5 tracking-[0.5em] select-none pointer-events-none">
                    起居主簿
                  </div>
                  <div className="relative z-10 leading-relaxed font-serif text-justify antialiased">
                    {sandboxStory}
                  </div>
                </div>

                <div className="text-[11px] text-zinc-500 italic text-center">
                  天意难测，玄天墨宝实时汇通，万国同拜大晟。
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Chronicle Ledger */}
        {activeTab === "chronicle" && (
          <div className="max-w-3xl mx-auto space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center pb-3 border-b border-[#c4a052]/20 mb-3 font-serif">
              <h3 className="text-base text-[#c4a052] font-bold tracking-widest flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#c4a052]" />
                《大晟编年起居校注》
              </h3>
              <span className="text-[10px] text-[#e0d7cc]/40 font-mono">CHRONICLE SECRETS LIST</span>
            </div>

            <div className="bg-black/60 border border-[#c4a052]/20 rounded-sm p-4 text-xs font-serif leading-relaxed text-[#e0d7cc]/80 text-justify mb-4">
              这里誊写着陛下自登极元年初一日以来的所有朝政朱批、后宫幸寝、龙裔诞育的大内秘档实录。每一个重大日子皆被编撰入墨，金册永存，任凭沧海桑田。
            </div>

            {storyLogs.length === 0 ? (
              <div className="bg-neutral-950/80 border border-[#c4a052]/10 rounded p-12 text-center text-zinc-500 font-serif">
                皇史秘阁空空如也，暂未记入起居笔札。
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                {[...storyLogs].reverse().map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-black/85 border border-[#c4a052]/10 rounded-sm hover:border-[#c4a052]/40 transition duration-150 relative overflow-hidden"
                  >
                    {/* Tiny visual type badge left decorative line */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 ${
                        log.type === "court" ? "bg-amber-600" :
                        log.type === "harem" ? "bg-red-800" :
                        log.type === "birth" ? "bg-emerald-600" :
                        log.type === "system" ? "bg-blue-800" : "bg-neutral-600"
                      }`}
                    />
                    <div className="pl-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <span className="text-[10px] text-amber-500/80 font-mono tracking-widest block uppercase font-bold">
                          【 {player.eraName} {log.year} 年 {log.month} 月 】
                        </span>
                        <h4 className="text-xs font-bold font-serif text-white hover:text-amber-200 transition duration-150">
                          {log.title}
                        </h4>
                        <p className="text-[11px] text-[#e0d7cc]/70 font-sans leading-relaxed">
                          {log.content}
                        </p>
                      </div>
                      <span className="text-[9px] text-[#c4a052]/40 uppercase font-mono tracking-wider bg-neutral-950/60 border border-[#c4a052]/10 px-1.5 py-0.5 rounded-sm shrink-0 whitespace-nowrap">
                        {
                          log.type === "court" ? "朝廷政务" :
                          log.type === "harem" ? "深宫宿寝" :
                          log.type === "birth" ? "皇嗣麟嗣" :
                          log.type === "system" ? "天下纪纲" : "起居志"
                        }
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Admin Portrait & Customization Manager */}
        {activeTab === "admin" && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="text-center pb-4 border-b border-[#c4a052]/30">
              <span className="text-[#c4a052] font-mono tracking-[0.25em] text-xs uppercase block">大内内阁 · 开发者模式与舆图金牌</span>
              <h3 className="text-xl text-[#e0d7cc] mt-2 font-serif tracking-[0.1em] font-bold">乾坤执笔金印 · 皇家画坊与起居注大库</h3>
              <p className="text-xs text-[#e0d7cc]/70 mt-2 font-serif max-w-2xl mx-auto leading-relaxed">
                陛下，此极尊阁为您本人专属之“开发者模式”。在此您可肆意重写嫔妃之姓名、钦赐封号、身世背景，更能【自行上传各场景的人物专属擦边或特殊立绘并保存至服务器】，甚至能够手书各场景的【专属剧本 overrides】。
                <span className="text-amber-400 font-bold block mt-1">您在此处作出的任何墨宝，所有玩家在重新切殿或重登时皆可即时连系、共同阅卷！</span>
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Visual Novel Character Portrait Live Preview (lg:col-span-4) */}
              <div className="lg:col-span-4 bg-black/80 border border-[#c4a052]/20 p-5 rounded-sm flex flex-col items-center justify-between shadow-2xl relative space-y-4">
                <span className="text-[10px] text-[#c4a052] font-mono tracking-widest font-bold uppercase">立绘金卷 · 实时预览</span>
                
                {(() => {
                  const targetChar = characters.find(c => c.id === selectedAdminCharId);
                  const previewImg = getScenarioPortrait(selectedAdminCharId, selectedAdminScenario as any);
                  const isPlaceholder = isPlaceholderImage(previewImg);
                  return (
                    <div className="w-full space-y-3">
                      {previewImg && !isPlaceholder ? (
                        <div className="relative w-full aspect-[3/4] overflow-hidden rounded-sm border-2 border-[#c4a052]/50 shadow-md bg-neutral-950">
                          <img
                            src={previewImg}
                            referrerPolicy="no-referrer; same-origin"
                            alt="Preview"
                            className="w-full h-full object-cover object-top"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/80 p-2.5 text-center text-[11px] text-amber-300 font-serif border-t border-[#c4a052]/20 space-y-1">
                            <div>{targetChar?.name} {targetChar?.customTitle ? `(${targetChar.customTitle})` : ""}</div>
                            <div className="text-neutral-400 text-[10px]">
                              【 {
                                selectedAdminScenario === "default" ? "默认形象" :
                                selectedAdminScenario === "summon" ? "翻牌侍寝云雨" :
                                selectedAdminScenario === "chat" ? "偏殿茶余闲叙" :
                                selectedAdminScenario === "gift" ? "天子厚赐谢恩" :
                                "册封晋升金宣"
                              } 】画卷
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full aspect-[3/4] bg-neutral-950 border border-dashed border-[#c4a052]/30 rounded-sm flex flex-col justify-center items-center p-6 text-center text-neutral-600">
                          <Bookmark className="w-8 h-8 text-[#c4a052]/40 mb-2 animate-pulse" />
                          <p className="text-xs font-serif text-[#e0d7cc]/60 mb-1">尚未上载当前场景专属立绘</p>
                          <p className="text-[10px] text-neutral-500 max-w-[170px] leading-relaxed mx-auto">
                            该场景暂用系统默认占位。您可直接在右侧上传新绘卷，所有极速玩家同步更新！
                          </p>
                        </div>
                      )}

                      <div className="bg-[#5c1a1a]/10 border border-[#c4a052]/20 rounded-sm p-3 font-serif space-y-1 text-center">
                        <span className="text-[10px] text-[#c4a052] tracking-wider block font-bold">金銮殿太史令起居注记</span>
                        <p className="text-[10.5px] text-[#e0d7cc]/60 leading-relaxed font-sans">
                          绑定立绘后，该立绘将自适应置入对应的临幸、调情、闲聊或大封场景动画和台词框旁。
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Right Column: Configuration & Uploader Forms (lg:col-span-8) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* 1. Pick Character and Action Target */}
                <div className="bg-black/80 border border-[#c4a052]/20 rounded-sm p-5 space-y-4 font-serif">
                  <h4 className="text-xs text-[#c4a052] font-bold tracking-widest border-b border-[#c4a052]/20 pb-2 flex items-center justify-between">
                    <span>政务一 · 确立编辑嫔妃与画轴场景</span>
                    <span className="text-[10px] text-neutral-500 font-mono text-right">SELECT TARGET CONVERSION</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] text-amber-200 font-bold block mb-1">【首要步骤】选定要调整的嫔妃对象：</label>
                      <select
                        className="w-full bg-neutral-900 border border-[#c4a052]/30 text-[#e0d7cc] p-2.5 text-xs rounded-sm focus:outline-none focus:border-[#c4a052]"
                        value={selectedAdminCharId}
                        onChange={(e) => {
                          setSelectedAdminCharId(e.target.value);
                          setAdminImageUrl("");
                        }}
                      >
                        {characters.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.customTitle ? `(${c.customTitle})` : ""} - 【{c.bitfen}】
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-amber-200 font-bold block mb-1">【步骤二】选择或更换场景大内画画：</label>
                      <select
                        className="w-full bg-neutral-900 border border-[#c4a052]/30 text-[#e0d7cc] p-2.5 text-xs rounded-sm focus:outline-none focus:border-[#c4a052]"
                        value={selectedAdminScenario}
                        onChange={(e) => {
                          setSelectedAdminScenario(e.target.value);
                          setAdminImageUrl("");
                        }}
                      >
                        <option value="default">默认主面板形象 (默认立绘)</option>
                        <option value="summon">翻牌召幸侍寝 (侍寝擦边过场立绘)</option>
                        <option value="chat">偏殿松下并游 (传召闲聊过场立绘)</option>
                        <option value="gift">厚赐参珍古玩 (赏赐过场谢恩立绘)</option>
                        <option value="promote">内务宣旨晋封 (大封金册过场立绘)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Character Profile & overrides Plot customization */}
                <div className="bg-black/80 border border-[#c4a052]/20 rounded-sm p-5 space-y-4 font-serif">
                  <h4 className="text-xs text-[#c4a052] font-bold tracking-widest border-b border-[#c4a052]/20 pb-2 flex items-center justify-between">
                    <span>政务二 · 定制嫔妃背景、性格风骨与剧情 Overrides</span>
                    <span className="text-[10px] text-neutral-500 font-mono">BIOGRAPHY & PLOTS EDITOR</span>
                  </h4>
                  
                  {/* character profile detail values */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">嫔妃名牌 (姓名)：</label>
                      <input
                        type="text"
                        className="w-full bg-neutral-950 border border-[#c4a052]/20 text-[#e0d7cc] p-2 text-xs rounded-sm focus:outline-none focus:border-[#c4a052]"
                        value={adminCharName}
                        onChange={(e) => setAdminCharName(e.target.value)}
                        placeholder="请输入姓名"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">钦赐封号 (选填，最长四字)：</label>
                      <input
                        type="text"
                        maxLength={4}
                        className="w-full bg-neutral-950 border border-[#c4a052]/20 text-[#e0d7cc] p-2 text-xs rounded-sm focus:outline-none focus:border-[#c4a052]"
                        value={adminCharTitle}
                        onChange={(e) => setAdminCharTitle(e.target.value)}
                        placeholder="例如“贤””容“"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">性格及风骨简述：</label>
                      <textarea
                        rows={2}
                        className="w-full bg-neutral-950 border border-[#c4a052]/20 text-[#e0d7cc] p-2 text-xs rounded-sm focus:outline-none focus:border-[#c4a052] leading-relaxed"
                        value={adminCharPersonality}
                        onChange={(e) => setAdminCharPersonality(e.target.value)}
                        placeholder="例如：冷面侍卫，风骨凌厉；或柔弱稚嫩，遇帝娇喘"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">家世及身世传记简述：</label>
                      <textarea
                        rows={2}
                        className="w-full bg-neutral-950 border border-[#c4a052]/20 text-[#e0d7cc] p-2 text-xs rounded-sm focus:outline-none focus:border-[#c4a052] leading-relaxed"
                        value={adminCharBackground}
                        onChange={(e) => setAdminCharBackground(e.target.value)}
                        placeholder="列于大晟卷册深处的男妃身世背景往事"
                      />
                    </div>
                  </div>

                  {/* Overriding storylines textares */}
                  <div className="border-t border-[#c4a052]/10 pt-3 space-y-3">
                    <span className="text-[11px] text-amber-500 font-bold block">
                      ★ 大内金册：专属剧情/过场文本手写 Overrides（若填写则彻底代替AI生成，玩家瞬发阅览）:
                    </span>
                    <p className="text-[10px] text-[#e0d7cc]/50">
                      填入您定制好的精美古风剧本（支持带擦边描述、软色情和微肉体厮磨微雨描写，擦边内容更胜大内一筹）。若不填写则系统会正常调用后端高效大模型。
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="text-[10.5px] text-[#c4a56c] block mb-1">【侍寝】云雨剧情重写 Overrides:</label>
                        <textarea
                          rows={3}
                          className="w-full bg-neutral-950 border border-[#c4a052]/20 text-[#e0d7cc] p-2 text-[11px] rounded-sm focus:outline-none focus:border-red-900 leading-relaxed font-serif"
                          value={adminOverrideSummon}
                          onChange={(e) => setAdminOverrideSummon(e.target.value)}
                          placeholder="例如：红烛摇曳。陛下扯开其里衣，他娇喘微微，咬唇隐忍承欢下身..."
                        />
                      </div>
                      <div>
                        <label className="text-[10.5px] text-[#c4a56c] block mb-1">【闲聊】茶余并肩对话 Overrides:</label>
                        <textarea
                          rows={3}
                          className="w-full bg-neutral-950 border border-[#c4a052]/20 text-[#e0d7cc] p-2 text-[11px] rounded-sm focus:outline-none focus:border-[#c4a052] leading-relaxed font-serif"
                          value={adminOverrideChat}
                          onChange={(e) => setAdminOverrideChat(e.target.value)}
                          placeholder="共同登高、握着由于练功而布满硬茧的柔和厚实手掌..."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="text-[10.5px] text-[#c4a56c] block mb-1">【赏赐】厚赏谢恩折扇 Overrides:</label>
                        <textarea
                          rows={2}
                          className="w-full bg-neutral-950 border border-[#c4a052]/20 text-[#e0d7cc] p-2 text-[11px] rounded-sm focus:outline-none focus:border-[#c4a052] leading-relaxed font-serif"
                          value={adminOverrideGift}
                          onChange={(e) => setAdminOverrideGift(e.target.value)}
                          placeholder="接获帝皇白银国御，诚惶诚恐，叩头谢恩，私语说今夜愿竭虑尽心寝宿..."
                        />
                      </div>
                      <div>
                        <label className="text-[10.5px] text-[#c4a56c] block mb-1">【册封】宣布晋封册命 Overrides:</label>
                        <textarea
                          rows={2}
                          className="w-full bg-neutral-950 border border-[#c4a052]/20 text-[#e0d7cc] p-2 text-[11px] rounded-sm focus:outline-none focus:border-[#c4a052] leading-relaxed font-serif"
                          value={adminOverridePromote}
                          onChange={(e) => setAdminOverridePromote(e.target.value)}
                          placeholder="明黄色册命宣旨，臣妾南氏、接旨领大晟金册金印、跪帝膝下..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleSaveCharacterAdmin}
                      disabled={adminSubmitting}
                      className="w-full py-2.5 bg-gradient-to-r from-amber-700 to-red-950 hover:from-amber-600 hover:to-red-900 text-[#e0d7cc] text-xs font-bold font-serif tracking-widest uppercase transition duration-150 border border-[#c4a052]/50 shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40"
                    >
                      👑 保存 【 {adminCharName} 】 履历大典剧本并全大晟分发
                    </button>
                  </div>
                </div>

                {/* 3. Portirat / Image bindings */}
                <div className="bg-black/80 border border-[#c4a052]/20 rounded-sm p-5 space-y-4 font-serif">
                  <h4 className="text-xs text-[#c4a052] font-bold tracking-widest border-b border-[#c4a052]/20 pb-2 flex items-center justify-between">
                    <span>政务三 · 上传特定剧情立绘图片（全服动态生效）</span>
                    <span className="text-[10px] text-neutral-500 font-mono">PORTRAIT UPLOADER</span>
                  </h4>
                  <p className="text-[10.5px] text-[#e0d7cc]/70">
                    为上述选定的 <span className="text-amber-400 font-bold font-serif">【 {adminCharName} 】</span> 嫔妃之 <span className="text-amber-400 font-bold font-serif">【 {
                      selectedAdminScenario === "default" ? "默认形象" :
                      selectedAdminScenario === "summon" ? "翻牌侍寝云雨" :
                      selectedAdminScenario === "chat" ? "偏殿茶余闲叙" :
                      selectedAdminScenario === "gift" ? "天子厚赐谢恩" :
                      "册封晋升金宣"
                    } 】场景</span> 上传精美新立绘形象：
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {/* File Picker */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] text-amber-200 block font-bold">方案 A：一键上传本地照片永久录入大内：</span>
                      <div className="relative flex items-center justify-center border border-dashed border-[#c4a052]/30 rounded bg-neutral-950 p-6 hover:bg-neutral-900 transition-colors group cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAdminImageUpload}
                          disabled={adminSubmitting}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div className="flex flex-col items-center gap-1 text-[#c4a052]">
                          <Award className="w-4 h-4 animate-bounce text-amber-400" />
                          <span className="text-xs font-bold tracking-widest">选择设备大内绘卷并上传</span>
                          <span className="text-[9px] text-zinc-500 font-mono">SUPPORT BASE64 COMPATIBLE SERVER SAVE</span>
                        </div>
                      </div>
                    </div>

                    {/* Web link block */}
                    <div className="space-y-1.5 flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[11px] text-amber-200 block font-bold">方案 B：绑定互联网上的图片直链 URL：</span>
                        <input
                          type="text"
                          className="w-full bg-neutral-950 border border-[#c4a052]/20 text-[#e0d7cc] p-2 text-xs rounded-sm focus:outline-none focus:border-[#c4a052] font-mono"
                          placeholder="例如 https://img.site/pic.png"
                          value={adminImageUrl}
                          onChange={(e) => setAdminImageUrl(e.target.value)}
                        />
                      </div>
                      <button
                        onClick={handleAdminSaveUrl}
                        disabled={adminSubmitting}
                        className="w-full py-2 bg-neutral-900 hover:bg-[#c4a052]/20 border border-[#c4a052]/40 text-[#c4a052] font-bold text-xs tracking-wider transition rounded-sm cursor-pointer disabled:opacity-40"
                      >
                        绑定网页直链画作
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Imperial System Notices broadcaster (版本更新大内布告) */}
                <div className="bg-black/80 border border-[#c4a052]/20 rounded-sm p-5 space-y-4 font-serif">
                  <h4 className="text-xs text-[#c4a052] font-bold tracking-widest border-b border-[#c4a052]/20 pb-2 flex items-center justify-between">
                    <span>政务四 · 全服发布大晟起居注版本更新圣旨</span>
                    <span className="text-[10px] text-neutral-500 font-mono">PUSH REALTIME SYSTEM BROADCAST</span>
                  </h4>
                  <div className="space-y-2">
                    <label className="text-[11px] text-neutral-400 block mb-1">
                      起居告示布告（将在所有进入客户端主上界面顶部滚动播报大字）：
                    </label>
                    <textarea
                      rows={2}
                      className="w-full bg-neutral-950 border border-[#c4a052]/20 text-[#e0d7cc] p-2.5 text-xs rounded-sm focus:outline-none focus:border-[#c4a052] leading-relaxed"
                      value={adminNotice}
                      onChange={(e) => setAdminNotice(e.target.value)}
                      placeholder="例如：大内起居注版本大更新：柳明澈白色仙君立绘正式连线、全服新增高画质擦边侍寝图谱！"
                    />
                    <button
                      onClick={handleSaveNoticeAdmin}
                      disabled={adminSubmitting}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs tracking-widest transition rounded-sm cursor-pointer disabled:opacity-40"
                    >
                      📢 玺印盖章！分发并广而告之全大晟大内版通告
                    </button>
                  </div>
                </div>

                {/* 5. System self-healing */}
                <div className="bg-black/80 border border-red-950/40 rounded-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-serif">
                  <div className="space-y-1">
                    <span className="text-xs text-red-500 font-bold block">🚨 服务器重整太初自救（重置所有后台数据）</span>
                    <p className="text-[10.5px] text-[#e0d7cc]/50 font-sans">
                      一键清空服务器的 server_db.json，将所有画具、名称、台词 overrides 回归 to 默认状态。
                    </p>
                  </div>
                  <button
                    onClick={handleResetServerDb}
                    disabled={adminSubmitting}
                    className="py-1.5 px-4 bg-red-950 hover:bg-red-900 text-red-100 text-xs tracking-wider rounded-sm border border-red-500/30 transition cursor-pointer disabled:opacity-40 shrink-0"
                  >
                    重整乾坤（清空服务器回零）
                  </button>
                </div>

              </div>
            </div>

            {/* Display current App Links elegantly to show the generated dynamic website as requested */}
            <div className="bg-gradient-to-r from-neutral-900 to-black border border-[#c4a052]/15 rounded-sm p-5 font-serif space-y-3">
              <span className="text-[10px] text-[#c4a052] font-mono uppercase tracking-[0.2em] font-bold block">
                大晟游戏天下金銮直通门（动态网址生成）
              </span>
              <p className="text-[11px] text-[#e0d7cc]/70 leading-relaxed text-justify">
                太史监已为您在大晟天基云端铺设了动态网址金轨，任何人都可以通过以下专属动态网址直接御驾登基，实时连线后宫：
              </p>
              
              <div className="grid grid-cols-1 gap-2 text-xs font-mono">
                <div className="p-2.5 bg-neutral-950 rounded border border-[#c4a052]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-amber-300">陛下专享游历门 (Dev Link/调试端):</span>
                  <a href={typeof window !== "undefined" ? window.location.origin : ""} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline break-all">
                    {typeof window !== "undefined" ? window.location.origin : "https://ais-dev-oaav6ff5mqxwfo7t7w4b6v-263264234483.us-east1.run.app"}
                  </a>
                </div>
                
                <div className="p-2.5 bg-neutral-950 rounded border border-[#c4a052]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-green-400">分享万国朝拜金轨 (Shared App/玩家分享旁观端):</span>
                  <a href={typeof window !== "undefined" ? window.location.origin.replace("-dev-", "-pre-") : ""} target="_blank" rel="noreferrer" className="text-[#c4a052] hover:underline break-all">
                    {typeof window !== "undefined" ? window.location.origin.replace("-dev-", "-pre-") : "https://ais-pre-oaav6ff5mqxwfo7t7w4b6v-263264234483.us-east1.run.app"}
                  </a>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* Interactive Cinematic Loading Overlay */}
      <AnimatePresence>
        {isSubmitting && !actionOutput && (
          <div className="fixed inset-0 bg-neutral-950/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-neutral-900 border-2 border-[#c4a052]/40 max-w-sm w-full p-8 rounded-lg shadow-2xl space-y-6 text-center text-[#e0d7cc] relative overflow-hidden"
            >
              {/* Palace corners decorative borders */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-[#c4a052]/50" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-[#c4a052]/50" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-[#c4a052]/50" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-[#c4a052]/50" />
              
              <div className="flex justify-center mb-2">
                <div className="relative">
                  <div className="w-12 h-12 border-2 border-dashed border-[#c4a052] rounded-full animate-spin duration-3000" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[#c4a052] animate-pulse" />
                  </div>
                </div>
              </div>

              <div className="space-y-3 font-serif">
                <h4 className="text-sm font-bold text-amber-500 tracking-[0.2em] uppercase">【大内太史局待诏】</h4>
                <p className="text-[11px] text-zinc-500 font-mono">CHENG SHI XUN LONG WEI</p>
                <p className="text-xs text-justify leading-relaxed text-[#e0d7cc]/95 border-t border-b border-[#c4a052]/10 py-4 px-2 select-none indent-6 antialiased">
                  正在进御伺候，笔染朱砂，起草谱写起居注。天基神笔挥洒，大晟河山更替，稍息呈卷，请陛下宽心稍候...
                </p>
              </div>

              <div className="text-[10px] text-zinc-400 animate-pulse font-mono tracking-widest font-serif">
                大内研墨传召进行中...
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-4">
                  {/* Left Column: Visual Novel Character Portrait */}
                  {actionOutput.portraitImg && !isPlaceholderImage(actionOutput.portraitImg) && (
                    <div className="md:col-span-4 flex justify-center items-center">
                      <div className="relative w-full aspect-[2/3] max-w-[180px] md:max-w-full overflow-hidden rounded border-2 border-[#c4a052]/50 shadow-lg shadow-[#5c1a1a]/15 bg-neutral-950">
                        <img
                          src={actionOutput.portraitImg}
                          referrerPolicy="no-referrer; same-origin"
                          alt="Character Portrait"
                          className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t border-l border-[#c4a052]/60" />
                        <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t border-r border-[#c4a052]/60" />
                        <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b border-l border-[#c4a052]/60" />
                        <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b border-r border-[#c4a052]/60" />
                      </div>
                    </div>
                  )}

                  {/* Right Column: Narrative Story Scroll */}
                  <div className={`${(actionOutput.portraitImg && !isPlaceholderImage(actionOutput.portraitImg)) ? "md:col-span-8" : "md:col-span-12"} bg-neutral-950/85 p-5 rounded border border-neutral-850 text-xs md:text-sm leading-relaxed text-neutral-300 font-serif max-h-[50vh] overflow-y-auto pr-1 text-justify custom-scrollbar space-y-3 whitespace-pre-line select-none`}>
                    {actionOutput.text.split("\n\n").map((par, i) => (
                      <p key={i} className="indent-8 select-none hover:text-neutral-100 transition duration-150">
                        {par}
                      </p>
                    ))}
                  </div>
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

      {/* --- FEATURE 1: Three-Year Palace Selection (选秀大典) Modal Overlay --- */}
      {showDraftView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0f0f11] border-2 border-[#c4a052]/40 rounded-sm w-full max-w-xl p-6 md:p-8 space-y-6 relative shadow-2xl my-8"
          >
            <div className="text-center space-y-1">
              <span className="text-[#c4a052] text-xs font-mono tracking-[0.2em] block">【三年一度 · 春闱秀选】</span>
              <h3 className="text-xl md:text-2xl font-serif text-[#e0d7cc] tracking-widest font-bold">大晟天朝 选秀大典</h3>
              <div className="w-20 h-px bg-gradient-to-r from-transparent via-[#c4a052]/40 to-transparent mx-auto mt-2" />
            </div>

            {draftCandidates.length > 0 && currentDraftIndex < draftCandidates.length ? (
              (() => {
                const cand = draftCandidates[currentDraftIndex];
                return (
                  <div className="space-y-5">
                    <div className="flex justify-between items-center bg-[#5c1a1a]/10 p-3.5 border border-[#c4a052]/20 rounded-sm">
                      <div>
                        <span className="text-[10px] text-[#c4a052] font-mono tracking-wider font-semibold">
                          候选秀士 {currentDraftIndex + 1} / {draftCandidates.length}
                        </span>
                        <h4 className="text-lg text-[#e0d7cc] font-serif font-bold mt-1">【江山俊彦】{cand.name}</h4>
                      </div>
                      <span className="text-xs bg-black px-2.5 py-1 border border-[#c4a052]/30 rounded-sm text-[#e0d7cc] font-mono">
                        初始位分：{cand.bitfen}
                      </span>
                    </div>

                    <div className="space-y-3 font-serif">
                      <div className="p-4 bg-black/60 border border-[#c4a052]/10 rounded-sm space-y-2">
                        <span className="text-[10px] text-[#c4a052] tracking-widest uppercase font-bold block">家室出身记略：</span>
                        <p className="text-xs text-[#e0d7cc]/90 leading-relaxed text-justify indent-6">
                          {cand.background}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[11px] font-sans text-[#e0d7cc]/70 font-semibold">
                        <p className="bg-black/40 border border-[#c4a052]/10 p-2.5 rounded-sm flex items-center justify-between">
                          <span>气宇脾质:</span>
                          <strong className="text-[#c4a052] font-serif">{cand.personality}</strong>
                        </p>
                        <p className="bg-black/40 border border-[#c4a052]/10 p-2.5 rounded-sm flex items-center justify-between">
                          <span>经略悟性:</span>
                          <strong className="text-amber-500 font-serif">{cand.intelligence}</strong>
                        </p>
                        <p className="bg-black/40 border border-[#c4a052]/10 p-2.5 rounded-sm flex items-center justify-between">
                          <span>身骨元气:</span>
                          <strong className="text-green-400 font-serif">{cand.health}</strong>
                        </p>
                        <p className="bg-black/40 border border-[#c4a052]/10 p-2.5 rounded-sm flex items-center justify-between">
                          <span>承产育力:</span>
                          <strong className="text-purple-400 font-serif">{cand.fertility}%</strong>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#c4a052]/20">
                      <button
                        onClick={() => {
                          // DISMISS (撂牌子)
                          addLog(`选秀撂牌`, `秀册：陛下御笔批阅，对候选秀男【${cand.name}】撂牌子，赐黄金二十两打发。`, "system");
                          if (currentDraftIndex + 1 >= draftCandidates.length) {
                            setShowDraftView(false);
                          } else {
                            setCurrentDraftIndex(prev => prev + 1);
                          }
                        }}
                        className="py-3 bg-black/80 hover:bg-[#c4a052]/10 border border-[#c4a052]/30 text-[#e0d7cc] hover:text-[#c4a052] text-xs font-serif tracking-widest rounded-sm transition cursor-pointer"
                      >
                        【撂牌子 · 赐花银】
                      </button>
                      <button
                        onClick={() => {
                          // ACCEPT (留牌子)
                          setCharacters(prev => [...prev, cand]);
                          addLog(`选秀纳妃`, `喜报！陛下龙颜大悦，御笔批下对秀男【${cand.name}】留牌子，宣圣旨充纳后宫承印。`, "birth");
                          if (currentDraftIndex + 1 >= draftCandidates.length) {
                            setShowDraftView(false);
                          } else {
                            setCurrentDraftIndex(prev => prev + 1);
                          }
                        }}
                        className="py-3 bg-[#5c1a1a] border-2 border-[#c4a052] text-white hover:text-amber-200 text-xs font-serif font-bold tracking-widest rounded-sm transition cursor-pointer shadow-lg"
                      >
                        【留牌子 · 迎内宫】
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-6 space-y-4">
                <p className="text-xs text-[#e0d7cc]/80 font-serif">本次大晟春闱秀色选秀圆满落幕，选妃御笔册页皆注金册。</p>
                <button
                  onClick={() => setShowDraftView(false)}
                  className="px-6 py-2 bg-[#c4a052] text-black text-xs uppercase font-bold tracking-widest hover:bg-amber-400 rounded-sm cursor-pointer"
                >
                  返回后宫
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* --- NEW FEATURE: Harem Rivalry Event (宿命修罗场风波) choice modal --- */}
      {activeRivalryEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0e0a0a] border-2 border-red-900/60 rounded-sm w-full max-w-xl p-6 md:p-8 space-y-5 relative shadow-2xl my-8 shadow-[#5c1a1a]/15"
          >
            <div className="text-center">
              <span className="text-red-500 text-xs font-mono tracking-[0.25em] block">【后宫风波 · 醋海修罗怒】</span>
              <h3 className="text-lg md:text-xl font-serif text-amber-100 tracking-widest font-bold mt-1">
                {activeRivalryEvent.title}
              </h3>
              <div className="w-24 h-px bg-gradient-to-r from-transparent via-red-800/60 to-transparent mx-auto mt-2" />
            </div>

            {!rivalryEventOutcome ? (
              <div className="space-y-5">
                <p className="p-4 bg-black/80 border border-red-950/40 rounded-sm text-xs md:text-sm leading-loose indent-8 font-serif text-[#e0d7cc]/90 text-justify">
                  {activeRivalryEvent.description}
                </p>

                <div className="space-y-2.5 font-serif">
                  <span className="text-[10px] text-red-400 tracking-widest font-bold">圣意裁决（偏袒一方或施加禁断惩处）：</span>
                  {activeRivalryEvent.choices.map((c: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => {
                        // Apply stat changes safely
                        setPlayer(prev => {
                          const next = { ...prev };
                          if (c.statsChange.health !== undefined) next.health = Math.max(5, Math.min(100, next.health + c.statsChange.health));
                          if (c.statsChange.treasury !== undefined) next.treasury = Math.max(0, next.treasury + c.statsChange.treasury);
                          if (c.statsChange.authority !== undefined) next.authority = Math.max(0, Math.min(100, next.authority + c.statsChange.authority));
                          if (c.statsChange.prestige !== undefined) next.prestige = Math.max(0, Math.min(100, next.prestige + c.statsChange.prestige));
                          if (c.statsChange.stability !== undefined) next.stability = Math.max(0, Math.min(100, next.stability + c.statsChange.stability));
                          return next;
                        });

                        // Apply affection changes
                        if (c.affectionChange) {
                          setCharacters(prevChars => prevChars.map(char => {
                            if (c.affectionChange[char.id] !== undefined) {
                              const change = c.affectionChange[char.id];
                              return {
                                ...char,
                                affection: Math.max(0, Math.min(100, char.affection + change)),
                                relationshipHistory: [
                                  ...char.relationshipHistory,
                                  `【${player.eraName}${player.year}年${player.month}月】：于后宫惊天大争醋《${activeRivalryEvent.title}》中，陛下进行圣听大裁，受天颜偏私影响，对其好好感 ${change > 0 ? "上升" : "下降"} ${Math.abs(change)} 点。`
                                ]
                              };
                            }
                            return char;
                          }));
                        }

                        // Write log
                        addLog(`圣意偏私：${activeRivalryEvent.title}`, `帝于太和长阶处理了重臣争宠：${c.text}`, "harem");
                        setRivalryEventOutcome(c.resultText);
                      }}
                      className="w-full p-3.5 bg-black/95 hover:bg-neutral-950 border border-red-950/60 hover:border-red-500/30 transition text-left text-xs text-[#e0d7cc] rounded-sm cursor-pointer space-y-1 block"
                    >
                      <p className="font-semibold text-amber-200">{c.text}</p>
                      <div className="flex gap-2 text-[9px] text-[#e0d7cc]/40 font-sans">
                        <span>裁决连带损益:</span>
                        <span>{Object.entries(c.statsChange).map(([k, v]) => `${k === "treasury" ? "太仓银" : k === "health" ? "圣寿" : k === "stability" ? "社稷" : k === "prestige" ? "江山民望" : "权威"} ${(v as number) > 0 ? "+" : ""}${v}`).join(", ")}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5 font-serif text-xs md:text-sm">
                <div className="p-4 bg-red-950/10 border border-red-900/30 rounded-sm text-justify leading-loose text-[#e0d7cc]/90 whitespace-pre-line">
                  {rivalryEventOutcome}
                </div>
                <button
                  onClick={() => {
                    setActiveRivalryEvent(null);
                    setRivalryEventOutcome(null);
                  }}
                  className="w-full py-3 bg-red-900 text-amber-100 text-xs tracking-widest font-bold uppercase hover:bg-red-850 rounded-sm cursor-pointer transition shadow-xl border border-red-650"
                >
                  玉笔朱批 · 宣旨结案
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* --- FEATURE 2: Monthly Plot Event (随机新剧情) choice modal --- */}
      {activeMonthlyEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0c0c0e] border-2 border-[#c4a052] rounded-sm w-full max-w-lg p-6 md:p-8 space-y-5 relative shadow-2xl my-8 "
          >
            <div className="text-center">
              <span className="text-[#c4a052] text-xs font-mono tracking-[0.2em] block">【新月天威 · 随机朝会事件】</span>
              <h3 className="text-lg md:text-xl font-serif text-[#e0d7cc] tracking-widest font-bold mt-1">
                {activeMonthlyEvent.title}
              </h3>
              <div className="w-24 h-px bg-gradient-to-r from-transparent via-[#c4a052]/40 to-transparent mx-auto mt-2" />
            </div>

            {!monthlyEventOutcome ? (
              <div className="space-y-5">
                <p className="p-4 bg-black/60 border border-[#c4a052]/10 rounded-sm text-xs md:text-sm leading-loose indent-8 font-serif text-[#e0d7cc]/90 text-justify">
                  {activeMonthlyEvent.description}
                </p>

                <div className="space-y-2.5 font-serif">
                  <span className="text-[10px] text-[#c4a052] tracking-widest font-bold">天子决断圣裁的选择：</span>
                  {activeMonthlyEvent.choices.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        // Apply stat changes safely
                        setPlayer(prev => {
                          const next = { ...prev };
                          if (c.statsChange.health !== undefined) next.health = Math.max(5, Math.min(100, next.health + c.statsChange.health));
                          if (c.statsChange.treasury !== undefined) next.treasury = Math.max(0, next.treasury + c.statsChange.treasury);
                          if (c.statsChange.authority !== undefined) next.authority = Math.max(0, Math.min(100, next.authority + c.statsChange.authority));
                          if (c.statsChange.prestige !== undefined) next.prestige = Math.max(0, Math.min(100, next.prestige + c.statsChange.prestige));
                          if (c.statsChange.stability !== undefined) next.stability = Math.max(0, Math.min(100, next.stability + c.statsChange.stability));
                          return next;
                        });

                        // Apply affection changes
                        if (c.affectionChange) {
                          setCharacters(prevChars => prevChars.map(char => {
                            if (c.affectionChange && c.affectionChange[char.id] !== undefined) {
                              return {
                                ...char,
                                affection: Math.max(0, Math.min(100, char.affection + c.affectionChange[char.id])),
                                relationshipHistory: [
                                  ...char.relationshipHistory,
                                  `【${player.eraName}${player.year}年${player.month}月】：于朝野重大风波《${activeMonthlyEvent.title}》中，陛下进行圣裁大断，连带对本人好感影响。`
                                ]
                              };
                            }
                            return char;
                          }));
                        }

                        // Write log
                        addLog(`阁部朱断：${activeMonthlyEvent.title}`, `圣上御断处理了重大风云：${c.text}`, "system");
                        setMonthlyEventOutcome(c.resultText);
                      }}
                      className="w-full p-3.5 bg-black/80 hover:bg-black border border-[#c4a052]/20 hover:border-[#c4a052] transition text-left text-xs text-[#e0d7cc] rounded-sm cursor-pointer space-y-1 block"
                    >
                      <p className="font-semibold text-amber-200">{c.text}</p>
                      <div className="flex gap-2 text-[9px] text-[#e0d7cc]/40 font-sans">
                        <span>国力影响:</span>
                        <span>{Object.entries(c.statsChange).map(([k, v]) => `${k === "treasury" ? "太仓银" : k === "health" ? "圣寿" : k === "stability" ? "社稷" : k === "prestige" ? "江山民望" : "权威"} ${(v as number) > 0 ? "+" : ""}${v}`).join(", ")}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5 font-serif text-xs md:text-sm">
                <div className="p-4 bg-[#5c1a1a]/10 border border-[#c4a052]/20 rounded-sm text-justify leading-loose text-[#e0d7cc]/90 whitespace-pre-line">
                  {monthlyEventOutcome}
                </div>
                <button
                  onClick={() => setActiveMonthlyEvent(null)}
                  className="w-full py-3 bg-[#c4a052] text-black text-xs tracking-widest font-bold uppercase hover:bg-amber-400 rounded-sm cursor-pointer transition shadow-xl"
                >
                  领旨谕知
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* --- FEATURE 3: Post-Birth memory narrative (产后一月回忆剧情) modal --- */}
      {activePostBirthMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0b0b0d] border-2 border-[#c4a052] rounded-sm w-full max-w-xl p-6 md:p-8 space-y-5 relative shadow-2xl my-8 "
          >
            <div className="text-center">
              <span className="text-[#c4a052] text-xs font-mono tracking-[0.2em] block">【诞育满月 · 椒房亲情回忆】</span>
              <h3 className="text-lg md:text-xl font-serif text-[#e0d7cc] tracking-widest font-bold mt-1">
                {activePostBirthMemory.title}
              </h3>
              <div className="w-20 h-px bg-gradient-to-r from-transparent via-[#c4a052]/40 to-transparent mx-auto mt-2" />
            </div>

            <div className="p-5 bg-black/80 border border-[#c4a052]/10 rounded-sm text-xs md:text-sm leading-loose text-[#e0d7cc]/90 text-justify whitespace-pre-line font-serif indent-8">
              {activePostBirthMemory.story}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPlayer(prev => ({ ...prev, health: Math.min(100, prev.health + 4) }));
                  setCharacters(prevChars => prevChars.map(c => {
                    if (c.id === activePostBirthMemory.consort.id) {
                      return {
                        ...c,
                        affection: Math.min(100, c.affection + 10),
                        relationshipHistory: [...c.relationshipHistory, `【${player.eraName}${player.year}年${player.month}月】：小皇儿满月，陛下重迎旧忆，体恤产育之艰好感显著提升。`]
                      };
                    }
                    return c;
                  }));
                  setActivePostBirthMemory(null);
                }}
                className="flex-1 py-3 bg-[#5c1a1a] text-amber-200 border border-[#c4a052]/40 hover:text-white text-xs font-serif font-bold tracking-widest rounded-sm transition cursor-pointer"
              >
                深情体恤（好感+10，龙驾圣寿+4）
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* --- FEATURE 4: Prince cultivation events dialogue modal --- */}
      {activePrinceEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0f0f11] border-2 border-[#c4a052]/40 rounded-sm w-full max-w-lg p-6 md:p-8 space-y-4 relative shadow-2xl"
          >
            <div className="text-center">
              <span className="text-[#c4a052] text-xs font-mono tracking-[0.2em] block">【天子躬教 · 皇家温情时光】</span>
              <h3 className="text-base md:text-lg font-serif text-[#e0d7cc] tracking-widest font-bold mt-1">
                {activePrinceEvent.event.title}
              </h3>
              <span className="text-[10px] text-[#e0d7cc]/50 block mt-1">皇子【{activePrinceEvent.child.name}】于殿前承圣训</span>
              <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#c4a052]/40 to-transparent mx-auto mt-2" />
            </div>

            <div className="space-y-4 font-serif">
              <p className="p-3.5 bg-black/60 border border-[#c4a052]/10 rounded-sm text-xs text-[#e0d7cc]/90 leading-relaxed text-justify">
                {activePrinceEvent.event.description}
              </p>

              <div className="p-4 bg-[#5c1a1a]/10 border-l-2 border-[#c4a052]/40 rounded-r text-xs text-amber-100 italic leading-relaxed text-justify">
                {activePrinceEvent.event.dialogue}
              </div>

              <p className="p-3 bg-black/80 border border-neutral-800 rounded-sm text-[10px] text-[#c4a052] text-center font-sans tracking-tight">
                【圣断教化论】：{activePrinceEvent.statEffect}
              </p>
            </div>

            <button
              onClick={() => setActivePrinceEvent(null)}
              className="w-full py-2.5 bg-[#c4a052] text-black text-xs font-bold font-sans tracking-widest uppercase hover:bg-amber-400 transition"
            >
              圣爱寄语：勉励儿皇
            </button>
          </motion.div>
        </div>
      )}

      {/* Aesthetic absolute positioning margin details matching visual guidelines */}
      <footer className="fixed bottom-0 left-0 w-full bg-neutral-900/60 border-t border-neutral-900 py-1.5 px-4 z-30 flex justify-between items-center text-[9px] text-neutral-600 backdrop-blur-sm pointer-events-none">
        <span className="font-mono">Dynasty System · Reign Title: {player.eraName}</span>
        <span className="font-serif italic text-[10px]">“后宫深似海，君王步步履。”</span>
      </footer>
    </div>
  );
}
