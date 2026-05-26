import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { INITIAL_CHARACTERS } from "./src/data";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Google GenAI ONLY if key is present
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Successfully initialized Gemini AI Client.");
  } catch (err) {
    console.error("Failed to initialize Gemini AI Client:", err);
  }
} else {
  console.warn("GEMINI_API_KEY notice: Running in offline/fallback mode. Game will use beautiful preset storytelling templates.");
}

// Prompt injection guidelines for Gemini to prevent AI clichés and repetitions.
const GAME_SYSTEM_PROMPT = `
你是一个专为全男后宫文字游戏（全男文游）设计的高级剧本作家与古风叙事引擎。
本世界观中【只有男性，且具有男性生子（男体孕育）繁衍后代的独特设定】。主控为当朝大晟国年轻皇帝，可攻略角色全为各具尊严与宿命的男子。

请严格遵守以下【生文规则】：
1. 绝对不允许照搬、生硬提及或复述玩家或是系统所给出的技术性提示词（如“双性”、“第四面墙”、“系统”、“数值”、“攻略对象”、“NPC”等），这会彻底破坏沉浸感和第四面墙。请使用优雅、纯正、极其考究且沉浸的古代宫廷、历史或情感性词汇，如“男身孕产”、“诞育麟儿”、“侍寝进御”、“翻牌龙恩”、“临幸”等。
2. 辞藻描写必须千人千面，极力避免AI感常用的生硬套路（如泛滥使用“绝美”、“如雕刻般”、“闪烁着...光芒”等陈词滥调）。前文用过的环境、动作、眼神、气息描写在短期内严禁重复出现，要求刻画具体行为表情和微表情。
3. 严格遵循每一个人物的设定、心路历程、位分高低和性格神态，严禁人物性格和名字出现出入：
   - 南璟云: 贴身暗卫，由于家世惨痛，用血肉铺平帝王登基之路，内向卑微、极度崇拜忠诚，受宠时羞涩自抑，称奴侍夜。
   - 甘言旭: 正一品文官嫡子，位封雅气贵人，饱读诗书，优雅傲岸，清冷自守，注重文士风骨。
   - 顾书煜: 九品县丞庶子，位封答应，天真软糯，常被忽视，极度害怕也渴望帝王哪怕一瞬间的抚摸和关爱。
   - 朱念熹: 巨商世家，位封答应，丹凤眼，狡黠机敏，眼波流转处极尽生财与承宠的主动，骄阳似火。
   - 萧鹤贤: 潜邸侧福晋、现封正君。家世显赫。性格暴厉跋扈、独占欲猛烈，爱醋却对皇帝抱有飞蛾扑火的纯粹爱恋。
   - 柳明澈: 潜邸格格、现封常在。幽闭清凉，寡言本分，以奇异香料诱佐皇眠，情动时如草药在细火中煎熬，缠绵深执。
   - 谢燕回: 执掌三军的凯旋大将军，现赏正君。桀骜不羁，粗人粗语，不懂亦不屑世俗缛节，哪怕屈身皇榻仍有驰骋风姿。
   - 明痕: 15岁战败毓国落难皇子，质子入宫。极度娇嫩无知，颤栗无助，在亡国之痛与求生之欲间战兢哭泣，宛若折翼雏雁。
4. 位分等级：君后（唯一）、贵君、正君、卿、贵人、常在、答应、官男子。

请以典雅、缠绵悱恻、充满历史厚重与暗流涌动的古风半白话（类似精修网文）来进行剧情连缀和对话，段落间适当留白，增强戏剧张力。
`;

// Helper: safe Gemini call or fallback
async function generateStoryWithGemini(prompt: string, fallbackText: string): Promise<string> {
  if (!ai) {
    return fallbackText;
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: GAME_SYSTEM_PROMPT,
        temperature: 0.85,
      }
    });
    return response.text || fallbackText;
  } catch (error: any) {
    console.error("Gemini Generate Error:", error);
    return fallbackText + `\n\n（大内起居注手记：${error?.message || "天道紊乱，御前研墨生烟..."}）`;
  }
}

