import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield, Sparkles, Feather, Swords, Flame, Sparkle } from "lucide-react";

interface BackstoryProps {
  onComplete: (playerName: string, eraName: string) => void;
}

export default function Backstory({ onComplete }: BackstoryProps) {
  const [playerName, setPlayerName] = useState("楚明熙");
  const [eraName, setEraName] = useState("昭武");
  const [step, setStep] = useState(1);
  const [choiceMade, setChoiceMade] = useState<string | null>(null);
  const [storyResult, setStoryResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Background narration steps
  const introParagraphs = [
    `大晟国历四百二十三年。唯男子孕育育子、延续血脉的无垠神陆上，皇权更替，风卷残云。`,
    `你，乃是大晟国行事磊落、饱读圣贤孤傲才气的四皇子【${playerName}】。你积累多年的盖世才学与仁孝之心，受尽了朝臣称道、先帝偏爱。然而，木秀于林，风必摧之。在先病龙床将崩的关键时刻，你最为敬重最是温厚的大哥，却悍然在御榻前对你布下了惊天诬陷。`,
    `“四弟狼子野心，结党营私，于潜邸私纳异国质子、暗中圈养带甲死士，其罪，当诛！”大哥声色犬马的谗言如钢钢利刃，将你推向万劫不复的夺嫡深渊。先帝龙颜大怒，吐血重病，百官离心，一夕之间，你竟成了密谋通敌叛国的逆贼！`,
  ];

  const handleChoice = async (optionId: string, optionText: string) => {
    setChoiceMade(optionId);
    setLoading(true);
    try {
      const res = await fetch("/api/backstory-choice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choiceId: optionId, choiceText: optionText })
      });
      const data = await res.json();
      setStoryResult(data.text);
    } catch (e) {
      // In case of error, the backend API fallback handles it
      setStoryResult(`【血染金鸾，大位始定】\n你下定决心全力突围。深夜暴雨，贴身死士南璟云身上挂了十几道重刀伤，拼命血洗了大皇子的王府，为你呈递带血降书。萧鹤贤则发动了萧大将军督军之府的滔天势力，将三皇子的流言秽事化作红纸飞满京华，令天意反噬。百官匍匐，高呼万岁，长路染红，在哭天抢地的韶乐声里，你逆流而上，御极九五！`);
    }
    setLoading(false);
    setStep(3);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#e0d7cc] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-serif">
      {/* Immersive Theme radial gradient overlays */}
      <div className="absolute inset-0 opacity-25 pointer-events-none bg-[radial-gradient(circle_at_50%_30%,#5c1a1a_0%,transparent_70%),radial-gradient(circle_at_80%_80%,#c4a052_0%,transparent_50%)]" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#5c1a1a] via-[#c4a052] to-[#5c1a1a] opacity-80" />
      
      {/* Aesthetic border frames of the palace chamber */}
      <div className="hidden md:block absolute inset-6 border border-[#c4a052]/20 rounded-sm pointer-events-none" />
      <div className="hidden md:block absolute inset-8 border border-[#c4a052]/5 rounded-sm pointer-events-none" />

      <div className="max-w-2xl w-full relative z-10 bg-black/60 backdrop-blur-md border border-[#c4a052]/30 p-8 md:p-12 rounded-sm shadow-2xl">
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
                <div className="h-px bg-gradient-to-r from-transparent via-[#c4a052]/30 to-transparent my-6" />
              </div>

              <div className="space-y-4">
                <p className="text-[#e0d7cc]/90 leading-relaxed text-sm bg-black/40 p-4 border-l-2 border-[#c4a052]/60 rounded-r">
                  “帝星明灭，先皇大限将至。深宫血风将起，陛下，您的名讳与登位年号即将载入《起居注》大册。”
                </p>
                
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="block text-xs text-[#c4a052] uppercase tracking-widest font-mono mb-2">天子御讳 (主控名称)</label>
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
                    <label className="block text-xs text-[#c4a052] uppercase tracking-widest font-mono mb-2">开国即位年号</label>
                    <input
                      type="text"
                      maxLength={6}
                      className="w-full bg-black/80 border border-[#c4a052]/30 text-[#e0d7cc] px-4 py-2.5 rounded-sm focus:outline-none focus:border-[#c4a052] text-sm tracking-widest font-serif"
                      value={eraName}
                      onChange={(e) => setEraName(e.target.value)}
                      placeholder="如：景和、绍统、昭武"
                    />
                    <p className="text-[#c4a052]/50 text-xs mt-1 italic">默认为“昭武”，如：【昭武元年】</p>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={() => setStep(2)}
                  className="w-full py-3 bg-[#c4a052] text-black text-xs tracking-widest uppercase font-bold hover:bg-[#d4b062] transition duration-200 active:translate-y-px rounded-sm shadow-lg shadow-[#c4a052]/10"
                >
                  翻阅起居注 · 昭命乾坤
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <span className="text-[#c4a052] text-xs font-mono tracking-[0.2em] uppercase">【第一卷 · 夺嫡风砂】</span>
                <h2 className="text-xl text-[#e0d7cc] mt-1 font-serif tracking-widest">九重天宫 宿命交织</h2>
                <div className="w-16 h-px bg-[#c4a052]/40 mx-auto mt-2" />
              </div>

              <div className="space-y-5 text-[#e0d7cc]/90 font-serif leading-relaxed text-sm max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {introParagraphs.map((par, i) => (
                  <p key={i} className="indent-8 hover:text-[#e0d7cc] transition-colors">
                    {par}
                  </p>
                ))}
                
                <p className="indent-8 text-[#c4a052] font-light bg-[#5c1a1a]/10 p-4 rounded-sm border border-[#c4a052]/20">
                  龙床前的残灯暗夜下，寒甲带声，大哥的诡谲狞笑与群臣冷眼形成死局。在这最后一发千钧的刹那，你瞥见暗卫统领南璟云握死在剑柄上的青筋，与萧鹤贤从侧殿寄进的飞鸽密信！你将写就一道死命……
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-4">
                <button
                  onClick={() => handleChoice("opt1", "重赐宿命：将天子禁军兵印投入深影，密令璟云‘不恤万死血洗大皇府’；命鹤贤在前朝撕毁三皇子的清名屏障")}
                  className="w-full text-left p-4.5 bg-black/60 hover:bg-black border border-[#c4a052]/20 hover:border-[#c4a052] rounded-sm text-[#e0d7cc] hover:text-[#c4a052] text-xs md:text-sm transition duration-200 flex items-start gap-3"
                >
                  <Swords className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold block mb-0.5 text-[#c4a052] text-xs font-serif tracking-wider">抉择【甲】 · 利刃血踏龙门</span>
                    <span className="opacity-80">掷下密旨虎符，由璟云铁血绞杀，萧鹤贤四散流言废黜其脊椎。</span>
                  </div>
                </button>

                <button
                  onClick={() => handleChoice("opt2", "哀兵血陈：在先皇龙椅前割血立誓表其儒贤宏量，为门外璟云大军和鹤贤的流言布防，阻取绝佳的光阴")}
                  className="w-full text-left p-4.5 bg-black/60 hover:bg-black border border-[#c4a052]/20 hover:border-[#c4a052] rounded-sm text-[#e0d7cc] hover:text-[#c4a052] text-xs md:text-sm transition duration-200 flex items-start gap-3"
                >
                  <Feather className="w-5 h-5 text-[#c4a052] mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold block mb-0.5 text-[#c4a052] text-xs font-serif tracking-wider">抉择【乙】 · 贤王清君正名</span>
                    <span className="opacity-80">大殿咳血长啸，在大义上震摄大哥与百官，争取最后一瞬夺位时机。</span>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <div className="text-center">
                <span className="text-[#c4a052] text-xs font-mono tracking-[0.2em] uppercase">【万乘初定 · 御天下】</span>
                <h3 className="text-2xl md:text-3xl font-serif text-[#e0d7cc] tracking-widest mt-2">
                  天命在我
                </h3>
                <div className="w-24 h-px bg-gradient-to-r from-transparent via-[#c4a052]/40 to-transparent mx-auto mt-3" />
              </div>

              <div className="bg-black/80 p-6 rounded-sm border border-[#c4a052]/20 max-h-[380px] overflow-y-auto pr-2 text-xs md:text-sm leading-relaxed text-[#e0d7cc]/90 space-y-4 antialiased custom-scrollbar">
                {loading ? (
                  <div className="py-20 flex flex-col justify-center items-center space-y-4">
                    <div className="w-10 h-10 border-4 border-[#c4a052]/10 border-t-[#c4a052] rounded-full animate-spin" />
                    <p className="text-[#c4a052]/80 font-mono tracking-widest text-[#10px] animate-pulse">大内史官正秉烛书墨天威奇情...</p>
                  </div>
                ) : (
                  storyResult.split("\n\n").map((chunk, index) => (
                    <p key={index} className="indent-8 hover:text-[#e0d7cc] transition-colors leading-relaxed">
                      {chunk}
                    </p>
                  ))
                )}
              </div>

              {!loading && (
                <div className="pt-4 text-center space-y-4">
                  <p className="text-xs text-[#c4a052]/60 italic font-serif">
                    “百官九叩，大内禁卫齐啸：山呼万岁。终极天下，唯陛下永治。”
                  </p>
                  <button
                    onClick={() => onComplete(playerName, eraName)}
                    className="w-full py-3.5 bg-[#c4a052] text-black text-xs tracking-widest uppercase font-bold hover:bg-[#d4b062] transition flex items-center justify-center gap-2 rounded-sm shadow-xl"
                  >
                    <Shield className="w-4 h-4 text-black animate-pulse" />
                    登临太和 · 听政乾坤
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
