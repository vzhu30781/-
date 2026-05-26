import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield, Sparkles, Feather, Swords, Flame, Coins, Sparkle, Heart, Activity } from "lucide-react";

interface BackstoryProps {
  onComplete: (playerName: string, eraName: string, stats: any) => void;
}

export default function Backstory({ onComplete }: BackstoryProps) {
  const [playerName, setPlayerName] = useState("楚明熙");
  const [eraName, setEraName] = useState("昭武");
  const [step, setStep] = useState(1);
  const [choiceMade, setChoiceMade] = useState<string | null>(null);
  const [storyResult, setStoryResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Character Trait selection
  const [selectedTrait, setSelectedTrait] = useState("trait1");
  const [stats, setStats] = useState({
    health: 95,
    treasury: 250000,
    authority: 80,
    prestige: 75,
    stability: 85,
  });

  const traits = [
    {
      id: "trait1",
      name: "深沉权智 (主权社稷)",
      mod: { authority: 15, stability: 5, treasury: -10000 },
      icon: <Shield className="w-4 h-4 text-[#c4a052]" />,
      desc: "“朕之言便是王道天意。”擅长统御权术，权威隆盛，群臣战战兢兢，能保江山基本磐石无忧。",
      statsPreview: "【威权 +15 · 稳定 +5 · 库银 -10000】"
    },
    {
      id: "trait2",
      name: "垂拱儒德 (贤君清流)",
      mod: { prestige: 20, stability: 10, treasury: -30000 },
      icon: <Sparkles className="w-4 h-4 text-amber-400" />,
      desc: "“施仁政于天下，厚德以泽兆民。”饱读诗书，受文臣士子、清誉名门疯狂爱戴拥护，名望极大。",
      statsPreview: "【名望 +20 · 稳定 +10 · 库银 -30000】"
    },
    {
      id: "trait3",
      name: "金印豪贾 (大富天仓)",
      mod: { treasury: 80000, prestige: 5, authority: -5 },
      icon: <Coins className="w-4 h-4 text-yellow-500" />,
      desc: "“商通两洋，富甲太仓。”与江浙巨贾世家渊源极深，通融财路，国库直接多有赏银周转型资。",
      statsPreview: "【库银 +80000 · 名望 +5 · 威权 -5】"
    },
    {
      id: "trait4",
      name: "玄极武烈 (圣躬九转)",
      mod: { health: 10, authority: 10, stability: -5 },
      icon: <Flame className="w-4 h-4 text-red-500" />,
      desc: "“龙体安康，马踏关河。”醉心军事与自身武力锻炼，龙体强健胜人，兵锋威煞天下。",
      statsPreview: "【安康 +10 · 威权 +10 · 稳定 -5】"
    }
  ];

  // Background narration paragraphs
  const introParagraphs = [
    `大晟国历四百二十三年。在唯有男子可怀喜、历胎数月育子承嗣的神异大路上，皇朝更替，起伏不定。`,
    `你，乃是大晟国行事坦荡、才学冠盖天下、且在深宫多得先帝喜爱的四皇子【${playerName}】。你长年积累的广博才情与孝悌心，让无数清流重臣交口称誉，本是最有实力的太子储嗣人选。然而，木秀于林，风必摧之。在中秋节先皇帝病入膏肓之时，极度荒废国度却手握军饷的大皇子，竟于龙床前对你扣下了蓄谋已久的连夜污蔑。`,
    `“四弟狼子野心，里通国外敌邦！竟敢在私邸中金屋豢养异邦质子，暗自收拢都城精锐羽林、圈养大批敢死甲士，其罪滔天，当诛！”他的每一句话语，如毒剑穿心，撕裂了大殿的安寂。年迈的先帝气急攻心，当场吐血重昏，百官冷眼猜嫌，朝野震荡——一夕之间，你竟然成了叛国死罪的囚徒！`,
  ];

  const applyTraitModifiers = (traitId: string) => {
    const selected = traits.find(t => t.id === traitId);
    if (!selected) return;
    setStats(prev => {
      const updated = { ...prev };
      Object.entries(selected.mod).forEach(([key, val]) => {
        // @ts-ignore
        updated[key] = updated[key] + val;
      });
      return updated;
    });
  };

  const handleChoice = async (optionId: string, optionText: string, statMod: any) => {
    setChoiceMade(optionId);
    setLoading(true);

    // Dynamic state modifiers for the selection
    setStats(prev => {
      const updated = { ...prev };
      Object.entries(statMod).forEach(([key, val]) => {
        // @ts-ignore
        updated[key] = Math.max(0, updated[key] + val);
      });
      return updated;
    });

    try {
      const res = await fetch("/api/backstory-choice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choiceId: optionId, choiceText: optionText })
      });
      const data = await res.json();
      setStoryResult(data.text);
    } catch (e) {
      // Offline fallback mapping to ensure perfectly narrative immersion
      let localStory = "";
      if (optionId === "opt1") {
        localStory = `【利刃血踏龙门 · 白骨铸就天子位】\n你下定夺极铁血决心。深夜暴风呼号，惊雷撕裂苍穹。你密令南璟云与贴身暗卫倾巢而出，刀上淬火，悍然洗劫大皇子之府。南璟云身中十一处长创，鲜血顺着他黑黑冰冷的贴面滴落，他双手顶托战栗龙玺，低吼着跪落在你皇榻前：“罪臣璟云，已将大阿哥九族反臣诛灭无声，请陛下即位！”与此同时，萧大将军嫡子萧鹤贤在前朝用虎符封死都城各阁，前朝哗然，百官叩降。`;
      } else if (optionId === "opt2") {
        localStory = `【贤王清君正名 · 天地同声奉圣贤】\n你行极堂皇纯儒之策。隔日朝议会时，你于太和正殿前当堂割破掌心，大义浩荡，慷慨陈词，将大阿哥通敌夺位、构陷手足的密谋证据一一公诸于世。萧鹤贤则在内城各檐洒满起居折书揭发乱党，使大阿哥臭名飞散。民心振奋，群臣倒戈相拥。南璟云率天宿军在偏殿将大皇子就地禁足。万民齐叹你是大晟至孝贤君，你手捧社稷明册，御极登极！`;
      } else if (optionId === "opt3") {
        localStory = `【奇袭商盟·金元瓦解 · 豪族平吞大皇府】\n你早年结交了商阀巨擘之孙朱念熹，在最危急的一刻挥洒朱家百万两源源商税外币。你重金策反、金银腐蚀了大阿哥最得意的都城禁队和守桥统领，当夜城关大开。大阿哥麾下大军在金银砸下的顷刻间自行哗然溃败。南璟云与精锐毫不费力地接掌皇宫。前朝大司马得知其死党被朱家买通自绝，瞬间俯首俯顺。在金锣大典的礼乐中，你气度雍容地登上了闪烁黄金大印的御座！`;
      } else {
        localStory = `【红绡死间·暗毒诛心 · 无面魅影收权海】\n你不愿掀起生灵涂炭的兵变。你命人利用柳明澈悉心思调的幽香密气【龙息夜香】，于御前小太监的托盘中，暗中投放在了大皇子府邸的书房中。大阿哥在醉卧书卷的暖烟里悄无声息地气绝身亡，睡颜安和。门外南璟云迅速接下大将军和萧大统领的接风，萧鹤贤率兵将涉事谋逆党羽于内廷连夜秘密带走法办。朝廷表面上死一般平静清明，人人只惊叹于陛下不显山水的莫测天威。你缓缓走上宝座，无有一点血迹，却威慑天地！`;
      }
      setStoryResult(localStory);
    }
    setLoading(false);
    setStep(4);
  };

  const handleTraitConfirm = () => {
    applyTraitModifiers(selectedTrait);
    setStep(3);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#e0d7cc] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-serif">
      {/* Immersive Theme radial gradient overlays */}
      <div className="absolute inset-0 opacity-25 pointer-events-none bg-[radial-gradient(circle_at_50%_30%,#5c1a1a_0%,transparent_70%),radial-gradient(circle_at_80%_80%,#c4a052_0%,transparent_50%)" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#5c1a1a] via-[#c4a052] to-[#5c1a1a] opacity-80" />
      
      {/* Aesthetic border frames of the palace chamber */}
      <div className="hidden md:block absolute inset-6 border border-[#c4a052]/20 rounded-sm pointer-events-none" />
      <div className="hidden md:block absolute inset-8 border border-[#c4a052]/5 rounded-sm pointer-events-none" />

      <div className="max-w-2xl w-full relative z-10 bg-black/60 backdrop-blur-md border border-[#c4a052]/30 p-6 md:p-10 rounded-sm shadow-2xl">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <span className="text-[#c4a052] font-mono tracking-[0.25em] text-xs">大晟皇朝 · 起居古梦</span>
                <h1 className="text-3xl md:text-4xl font-serif tracking-[0.1em] text-[#e0d7cc] flex items-center justify-center gap-2">
                  <Flame className="w-7 h-7 text-[#c4a052] animate-pulse" />
                  蓝颜祸水
                </h1>
                <p className="text-[#c4a052]/60 text-xs tracking-widest mt-1">BLOSSOMS OF THE EMPIRE</p>
                <div className="h-px bg-gradient-to-r from-transparent via-[#c4a052]/30 to-transparent my-5" />
              </div>

              <div className="space-y-4">
                <p className="text-[#e0d7cc]/90 leading-relaxed text-sm bg-black/40 p-4 border-l-2 border-[#c4a052]/60 rounded-r">
                  “帝星明灭，先皇大限将至。深宫血风将起，陛下，您的名讳与开元即位年号即将载入大晟金书帝卷。”
                </p>
                
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs text-[#c4a052] uppercase tracking-widest font-mono mb-2">天子御讳 (大帝姓名)</label>
                    <input
                      type="text"
                      maxLength={8}
                      className="w-full bg-black/80 border border-[#c4a052]/30 text-[#e0d7cc] px-4 py-2.5 rounded-sm focus:outline-none focus:border-[#c4a052] text-sm tracking-widest font-serif"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="帝王名讳"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#c4a052] uppercase tracking-widest font-mono mb-2">开国登基年号</label>
                    <input
                      type="text"
                      maxLength={6}
                      className="w-full bg-black/80 border border-[#c4a052]/30 text-[#e0d7cc] px-4 py-2.5 rounded-sm focus:outline-none focus:border-[#c4a052] text-sm tracking-widest font-serif"
                      value={eraName}
                      onChange={(e) => setEraName(e.target.value)}
                      placeholder="如：景和、绍统、昭武"
                    />
                    <p className="text-[#c4a052]/45 text-[10px] mt-1 italic">默认为“昭武”，如：【昭武元年】</p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setStep(2)}
                  className="w-full py-3 bg-[#c4a052] text-black text-xs tracking-widest uppercase font-bold hover:bg-[#d4b062] transition duration-200 active:translate-y-px rounded-sm shadow-lg shadow-[#c4a052]/10 cursor-pointer"
                >
                  奠定圣王御名 · 进往圣心命格
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.6 }}
              className="space-y-5"
            >
              <div className="text-center mb-4">
                <span className="text-[#c4a052] text-xs font-mono tracking-[0.2em] uppercase">【第二卷 · 圣天子命格】</span>
                <h2 className="text-xl text-[#e0d7cc] mt-1 font-serif tracking-widest">敕选天子命格 · 奠基底蕴</h2>
                <p className="text-[#e0d7cc]/50 text-xs font-sans mt-0.5">命格决定大晟皇帝治世之始的国库资金、尊威及康健等基础数值：</p>
                <div className="w-16 h-px bg-[#c4a052]/40 mx-auto mt-2" />
              </div>

              <div className="grid grid-cols-1 gap-2.5 max-h-[380px] overflow-y-auto pr-1 text-xs">
                {traits.map(t => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTrait(t.id)}
                    className={`p-4 border rounded-sm transition-all duration-300 cursor-pointer text-left space-y-1 ${
                      selectedTrait === t.id ? "bg-gradient-to-br from-[#5c1a1a]/25 to-black border-[#c4a052] shadow-md" : "bg-black/40 border-[#c4a052]/20 hover:border-[#c4a052]/50 hover:bg-black/60"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-serif font-bold text-sm text-[#e0d7cc] flex items-center gap-1.5">
                        {t.icon}
                        {t.name}
                      </h4>
                      <span className="text-[10px] font-sans text-[#c4a052] font-semibold">{t.statsPreview}</span>
                    </div>
                    <p className="text-[#e0d7cc]/75 leading-relaxed text-[11px] font-serif pr-2">{t.desc}</p>
                  </div>
                ))}
              </div>

              <div className="pt-3">
                <button
                  onClick={handleTraitConfirm}
                  className="w-full py-3 bg-[#c4a052] text-black text-xs tracking-widest uppercase font-bold hover:bg-[#d4b062] transition duration-200 rounded-sm shadow-md cursor-pointer"
                >
                  确立帝王命格 · 步入夺嫡棋局
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-5"
            >
              <div className="text-center mb-4">
                <span className="text-[#c4a052] text-xs font-mono tracking-[0.2em] uppercase">【第三卷 · 夺嫡绝局】</span>
                <h2 className="text-xl text-[#e0d7cc] mt-1 font-serif tracking-widest">帝王之志 一念决山河</h2>
                <div className="w-16 h-px bg-[#c4a052]/40 mx-auto mt-2" />
              </div>

              <div className="space-y-4 text-[#e0d7cc]/90 font-serif leading-relaxed text-xs md:text-sm max-h-[240px] overflow-y-auto pr-2 custom-scrollbar text-justify">
                {introParagraphs.map((par, i) => (
                  <p key={i} className="indent-8 hover:text-[#e0d7cc] transition-colors">
                    {par}
                  </p>
                ))}
                
                <p className="indent-8 text-[#c4a052] font-light bg-[#5c1a1a]/10 p-4 rounded-sm border border-[#c4a052]/20 leading-relaxed text-xs">
                  残红如泪，偏殿寒甲之音阵阵，大哥得意狂悖的狞容逼死目前。你斜睨向在侧静立合掌于剑穗的璟云，与手中萧大统领之信！在这最后一刹，你将降旨：
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2">
                <button
                  onClick={() => handleChoice("opt1", "密授战符：掷禁军密诏。命南璟云统死士‘不惜代价斩尽杀绝大皇党’；令萧鹤贤起大将军家兵在前朝镇慑百官", { authority: 10, prestige: -5 })}
                  className="text-left p-3.5 bg-black/50 hover:bg-black/80 border border-[#c4a052]/20 hover:border-[#c4a052] rounded-sm text-[#e0d7cc] transition duration-200 flex items-start gap-2.5 cursor-pointer text-xs"
                >
                  <Swords className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold block mb-0.5 text-[#c4a052] font-serif">【甲】利刃血踏龙门</span>
                    <span className="opacity-80 text-[10px] leading-relaxed block text-justify">璟云重甲染红格杀乱军，萧大统领镇锁六门。【威权 +10 · 名望 -5】</span>
                  </div>
                </button>

                <button
                  onClick={() => handleChoice("opt2", "大典贤表：极显清圣。在朝门大声咳血泣天，在道义上揭穿构陷，为璟云暗逼内殿争取天下道德舆论", { prestige: 15, authority: -5 })}
                  className="text-left p-3.5 bg-black/50 hover:bg-black/80 border border-[#c4a052]/20 hover:border-[#c4a052] rounded-sm text-[#e0d7cc] transition duration-200 flex items-start gap-2.5 cursor-pointer text-xs"
                >
                  <Feather className="w-4 h-4 text-[#c4a052] mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold block mb-0.5 text-[#c4a052] font-serif">【乙】贤王清礼正名</span>
                    <span className="opacity-80 text-[10px] leading-relaxed block text-justify">当殿哭诏理清万民大义，儒门重臣纷纷倒戈相庆。【名望 +15 · 威权 -5】</span>
                  </div>
                </button>

                <button
                  onClick={() => handleChoice("opt3", "奇银破关：借朱家庞大商会外资，当夜砸金两百万两，贿通买崩大皇子的禁军戍前统军各部，不战自降", { treasury: 30000, stability: -5 })}
                  className="text-left p-3.5 bg-black/50 hover:bg-black/80 border border-[#c4a052]/20 hover:border-[#c4a052] rounded-sm text-[#e0d7cc] transition duration-200 flex items-start gap-2.5 cursor-pointer text-xs"
                >
                  <Coins className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold block mb-0.5 text-[#c4a052] font-serif">【丙】金元奇兵瓦解</span>
                    <span className="opacity-80 text-[10px] leading-relaxed block text-justify">用白银两百万两买下敌军指挥，兵不血刃接管皇宫。【国库 +30000 · 稳定 -5】</span>
                  </div>
                </button>

                <button
                  onClick={() => handleChoice("opt4", "龙息夜香：秘传内间，借助柳明澈秘制沉睡异毒，在寿酒中赐死，不兴毫厘干戈封灭乱局", { stability: 10, health: -5 })}
                  className="text-left p-3.5 bg-black/50 hover:bg-black/80 border border-[#c4a052]/20 hover:border-[#c4a052] rounded-sm text-[#e0d7cc] transition duration-200 flex items-start gap-2.5 cursor-pointer text-xs"
                >
                  <Activity className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold block mb-0.5 text-[#c4a052] font-serif">【丁】红绡密香诛心</span>
                    <span className="opacity-80 text-[10px] leading-relaxed block text-justify">剧毒安寐封喉，大皇子死于睡卷笑靥，兵戈自解。【稳定 +10 · 圣寿 -5】</span>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <div className="text-center">
                <span className="text-[#c4a052] text-xs font-mono tracking-[0.2em] uppercase">【万乘之局 · 乾坤掌】</span>
                <h3 className="text-2xl md:text-3xl font-serif text-[#e0d7cc] tracking-widest mt-1">
                  天命在我，改元开天！
                </h3>
                <div className="w-24 h-px bg-gradient-to-r from-transparent via-[#c4a052]/40 to-transparent mx-auto mt-2.5" />
              </div>

              <div className="bg-black/80 p-5 rounded-sm border border-[#c4a052]/20 max-h-[350px] overflow-y-auto pr-2 text-xs md:text-sm leading-loose text-[#e0d7cc]/90 space-y-4 antialiased custom-scrollbar">
                {loading ? (
                  <div className="py-20 flex flex-col justify-center items-center space-y-4">
                    <div className="w-10 h-10 border-4 border-[#c4a052]/10 border-t-[#c4a052] rounded-full animate-spin" />
                    <p className="text-[#c4a052]/80 font-mono tracking-widest text-[10px] animate-pulse">大晟阁臣正秉红烛书默天威圣诏...</p>
                  </div>
                ) : (
                  storyResult.split("\n\n").map((chunk, index) => (
                    <p key={index} className="indent-8 hover:text-[#e0d7cc] transition-colors leading-relaxed text-justify">
                      {chunk}
                    </p>
                  ))
                )}
              </div>

              {!loading && (
                <div className="pt-2 text-center space-y-4">
                  <div className="bg-black/80 p-3 rounded-sm border border-[#c4a052]/10 inline-block text-[11px] font-mono text-[#c4a052]/90 space-x-4">
                    <span>👑 开局安康: <strong className="text-red-400 font-serif">{stats.health}</strong></span>
                    <span>💰 开局国库: <strong className="text-[#e0d7cc] font-serif">{stats.treasury.toLocaleString()}两</strong></span>
                    <span>🛡️ 帝威权威: <strong className="text-blue-400 font-serif">{stats.authority}</strong></span>
                    <span>🌟 江山名望: <strong className="text-purple-400 font-serif">{stats.prestige}</strong></span>
                    <span>🌀 社稷稳定: <strong className="text-emerald-400 font-serif">{stats.stability}</strong></span>
                  </div>
                  <p className="text-xs text-[#c4a052]/60 italic font-serif leading-relaxed">
                    “臣民九叩首，御林千声啸：万岁，万岁，万万岁！改元【${eraName}】，开天立地！”
                  </p>
                  <button
                    onClick={() => onComplete(playerName, eraName, stats)}
                    className="w-full py-3.5 bg-[#c4a052] text-black text-xs tracking-widest uppercase font-bold hover:bg-[#d4b062] transition flex items-center justify-center gap-2 rounded-sm shadow-xl cursor-pointer"
                  >
                    <Shield className="w-4 h-4 text-black animate-pulse" />
                    正式御极临朝 · 听政大晟
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