// Endpoint: Backstory stage text response
app.post("/api/backstory-choice", async (req: Request, res: Response) => {
  const { choiceId, choiceText } = req.body;
  
  const prompt = `
  背景：大晟国新皇(即主控)刚刚跨过血色夺嫡。他虽满怀圣贤文采与纯至孝心，却在先帝床前遭到大皇子（大阿哥）的狠辣污蔑、百官猜嫌。
  转折与功臣：
  在百死一生之际，玩家做出了选择：“${choiceText}”。
  随之，贴身死士南璟云不惜九死一生，挥刀率死士闯入大皇子府邸，肃清乱逆，跪呈玉玺于陛下膝前。
  与此同时，你在潜邸的侧室——将门长子萧鹤贤在前朝布下天罗地网，四处宣扬政敌三阿哥欺君枉法的桩桩丑闻，彻底瓦解了三皇子余党的脊梁。
  
  请为本游戏的【终极序幕 · 浴血登基】生成一章400-600字、具有极端史诗画面感与爱恨交织的剧情终章描写。
  叙事中必须体现南璟云身披玄铁重甲沾染猩红的跪求，以及萧鹤贤红绸华服却冷眼倾轧仇敌的傲慢风采。描写须荡气回肠，不落俗套，切忌陈词滥调。
  `;

  const fallback = `
  大晟昭武元年，血色笼罩了先帝龙寝。你怀抱经天纬地之才，却被长兄诬陷，几遭幽禁。
  生死一发之际，你咬牙发出密旨。深夜惊雷中，你的贴身暗卫南璟云率精骑铁马，悍然踏碎了大皇子府邸的重重铁甲。那一夜，他身上添了十七道刀伤，冰冷的雨水混着血浆自他玄黑铁面具下滴落，他双手呈上染血的降书与传国玉玺，深深叩首，声音微带战栗：“臣南璟云，不负圣恩，太子党满九族已除，承请陛下登龙基！”
  而在前朝文官之所，侧福晋萧鹤贤金蝉脱壳，用他萧督军府的泼天富贵做局，一夕之间将三阿哥通敌叛国的绝密丑行，化作漫天血字飞散京畿茶馆与衙门之手。百官哗然，三阿哥府邸群龙无首，再无还手余地。
  东风席卷，天光破晓，乾清宫重九之门缓缓打开。你踏着血洗的汉白玉金阶，在百官和后妃的匍匐哀泣中，正式御极天下。
  `;

  const result = await generateStoryWithGemini(prompt, fallback);
  res.json({ text: result });
});


// Endpoint: character interaction story generator
app.post("/api/character-action", async (req: Request, res: Response) => {
  const { character, actionType, playerInput, playerStats } = req.body;
  
  let dynamicPrompt = "";
  let fallback = "";

  if (actionType === "summon") {
    // 翻牌侍寝
    dynamicPrompt = `
    情景描述：
    大晟夜色已深，龙涎香温。
    年轻大帝（主控）今夜在寝殿【翻牌子侍寝】，临幸的男妃是：【${character.name}】（位分：${character.bitfen}，性格：${character.personality}）。
    他们的关系现状是：${character.relationshipHistory.slice(-1)[0] || "深宫数载"}。
    玩家发出的温存或调弄指示（如有）：“${playerInput || "今夜愿与之秉烛夜谈，共诉衷肠，享受鱼水缠绵"}”。

    请严格恪守男妃性格与卑微/高傲的风骨（比如如果是暗卫南璟云，他即使在龙榻上也自称奴，因背负家族磨难而既温顺无余又惶恐；若是萧鹤贤，则是极其缠绵霸道，吃着闷醋又要将你占领；若年轻的明痕，必定是十五岁哭啼求全、柔弱发颤；若是谢燕回将军，则是豪放傲气中带着无法退却的粗鲁狂野情欲）。
    
    重点：描写在全双性/男性生育世界观中的鱼水极乐和肌肤厮磨，多刻画人物面庞微红、喘息、以及彼此眼波中深藏的宿命与爱念。字数500字左右。避免空洞的词句，多描写具体的拉衣摆、咬嘴唇、隐忍咬痕、微指尖游走等小细节。
    `;

    // fallback mapping based on characters
    fallback = getDefaultSummonText(character);
  } else if (actionType === "chat") {
    // 一起闲聊谈心
    dynamicPrompt = `
    情景描述：
    午后御花园或偏殿的一隅，香雪漫天。
    大皇（主控）正与【${character.name}】（位分：${character.bitfen}，性格：${character.personality}）并肩而立。
    皇帝随口提及或动作：“${playerInput || "随口问问他的身体和近况，并握握他的手谈天说地"}”。
    
    请写一段约400字的静谧唯美古风对话与内心戏，展示男妃对皇帝的深深爱慕、不愿给皇帝带来朝前压力却欲语还休的真实心理，注重凸显其背景家世（例如南璟云寄钱救家弟，甘言旭清雅的风骨）。
    `;
    fallback = getDefaultChatText(character, playerInput);
  } else if (actionType === "gift") {
    // 赏赐礼物
    const giftName = playerInput || "玲珑八宝盒与上等野山参";
    dynamicPrompt = `
    情景描述：
    帝王下诏，赐赏男妃【${character.name}】（位分：${character.bitfen}）。
    所赐御物为：【${giftName}】。
    
    请生成一段300字左右的接旨跪谢恩典场景，描写该男妃看到贡品时的复杂情绪和温顺感佩。
    注意：顾书煜会因为罕见关切而感动得直抹眼泪；柳明澈可能闻到香药材而眼中闪耀惊奇的爱意；朱念熹生于富贵，可能精明地抿唇一笑，大胆抛了媚眼低声道谢。
    `;
    fallback = `【${character.name}】双膝跪于青砖之上，俯首接旨：“臣妾（臣）叩谢陛下圣恩！陛下万岁万岁万万岁。”接过了【${giftName}】，他的脸上浮现出温暖与悸动，指尖摩挲着锦盒，轻轻抬眼望你，眼神里满是几乎要满溢出来的缱绻情意。`;
  } else if (actionType === "promote") {
    const { oldBitfen, newBitfen } = req.body;
    dynamicPrompt = `
    情景描述：
    雷霆雨露皆是君恩。天子下诏，正式颁布明旨！
    男妃【${character.name}】由原先的【${oldBitfen}】晋升（或降级）至：【${newBitfen}】。
    
    请写一段400字的内务府宣旨、授封玺印或是男妃谢恩的盛大仪式感剧情片段。重点展示他听到这一位分变动时的心潮起伏——若是南璟云晋封，他是否惶恐自己暗卫出身不配此位，若是萧鹤贤，他是否为自己名分又高了一层而露出得意骄纵的亮眼容光。
    `;
    fallback = `内廷大太监高喝：“奉天承运，皇帝诏曰。常在${character.name}，温婉有度，侍宿有功，深得朕心，即日起晋封为【${newBitfen}】！赏东海明珠十颗，蜀锦两匹，钦此——”\n\n${character.name}一席华服，面色红晕，双手过顶接过玉玺与封诏，眼眶微湿地仰视你：“臣（妾）蒙陛下厚爱，必日夜潜身反省，伺候皇上，万死不辞。”`;
  } else if (actionType === "pregnant_birth") {
    // 生产诞下皇子
    dynamicPrompt = `
    情景描述：
    后宫惊呼，金盆水乱。
    【${character.name}】（位分：${character.bitfen}）于偏殿之中，历经一夜的腹痛与嘶哑低喘，终于为你（大帝）平安诞下了一名男胎——大晟国的健康皇子。
    
    本全男双性世界观中，男子以腹中胞宫诞育子嗣。请生动而极富爱恨与皇权宿命感地写下这一幕产床边的温馨、血丝与汗水交织、以及皇帝冲进帷帐、握紧他冷汗涔涔的指尖，低语赏赐的感人画面。400字左右。
    `;
    fallback = `产殿里红烛摇曳，铜盆碰撞声不决。经历了一整夜痛苦至极的低喘与汗水浸泡，${character.name}苍白近乎透明的指尖死死拽住明黄的床帐，在帝王焦灼探视、冲入罗帏的瞬间，终于传来了一声响亮的清脆啼哭。接生太监狂喜大喊：“恭喜皇上！${character.name}主子于今日黎明顶风，为圣上平安诞下一位身底健康、龙姿卓越小皇子，母子均安！”\n\n你紧紧握住他汗冷无力的手掌，只见平日或是桀骜、或是清冷的他此刻虚脱至极，长睫半垂悬泪，望向你与襁褓，颤着细语：“陛下……臣没有辱没您的血脉……看，他是您的骨肉……”`;
  }

  const result = await generateStoryWithGemini(dynamicPrompt, fallback);
  res.json({ text: result });
});

// Endpoint: dynamic free story builder - visual novel text continue
app.post("/api/story-continue", async (req: Request, res: Response) => {
  const { playerInput, currentContext } = req.body;
  
  const prompt = `
  大晟昭武天下！
  玩家（皇帝楚明熙）发出的全新游戏探索、随性剧情或对话指令：
  “${playerInput}”
  
  当前后宫及朝纲概况：
  - 国库：${currentContext.treasury || 200000}两
  - 帝威/权力度：${currentContext.authority || 80}
  - 年代：昭武${currentContext.year || 1}年 ${currentContext.month || 1}月
  
  请基于上述大晟国后宫设定，顺承玩家刚才突发奇想的输入“${playerInput}”，写出一段极具交互感、文笔考究、字数在500-700字之间的精彩小说续文。
  续文里要适当带入一些后宫人物（如萧鹤贤、南璟云等）的态度或朝廷反应，并在文章末尾给玩家【留下2到3项既具有戏剧性深意、又影响具体国力数值或男妃好感的后续帝王抉择】（请在末尾以“陛下，您接下来打算：”为引领，并用方括号标注选项）。
  `;

  const fallback = `
  你发出了宏大之旨，下诏百官御林。正值昭武年间，皇宫内风物繁复，各处宫宇惊鸿叠显。
  
  后宫耳聪目明，听闻你的号令，萧鹤贤在正阳宫轻摔了一只青玉盏，酸意横生：“皇上真真会寻快活，倒把大将军府和本宫的一腔期盼丢在了御花园荒草里。”而南璟云则默默垂首侍候在养心殿廊落之下，指尖死死陷进佩剑柄上的护穗。
  前朝甘大人更是针对此事呈递了密折，劝讽陛下万万注重社稷，爱惜龙体。大内红叶纷纷，你立于高台远眺，只觉天道莫测，万乘之君，亦有无数红尘乱丝缠身。
  
  陛下，您接下来打算：
  【A】 传召甘大学士之子甘言旭来御书房研墨拂尘，安抚清流文官官声（甘言旭好感增加，国库消费微量）
  【B】 赏赐大笔金银布匹给劳苦功高的将军谢燕回与吃着陈醋的萧鹤贤（萧鹤贤、谢燕回好感增加，国库-30000两）
  【C】 独自微服私访潜入暗营，悄悄将披着玄重铁甲、满身汗湿正自加苦练的暗卫南璟云拖在大内深帐中（南璟云好感大幅上升，帝王体虚健康-5）
  `;

  const result = await generateStoryWithGemini(prompt, fallback);
  res.json({ text: result });
});


// Fallback generator helper functions to make the game robust online or offline:
function getDefaultSummonText(character: any): string {
  switch (character.id) {
    case "nanjingyun":
      return `深宫寒蝉渐定，大帐内红烛明灭。南璟云卸下了那一身冰冷的玄铁暗卫重甲，长发垂落，仅着一袭素净白绢里衣，不安地跪在龙榻下的织锦地毯上。由于他自小受尽了颠沛生活与主仆重规，每当你温暖的掌心敷上他的脖颈，他全身的肌肉都会敏感而压抑地战栗。“陛下……奴罪身贱骨，不配圣上如此爱惜。”他咬紧薄唇，强忍眼尾一抹猩红的情欲，任由你扯住他的里衣系带将他拉入明明晃晃的被褥中。床帏晃动，他低喘着伸出满是刀茧的手臂，有些颤抖地环住了你的肩背，一滴滚烫的泪水融入你赤裸的脖子，沙哑而泣：“璟云……璟云今夜这条命，都是皇上的……”`;
    case "ganyanxu":
      return `幽静香阁内。甘言旭正坐在乌木案几前，膝上横着一管古琴。见你深夜入内，他连忙起立长揖，言谈举止间自带一派钟鸣鼎食之家的温润礼度。然而今夜，你是来行进御翻牌之欢。灯火被你亲手挑熄，他清高孤傲的文人傲骨被剥落无余。里衣宽松退去，露出他瓷白精致的主骼，他耳廓染红，清冷的面庞侧过一旁，有些不甘示弱地抿抿唇，低头低唤：“臣甘言旭……侍候皇上尊安。”龙榻之上，即使承受你霸道的占有与索取，他也死死咬牙不肯发出失礼的叫声，唯有鼻音中压碎的一两声难抑的低吟，以及因极致动情而紧紧揽住你腰肢的极美弧线，才泄露了他那颗早已为你沦陷的书生儒心。`;
    case "gushuyu":
      return `偏殿狭小而寂静。答应顾书煜见你驾临，惊惶得当场跌下板凳，慌乱间甚至扯了桌布，磕头不已。你失手将这个战栗的小家伙捞至怀中，只觉他纤细如幼荷。进了红纱帐里，他脸埋在你宽阔的明黄睡袍中，泪眼朦胧：“陛下，您真的……没嫌弃煜儿鄙陋，来看煜儿了么？”他乖顺得完全不设一丝一毫防备，任凭你在其柔白无骨的身子上留下一道道暗红的淤痕。侍寝时，他小口吐着温热的气息，因受宠若惊而拼尽一切主动迎合你。他几乎是将你当作了整座冰冷宫墙内唯一的救赎和浮木，哭咽着交托出了一切尊严与骨肉。`;
    case "zhunianxi":
      return `斜玉台，珍珠金帘叮当。答应朱念熹一双流盼媚世的丹凤眼，借着重重红绡夜灯，挑逗自如。他穿着华贵的镂金薄纱戏袍，手里端着温好了的绍兴雕酒，大着胆子一屁股落在你的大腿之上，口吐香气：“皇上，今晚内廷可曾盘算过？臣妾（臣）朱氏商帮的一箱箱奇货宝珠都抵不过念熹身子暖和呢。”龙榻缠绵之时，他最懂怎样将商贾之小聪明化为春帷内的百般痴缠。他白皙修长的大腿紧死纠缠上你的龙腰，一双丹凤眼角泛着盈盈水雾，低头啃咬着你的耳垂，一边放浪地娇喘发出酥软入骨的低吟，一边大胆引逗你进入那处能承喜孕嗣的温热胞宫，直至殿内水气袅袅，两人极乐方休。`;
    case "xiaohexian":
      return `坤和殿中醋意滔天，你一踏入正殿，铺天盖地的鎏金香炉盖便被横着丢在脚下。正君萧鹤贤眼眶猩红地指着你：‘走，陛下既然惦记着那起刚会勾引圣驾的小作秀，又踏回我这儿做甚！’然而，当你微愠地一把揽住他的雄健龙腰，将他狠狠按在雕花大床深处时，这个王府出身、性烈如火的雄鹰瞬间融化在你的身下。‘混账……你弄疼本宫了……’他沙哑着大骂，眼泪却夺眶而出。欢爱极浓处，他的狂野不羁尽数服帖，滚烫的眼泪落入脖颈，十指狠捏入你的背肉，带着哭腔近乎祈求：‘楚明熙……你若真有一天把本宫也丢在一边，我倒不如直接死在漠北战马之下……再要几下，给本宫诞个孩子，好歹让萧家有根！’`;
    case "liumingche":
      return `偏殿夜凉。柳明澈的居室内果然散发着一缕叫人昏昏沉沉、骨酥肉麻的奇特熏香。他跪迎在榻侧，依旧是一双波澜不惊的沉静眸子，只在望见你发红的衣襟时，眉骨极微地缩了一下。这一缕香在温热的锦衾内彻底燃开。他看似寡言规矩，却被你粗暴搂入胸膛后展现出令人近乎嗜入骨血的绵密顺从。他甚至会从枕下摸出自己特制、有助于大补育嗣的秘香贴，轻轻按在你的腹下，温凉的手心抚摸你。在床帷交错的那场沉闷纠葛里，他就像一枚在深山里开到烂透的辛荑花，一声不吭地承受着你凶狠的鞭笞和灌注，只有额头细密的汗珠和颤栗抓烂棉被的指腹，诉说着对你几乎扭曲的占有。`;
    case "xieyanhui":
      return `承乾主殿。大将军谢燕回纵使在龙榻之上也是一副无法无天的吊儿郎当模样。衣扣被拉开，他露出那线条完美、蕴含无穷爆发力、还带着边关黄沙和陈伤疤痕的健硕男体。他豪爽冷哼一声：‘皇上，你折腾百官把臣扣在金凤暖炉里，就为了像揉弄那些娇弱男宠一样折腾臣？’但当你的力量将这位万人之上的谢燕回在大床深处蛮横压制的时候，他眼中闪过惊怒，随后激发起满口灼热而又野性的喘息和低笑。他咬着你的嘴唇反客为主，哪怕你将他的双手反剪到床柱上，他一双鹰隼般的眼眸也一刻不离地死掐住你：‘陛下好生玩着，臣的骨肉在战场上能御乱，若是在圣驾这龙榻胞宫里怀了种，也必是能杀蛮夷的主！’那股骨子里的沙场放荡与粗鲁迎合，教人血脉喷张。`;
    case "minghen":
      return `幽静暖阁，空气中都仿佛带着那个十五岁战败国皇子的恐惧颤粟。明痕几乎是被小太监们用红绸毯子干净包裹着抬到养心殿东暖阁龙榻上的。他小小白白的一团，在发现你踏上前来的一刹那，吓得拼命用细胳膊往内墙角缩，浑身发病般地战抖不止。当龙床罗帏扯死落下，你强行拽住他的细细脚踝将他拽回怀中。‘陛下……求皇上赏罪……阿痕怕……’他清涩之极，眼里蓄满了豆大的清泪。对床事根本一窍不通。当你探入底角，他痛得一声惨叫，细嫩的嗓子都变了调，手指在你的肩膀上胡乱抠抓，宛如被撕碎的雏雁，在极度的惶恐与初尝人事之痛中哭得几欲昏厥，最终在你的软语轻哄与疯狂给予里，带着家国破灭的绝望沉沉哭晕在你的胸口。`;
    default:
      return `大内春夜，风动帷帐。你与可攻略角色宿命交织，大享床帏临幸之欢，情至深处，缠绵不休。`;
  }
}

function getDefaultChatText(character: any, playerInput: string): string {
  const pInput = playerInput || "闲极对奕";
  switch (character.id) {
    case "nanjingyun":
      return `凉风拂面。南璟云局促地站在回廊暗处，直到你向他招招手，他才低着头有些受宠若惊地挪步走至石桌旁。听你谈起国事近来波澜大定，他深深叩首：“陛下万岁。奴不敢多言别事，只要陛下圣体金安……暗卫营有奴在，便没有一个叛臣能活着踏入养心殿的一里范围内。”你握住他布满长年练武重伤的老茧手，他面颊飞红，极其羞自地低下头，指尖轻勾着你的龙袍袖口，悄声汇报着远方弟弟的医药事，眼中有一波微澜的水温。`;
    case "ganyanxu":
      return `古松参天，甘言旭取琴抚了一弹，听到你的评述，不由抚掌微叹：“皇上此论高瞻远瞩，大出文渊阁百官之右。臣言旭叹服。”他眼中有着清高的文人对明君相知相许的炽热与傲骨。他亲手端来碧绿的新茗递于你：“听闻前朝两江多有议论，皇上为此案劳神多日。言旭在宫内不能分君忧，实是羞赧。陛下，今日切不可再过操劳，且饮了此盏，多歇歇神吧。”情义悠长。`;
    case "gushuyu":
      return `小径红桃满落。顾书煜小心翼翼地捧着一大盘刚从御膳房讨来的剥好荔枝，两手因局促在围裙上死命揪着，不知所措地低头：“臣、答应顾书煜叩见主子……皇上……您今天累不累？煜儿听说皇上这两天龙体不大舒适，特意求了太医要了清火的方子，煜儿天天在小火炉旁给您炖着燕窝，不知合不合口……”他一双亮晶晶含泪的眼眸期期艾艾地盯着你，被你顺势揽过抱坐到石椅上，欢喜的全身都在发软。`;
    case "zhunianxi":
      return `倚着假山红枫折花，朱念熹正懒着身子把玩一把翠玉京制小折扇。一见龙驾，他双瞳一紧，大着胆子摇着折扇走上跟前来，一礼未闭，就一把抓住你的手掌，媚眼一飘低斥：“哎呀，皇上还认得去微臣宫里的小路？我还以为皇上早就被那萧家大老虎给关得死死的了。”他半是抱怨半是勾引地凑近前：‘奴家给陛下算了一笔账。今年江南丝贡，朱氏商号多帮国库漏税平了三百万，皇上可真舍得就让臣妾当个小小答应？多宠臣妾几回，臣妾去老祖宗那让朱家多出点军饷……’极尽娇俏机诈。`;
    default:
      return `${character.name}眼中水波微漾，与陛下您并肩站立在朱砂花墙之下。他轻轻颔首，细声细气地诉说着满腹的缱绻与依宠，言谈里透露出对陛下的深深崇敬。`;
  }
}



// Simple API to get Initial Characters list
app.get("/api/characters", (req: Request, res: Response) => {
  res.json({ characters: INITIAL_CHARACTERS });
});

// Setup Vite Dev Server / Static files (Vite integration for development)
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server mounted as middleware.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static file index.html in production mode.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Lan Yan Huo Shui / 蓝颜祸水] Full-stack Server successfully running at local host port http://localhost:${PORT}`);
  });
}

startServer();
