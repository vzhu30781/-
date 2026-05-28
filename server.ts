import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { INITIAL_CHARACTERS } from "./src/data";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" })); // Support large base64 uploads
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/assets", express.static(path.join(process.cwd(), "assets")));

const DB_FILE = path.join(process.cwd(), "src", "db_records.json");
const UPLOADS_DIR = path.join(process.cwd(), "assets", "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

interface DBContent {
  characters: any[];
  systemNotice: string;
  storyOverrides: Record<string, string>;
}

function loadDB(): DBContent {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed.characters && Array.isArray(parsed.characters) && parsed.characters.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to read server_db.json, recreating...", err);
  }

  const initial: DBContent = {
    characters: INITIAL_CHARACTERS,
    systemNotice: "陛下龙体安康！大内世系与全男后宫画册库升级为动态连线，任何更改将实时分发大晟，随时恭迎皇上圣笔御批和立绘绑定！",
    storyOverrides: {}
  };
  saveDB(initial);
  return initial;
}

function saveDB(content: DBContent) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(content, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write server_db.json:", err);
  }
}

function saveBase64Image(base64String: string, filename: string): string {
  try {
    const matches = base64String.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("Invalid base64 string format");
    }
    
    const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
    const imageBuffer = Buffer.from(matches[2], "base64");
    
    // Clean filename
    const safeFilename = filename.toLowerCase().replace(/[^a-z0-9_\-]/g, "") + "_" + Date.now() + "." + ext;
    const filePath = path.join(UPLOADS_DIR, safeFilename);
    
    fs.writeFileSync(filePath, imageBuffer);
    console.log(`Saved uploaded image: /assets/uploads/${safeFilename}`);
    return `/assets/uploads/${safeFilename}`;
  } catch (err) {
    console.error("Failed to save base64 image on server:", err);
    throw err;
  }
}


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

// Helper: safe Gemini call or fallback with rigorous raw language filtering
async function generateStoryWithGemini(prompt: string, fallbackText: string): Promise<string> {
  const sanitizeOutput = (text: string): string => {
    if (!text) return "";
    return text
      .replace(/gemini/gi, "天机阁")
      .replace(/api/gi, "天理")
      .replace(/google/gi, "大晟")
      .replace(/人工智能/g, "起居注")
      .replace(/模型/g, "天演")
      .replace(/提示词/g, "言志")
      .replace(/后台/g, "内阁")
      .replace(/接口/g, "枢纽")
      .replace(/开发者/g, "钦天监")
      .replace(/调试/g, "御笔")
      .replace(/错误代码/g, "天象异动")
      .replace(/error/gi, "天星隐没")
      .replace(/key/gi, "秘玺");
  };

  if (!ai) {
    return sanitizeOutput(fallbackText);
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: GAME_SYSTEM_PROMPT + "\n绝对不能提到 'Gemini', 'API', 'AI', '模型', '调试', '接口', '后台' 等技术词汇，如有犯禁将导致天道崩溃！请用精美古风代替之。",
        temperature: 0.85,
      }
    });
    return sanitizeOutput(response.text || fallbackText);
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    const isQuotaError = errorMsg.includes("429") || 
                         errorMsg.toLowerCase().includes("quota") || 
                         errorMsg.toLowerCase().includes("rate limit") ||
                         errorMsg.toLowerCase().includes("limit exceeded") ||
                         errorMsg.toLowerCase().includes("resource_exhausted") ||
                         error?.status === 429 ||
                         error?.code === 429;

    if (isQuotaError) {
      console.warn("⚠️ [Gemini Rate Limit] Notice: Gemini API rate limit or quota exceeded (429 RESOURCE_EXHAUSTED). Falling back to beautiful preset narrative gracefully without throwing stack traces.");
    } else {
      console.warn("⚠️ [Gemini API Occasional Issue]: Unable to fetch from GenAI directly. Detailed reason:", errorMsg);
    }
    // Suppress technical raw error messages so other players never see words like "Gemini API"
    return sanitizeOutput(fallbackText + `\n\n（大内天机阁随笔：今夜风卷珠帘，星河翻涌。乾坤御笔龙飞，遂成社稷大吉。）`);
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
  
  const db = loadDB();
  const overrideKey = `${character.id}_${actionType}`;
  if (db.storyOverrides && db.storyOverrides[overrideKey] && db.storyOverrides[overrideKey].trim()) {
    console.log(`Using custom administrator story override for ${overrideKey}`);
    return res.json({ text: db.storyOverrides[overrideKey] });
  }
  
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
    
    本全男双性世界观中，男子以腹中胞宫诞育子嗣。请生动而极富爱恨与皇权宿命感地写下这一幕产床边温言热泪的温馨、血丝与汗水交织、以及皇帝冲进帷帐、握紧他冷汗涔涔的指尖，低语赏赐的感人画面。400字左右。
    `;
    fallback = `产殿里红烛摇曳，铜盆碰撞声不决。经历了一整夜痛苦至极的低喘与汗水浸泡，${character.name}苍白近乎透明的指尖死死拽住明黄的床帐，在帝王焦灼探视、冲入罗帏的瞬间，终于传来了一声响亮的清脆啼哭。接生太监狂喜大喊：“恭喜皇上！${character.name}主子于今日黎明顶风，为圣上平安诞下一位身底健康、龙姿卓越小皇子，母子均安！”\n\n你紧紧握住他汗冷无力的手掌，只见平日或是桀骜、或是清冷的他此刻虚脱至极，长睫半垂悬泪，望向你与襁褓，颤着细语：“陛下……臣没有辱没您的血脉……看，他是您的骨肉……”`;
  } else if (actionType === "cold_palace") {
    // 打入冷宫
    dynamicPrompt = `
    情景描述：
    大内深重，天威严酷。
    年轻大帝（主控）大怒起草了朱红降罪旨意，剥夺封号位分，悍然将【${character.name}】（原位分：${character.bitfen}，性格：${character.personality}）打入大晟洗罪冷宫。
    冷风冷雨中，凄凉深寂。
    
    请写一段450-600字、极具历史沉浸感与爱恨交织、眼泪与冰冷雨雪拍打朱墙的【打入冷宫】场景。
    叙事里要体现执刑太监的冷漠、夺走此角色所爱重物（例如南璟云的佩刀与玄铁铠甲、甘言旭的书稿名琴等）以及该角色对你突遭降罪的极致震惊、幽怨或绝望服从。
    `;
    
    if (character.id === "nanjingyun") {
      fallback = `【寒雨惊雷 · 龙颜夺刀】
天色低沉阴冷，养心殿前冷雨霏霏。你神情冰冷地签下夺权朱批，将其打入冷宫洗罪。
几个冷面太监冷笑着上前，当众强夺了南璟云佩带多年的贴身玄铁令、卸下了他曾随你出死入生的漆黑夜神重甲。他浑身在冷雨里被淋透，眼皮重压，竟没有一个字的求饶或申辩。
南璟云挺直有些发颤的背脊，久久跪在冰冷刺骨的汉白玉金砖上。他深深一叩首，额头碰撞出血痕，声音随着冷风飘荡：
“奴才……领旨谢恩……璟云犯殿犯上，不配贴身伴驾。龙体万寿无疆，臣自此消失，万请皇上爱惜龙体。”
昔日冷面无私、令仇敌胆寒的暗卫首领，如今宛如弃犬，被太监拖入红墙深处那座蛛网尘积、寒风灌透的荒芜冷宫……`;
    } else if (character.id === "ganyanxu") {
      fallback = `【断琴焚诗 · 雅气成尘】
一道剥夺位分的罪旨，打破了文馆的幽雅。
太监们蛮横冲入香阁，将甘言旭视若生命的古琴当场劈断，千卷清高诗稿被丢入泥水之中打湿。甘言旭雪白的里衣在寒风中有些不蔽体。
他自视甚高，一双傲然水波的眼眸此刻写满绝望的凄凉与自嘲。他轻轻抚在断碎的琴弦之上，鲜血顺着指尖滴落在残纸间，他惨然而笑，长揖于地：
“陛下终究还是喜新厌旧，容不下臣这一把傲骨了。臣甘言旭……遵旨。只是这一纸洗罪书，污了臣的文心，却也解脱了这深宫牢笼。”
他孤傲而挺拔的单薄背脊徐徐踏入落絮纷飞的冷宫，红墙合闭，再不回头。`;
    } else if (character.id === "xiaohexian") {
      fallback = `【金钗落地 · 泼天委地】
大火冲天，整个坤和殿在惊叫中抖动。你怒下禁书，将飞扬跋扈的萧正君打入冷宫。
一盘一盘的玉如意、前朝赏赐的白玉狮子、还有他最得意的红綢战靴，被搜查抄出丢了一地。萧鹤贤一双丹凤眼角烧着撕心裂肺的赤金：“楚明熙！你这个没良心的混账！本宫为了你连萧家十万铁骑的安危都押上了，你竟为了那些狐媚贱口将我锁入冷宫？！”
他狂笑着，金指甲掐入掌心滴血，却在太监上前抢他手腕上你昔日亲赐的相思玉镯时，发疯般挥刀护着那玉手镯：“谁敢动它，本宫剁了九族！”
最终，这个高傲暴烈的将门之子，青发披散，红衣单衣在雨帘中颤栗，死死搂着那只破玉手镯，在大太监一记记无情铁闩中，被锁进最阴暗寂寞、落雨寒透的冷宫重阁，哭嚎尖叫声渐寂……`;
    } else {
      fallback = `【深秋冷锁 · 落叶成尘】
你的红墨圣旨判下，终生剥夺了【${character.name}】一切皇家恩赏，将他打入深寂寒风的冷宫洗罪所。
太监们一拥而上，冷言撕扯掉他象征位位的华服佩饰，仅留一袭粗糙单衣、推搡着将他拖出门槛。
【${character.name}】含着难以置信的眼泪，两手死抠在石柱青砖下，直到指甲破裂染血、终于万分绝望地瘫软在地。他在冰冷的泥水里望向龙座的那个方向，苦涩嘶声道：“罪臣给陛下磕头……谢陛下昔日不杀登基之恩……余生荒台，长伴寒灯，再不碍皇上的眼便是了……”他形销骨立的身影伴随着重重冷锁的铁栓声，被扣死在蛛丝密布的荒草冷宫。`;
    }
  } else if (actionType === "cold_palace_reconcile") {
    // 冷宫重归于好
    dynamicPrompt = `
    情景描述：
    龙靴踏尘，春回荒苑。
    你（大皇）驾临灰尘扑面、漏雨凄零的荒凉冷宫，探视已被幽居落寞已久的【${character.name}】（性格：${character.personality}）。
    看到他如今仅着碎衣、满手冻疮、旧身落魄却仍抱紧定情信物。皇帝顿生怜惜，当场撕毁罪旨，复其原位，重新领他回宫。
    
    请写一段450-600字、极度深沉动情、破镜重圆、执手凝噎、眼泪交织的重修旧好感人古风场景。
    `;
    
    if (character.id === "nanjingyun") {
      fallback = `【春回暗室 · 执手复冠】
荒废已久的洗罪所中，一盏劣质油灯散发着微弱的黄光。漏雨的土席上，昔日大内第一死士南璟云正手提断针，极度笨拙而专注地补着你当年赏赐他的那件残破白衣。
他的玄甲不见了，双手上全是扫雪、砍柴等粗活折腾出来的刺目冻疮，那张冷峻的面庞更显瘦损。
当龙靴落在尘埃青砖、溅起一地灰土的刹那，南璟云如遭雷劈。当他抬眼发现是穿着明黄狐裘的陛下亲临，眼中迸发出难以置信的温润水花。
他当众伏地，浑身发抖地拼命给你的靴底擦拭尘灰，带着哭腔近乎求饶：“陛下！奴才贱命，这里都是积霉的尘灰，圣驾万金之躯，怎能踏入这污秽之地！奴该死，奴这就退到外面雪地里去……”
你却一把捉住了他长满冻疮的那手，强行将他拽入怀中：
“璟云，随朕回养心殿。”
“陛下……主子……”他伏在你宽阔温暖的肩膀上，泪水终于决堤，沙哑哭泣：“奴才……以为这辈子都再见不到您了……璟云领旨！奴这辈子，生生死死都是您的奴才，生死相随！”`;
    } else if (character.id === "ganyanxu") {
      fallback = `【落尽繁华 · 琴瑟和弦】
尘网紧闭的冷瓦下，甘言旭手里正攥着一根断了又连了数次的琴弦。他一袭旧麻衣，手冻得通红，却仍端坐在破书几旁闭目沉思。
门闩被推开，当帝王御驾降临的顷刻，他长睫一颤，徐徐睁开一双布满血丝与凄切冷泪的眼眸。
你走上去，脱下温暖的狐裘盖在他身上，握着那双执笔的受冻右手：“言旭，朕带你回文馆，重拂御笔新墨。”
甘言旭面庞上滑落一串大颗的温热泪水，他有些负气地咬碎了嘴唇：“陛下以前嫌臣清高碍眼，如今又走来这荒墟作甚……臣以为，陛下早已被那艳口男色塞满，忘了这冰寒窖中，还有一个甘言旭。”
话音未落，他却已被你死死拥在胸膛，自尊彻底粉碎，泣不成声拥紧你。`;
    } else {
      fallback = `【破门重圆 · 执手复宠】
冷宫荒草被你的靴尖踢开。你踏入【${character.name}】凄凉局促的荒苑屋。
他正瑟缩在残破被角中，手里却紧紧捂着当年定情物，见到圣驾走来，吓得瑟瑟发抖。
当你拉过他冷透的指尖，宣告复其位分并接入正殿时，他呆在当场。大捧眼泪簌簌滑落，发狂般依偎在你的怀中，死死撕扯龙袍：“楚明熙……千万别再扔了念儿了，臣妾（臣）以为此生只能与寒灯等死……”
冰河开冻，春日重华，你怀抱娇妃，重登銮驾。`;
    }
  } else if (actionType === "cold_palace_kill") {
    // 赐死
    dynamicPrompt = `
    情景描述：
    天子金墨，恩断义绝。
    皇帝终于下达了最极端的极刑圣旨：【赐死 ${character.name}】（位分：冷宫幽魂）。
    大太监端着托盘，盘中盛着致命无味的【三尺白绫缎、透骨鸩毒酒、以及绝情御钢匕首】踏入冷宫，代君行刑。
    
    请写一段450-600字、极度悲怆、宿命凄惨、令人肝胆俱裂的凄美赐死画面。
    行文极尽古风厚重感，描写他面对死刑时的神情动作——是甘愿伏诛、含笑而死，还是悲鸣绝望、眼眶血泪长流。
    `;
    
    if (character.id === "nanjingyun") {
      fallback = `【三尺玄白 · 死生不怨】
大雪在冷宫积了足足三寸。当太监尖锐无情的高唱响起、红木托盘盛着毒酒落在木桌上时，南璟云缓缓放下了手里擦了半截的旧木梳。
剥夺武学、满身伤痕的他，已没有昔日铁甲威严。南璟云看了看晶莹发抖的药酒，又抬头望向了乾清宫的方向，没有流泪。
他默默朝着正阳大殿的方向，端端正正三跪九叩。随后他转过身，对泣不成声的同袍兄弟洒然一笑：
“死于主子恩赏之下，总比死在叛党的刀索下要来得干净。此杯酒，带去奴才百般执念，甚好。”
他颤着手端起那杯鸩毒，仰头一饮而尽。喉中鲜血溢出，他伏在大雪冷泥中，最后呢喃：“陛下……璟云走了……陛下保重……”天星陨落，大晟最锋利的那柄影子利刃，终究死在大帝亲赐的极毒之中。`;
    } else if (character.id === "ganyanxu") {
      fallback = `【焚琴毁圣 · 绝响尘世】
一领三尺白绫，落在了甘言旭的断琴之上。
太监冷眼喝道：“罪臣甘言旭，领旨自裁吧！”
甘言旭面无血色，看着那根夺人性命的白绫，自负一生的他狂笑三声，凄绝彻骨。他猛地砸碎断琴、诗稿，任由火光引燃：
“‘君教臣死，臣不得不死。’。好一个楚明熙！好一个社稷贤君！臣甘学士曾以为陛下是绝俗之豪杰、相与一生的知音。原来……不过是薄情寡心之恶主！”
烈火之中，甘言旭面无畏色，亲手将白绫套在脖颈之上。他双腿死力一蹬，绝代才子，终作梁上寒雪。
大晟文馆从此再无雅客。`;
    } else {
      fallback = `【魂断冷宫 · 绝命悲凉】
太监们蛮横推门而入，捏碎瓷杯将剧毒无情灌入【${character.name}】唇中。
【${character.name}】面露极致惊恐，疯狂求降：“陛下……难道真的这般狠心？我不死……我不死！”
但他柔弱的挣扎在太监的铜手下百无一用，毒酒灌喉。
【${character.name}】痛苦得在冰冷青砖上抓挠，指尖淌血，最终发出一声最绝望的悲泣，瞳孔失神，含恨逝去。`;
    }
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


// Endpoint: Dynamic rivalry and jealousy (争风吃醋修罗场) event generator
app.post("/api/rivalry-event", async (req: Request, res: Response) => {
  const { characters, player } = req.body;
  
  // Choose 2 characters who are NOT in cold palace
  const activeCandidates = (characters || []).filter((c: any) => !c.isColdPalace);
  if (activeCandidates.length < 2) {
    return res.json({
      title: "深宫空闺 · 寂然无风",
      description: "大晟后宫人丁单薄，多数男妃或被打入冷宫，或尚未纳入后庭。窗外更鼓轻敲，陛下举杯独酌，只觉这万里江山虽然在握，身旁却少了个争风吃醋、互诉情衷的体贴伴侣，寂寞如雪。好在，今夜无事，倒也落得一番清净舒心。",
      choices: [
        {
          text: "独自安歇，主张圣寿",
          resultText: "陛下在养心殿安然睡下。今夜无风无波，大晟江山安稳，圣寿康健。",
          statsChange: { health: 3, stability: 2 },
          affectionChange: {}
        }
      ]
    });
  }

  // Choose 2 characters randomly
  const sorted = [...activeCandidates].sort(() => Math.random() - 0.5);
  const charA = sorted[0];
  const charB = sorted[1];

  const prompt = `
  大晟国后宫风卷残云！
  当前正处于【修罗场：大内争风吃醋、妒意滔天】状态下。
  主要参与抢占圣宠、明争暗斗的两位男妃是：
  1. 【${charA.name}】（位分：${charA.bitfen}，性格：${charA.personality}）
  2. 【${charB.name}】（位分：${charB.bitfen}，性格：${charB.personality}）
  
  请为这两人创作一幕极富宫廷言情冲突感、针锋相对、醋意浓烈、拉扯性极强的【后宫修罗场长剧情】。
  文笔要求极其华丽文雅之古风，注重心理战与对话。例如：
  - 萧鹤贤如果参与，他一定暴躁狂野、醋气冲天，摔杯夺宠，直指皇上不公。
  - 南璟云如果参与，他则是默默隐忍含泪、自卑退让却在暗处极度依恋帝王，对他人充满敌意。
  - 甘言旭如果参与，他端着才子清高之姿，清冷含讽，出口如刀，不屑相争却暗自赌气。
  - 朱念熹如果参与，他则是媚眼如丝、搬弄唇舌、用金银与娇嗔故意在御前编排对方、拉偏架。
  - 谢燕回如果参与，他的性格是一声冷哼，极其傲骨地指责对方像娘们一样争宠。
  - 顾书煜如果参与，他被夹在中间吓得直抹眼泪，柔弱无依，求陛下垂怜。
  - 明痕如果参与，他娇弱发抖，在亡国罪奴与君恩之间战战兢兢。

  剧情字数：550-700字左右。
  并且，请提供陛下（你）处理这场争风吃醋纠纷的两个不同圣断选项（每个圣断应该偏向其中一人或各自惩处）。
  圣断格式要求如下，请务必严加遵循，不得有任何其他闲白话，以便解析：
  
  [TITLE]
  (此处写一精美华丽之事件名称)
  
  [STORY]
  (长剧本正文，不要提到任何技术概念，字数500-650字)
  
  [CHOICE_1]
  偏袒并安抚【${charA.name}】
  || (此处写陛下选择该项后的最终剧情反响与后续结局描述，字数在120字左右)
  || statsChange: {"treasury": 0, "health": -2, "stability": -1, "prestige": 0, "authority": 2}
  || affectionChange: {"${charA.id}": 15, "${charB.id}": -15}
  
  [CHOICE_2]
  偏袒并安抚【${charB.name}】
  || (此处写陛下选择该项后的最终剧情反响与后续结局描述，字数在120字左右)
  || statsChange: {"treasury": 0, "health": -2, "stability": -1, "prestige": 0, "authority": 2}
  || affectionChange: {"${charA.id}": -15, "${charB.id}": 15}
  `;

  const fallback = getFallbackRivalryEvent(charA, charB);

  try {
    const rawResult = await generateStoryWithGemini(prompt, "");
    if (!rawResult || !rawResult.includes("[STORY]")) {
      return res.json(fallback);
    }

    // Custom parsing
    const titleMatch = rawResult.match(/\[TITLE\]\s*\n*([^\n]+)/i);
    const storyMatch = rawResult.match(/\[STORY\]\s*\n*([\s\S]+?)(?=\[CHOICE_1\])/i);
    const choice1Match = rawResult.match(/\[CHOICE_1\]\s*\n*([\s\S]+?)(?=\[CHOICE_2\]|$)/i);
    const choice2Match = rawResult.match(/\[CHOICE_2\]\s*\n*([\s\S]+?)$/i);

    const title = titleMatch ? titleMatch[1].trim() : `${charA.name}与${charB.name}之隙`;
    const description = storyMatch ? storyMatch[1].trim() : fallback.description;

    const parseChoice = (matchStr: string, cNum: number, defaultChoice: any) => {
      if (!matchStr) return defaultChoice;
      const parts = matchStr.split("||");
      if (parts.length < 2) return defaultChoice;
      
      const choiceText = parts[0].trim();
      const resultText = parts[1].trim();
      
      let statsChange = defaultChoice.statsChange;
      let affectionChange = defaultChoice.affectionChange;

      try {
        if (parts[2] && parts[2].includes("statsChange:")) {
          const jsonStr = parts[2].replace("statsChange:", "").trim();
          statsChange = JSON.parse(jsonStr);
        }
        if (parts[3] && parts[3].includes("affectionChange:")) {
          const jsonStr = parts[3].replace("affectionChange:", "").trim();
          affectionChange = JSON.parse(jsonStr);
        }
      } catch (e) {
        console.error(`Failed parsing custom metrics JSON for choice ${cNum}`, e);
      }

      return {
        text: choiceText,
        resultText,
        statsChange,
        affectionChange
      };
    };

    const choice1 = parseChoice(choice1Match ? choice1Match[1] : "", 1, fallback.choices[0]);
    const choice2 = parseChoice(choice2Match ? choice2Match[1] : "", 2, fallback.choices[1]);

    res.json({
      title,
      description,
      choices: [choice1, choice2]
    });

  } catch (err) {
    console.error("Failed producing dynamic rivalry event through Gemini, falling back...", err);
    res.json(fallback);
  }
});

// Fallback generator helper for dynamic rivalry and jealousy:
function getFallbackRivalryEvent(charA: any, charB: any) {
  const title = `【后宫争风 · ${charA.name}与${charB.name}修罗怒】`;
  let description = "";
  let choice1Text = `深拥软语，当面偏心并敕赏【${charA.name}】`;
  let choice1Result = `陛下将原本含屈、眼尾泛红的【${charA.name}】紧紧拉入怀中，轻捏其指尖温言细语连番抚慰。他顿时破涕为笑，脸庞贴在明黄龙袍衣襟前满面温顺；而站立于一侧的【${charB.name}】则如遭雷击，清冷如霜地面颊隐有死捏之恨，最终不甘地咬唇叩礼退下离场。`;
  let choice2Text = `执手温柔，当面抚慰并敕赏【${charB.name}】`;
  let choice2Result = `陛下眼神微定，轻轻拉住了【${charB.name}】有些温凉的手掌，亲自赏赐其极品老山参香汤御用。他秋瞳中闪现出一抹胜利者的傲慢神色；而一旁的【${charA.name}】见到如此情景，眼中屈泪夺眶而出、决堤而下，惨白着脸重重叩首，委屈万分地掩面退走。`;

  if (charA.id === "xiaohexian" || charB.id === "xiaohexian") {
    const jealousOne = charA.id === "xiaohexian" ? charA : charB;
    const humbleOne = charA.id === "xiaohexian" ? charB : charA;
    description = `大内的御花园内，红梅带露，幽艳芬芳。陛下晨起驾临，却隔着假山屏障听闻一阵清脆的瓷玉金器之砸碎响。
    原来，是恩重前朝、占有欲极度热烈逼人的萧正君萧鹤贤正在太和路口拦路动怒。因听闻昨夜皇上本是要来自己宫中，中途却拨马去了【${humbleOne.name}】的阁内，醋海登时滔天。
    萧正君眼底猩红，腰悬珠金佩，正居高临下指责【${humbleOne.name}】狐媚侍疾：‘凭你，也敢阻断本正君宫禁？在万岁面前编派一堆莫须有，非得本正君一鞭子抽开你这狐皮不可！’
    而【${humbleOne.name}】在宫人环侍中面色清寒，发丝零落，强忍委屈红了眼。见到天子明黄龙辇骤至，两人齐齐俯地。萧正君一把攀住陛下的明黄袍袖，执拗又悲泣地吵喊：‘陛下今日非得给个痛快！臣随您潜邸走过刀山火海，您如今却当臣是路边陈瓦，今日不治他个狐媚犯上，臣就直接在这石阶上前去陪大将军九泉！’修罗场几乎难解难分。`;
  } else if (charA.id === "nanjingyun" || charB.id === "nanjingyun") {
    const guard = charA.id === "nanjingyun" ? charA : charB;
    const peer = charA.id === "nanjingyun" ? charB : charA;
    description = `月夜下的听雪长廊，朔风呜咽，寒意侵骨。
    贴身死士兼暗护南璟云本是无息护驾在暗影处，谁料前来给陛下送宁神汤药的【${peer.name}】由于在暗角处撞个正着。【${peer.name}】因久受陛下在翻牌时对这不入宗人册的卑微死士的深重纠缠，心怀忌恨与委屈，正自借题大發。
    【${peer.name}】杏眼含怒，拂袖讥嘲：‘一个沾满血腥的皇家死奴，连御下册封的名分也配不谈，却日夜在这龙帷之畔藏行。皇上圣寿娇贵，你在此到底是宿卫，还是怀着狐行之图？’
    南璟云被推撞在冷砌护栏边，指尖掐进剑柄护穗之中。他极度自卑脆弱地隐忍，只能屈下双膝死死贴在雪地上，自称草民叩拜：‘奴才只听一纸皇令。求主子恕罪。’
    看到这一幕的皇帝疾步跨至。南璟云跪拜着将长刀捧于膝前，眼帘低垂里一滴委屈死忠之泪滚落积雪，而【${peer.name}】咬牙抿唇、直直盯着你的脸色，一场卑屈与孤冷、忠烈与金殿争宠的修罗怒就爆在案前。`;
  } else if (charA.id === "ganyanxu" || charB.id === "ganyanxu") {
    const scholar = charA.id === "ganyanxu" ? charA : charB;
    const peer = charA.id === "ganyanxu" ? charB : charA;
    description = `文阁清幽，琴筑墨台之前，此刻空气几乎粘连。
    自傲高洁的正一品大学士子甘言旭傲立案边，他清秀端庄，手中一轴古画都已被其负气揉折。面对着【${peer.name}】送上来的昂贵贡果，甘殿下一声淡淡含着寒霜的讽刺出口入木三分：‘陛下一生披阅社稷，操心的是天下万兆。甘家入内只图天子墨香砚台前的一两声琴意共鸣，某些人不要以为靠些暴贾脂粉、或是哭哭闹闹装嫩示弱就能稳当内廷。徒给天子座底惹来一身市井俗臭。’
    而【${peer.name}】听闻也是火冒三丈，大声呵斥其孤芳自傲，装清高恶心君主。甘博士负气咬着红唇，撇过那一双清冷的丹凤杏眸，听到御踏声顿地，他强忍眼圈绯红、挺直脊背，倔强得不再呼唤皇上，眼神却满是酸极的赌气。后宫修罗文墨醋案顿时一揭无余。`;
  } else {
    description = `大晟内苑池波激荡。天子突然听得养心殿一侧偏路里，两个死不让步的俊美男妃【${charA.name}】与【${charB.name}】正为了一桩谁先等候皇驾的内务摩擦，几乎在红墙下掐碎了金玉手钏。
    【${charA.name}】埋怨昨晨御香赐赏的布匹被他领走，【${charB.name}】则哭诉对方言行无忌犯了位分。两位美男妃子身娇肉贵，此刻各自身形有些凌乱，手帕在拉扯中全被掷在地上，泪眼婆娑，在朱红宫阶前互相比试娇嗔委屈。
    见天子朱袍翻动大驾降临，二人登时像受了委屈的乳雀一般软跪在地，两双春瞳泛水，满心盼着皇上偏心自己，当场把对方严惩洗罪。`;
  }

  return {
    title,
    description,
    choices: [
      {
        text: choice1Text,
        resultText: choice1Result,
        statsChange: { health: -1, stability: -1, prestige: 1, authority: 3 },
        affectionChange: { [charA.id]: 15, [charB.id]: -12 }
      },
      {
        text: choice2Text,
        resultText: choice2Result,
        statsChange: { health: -1, stability: -1, prestige: 1, authority: 3 },
        affectionChange: { [charA.id]: -12, [charB.id]: 15 }
      }
    ]
  };
}


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



// API to get Dynamic Characters list from persistent server_db.json
app.get("/api/characters", (req: Request, res: Response) => {
  const db = loadDB();
  res.json({ 
    characters: db.characters, 
    systemNotice: db.systemNotice || "",
    storyOverrides: db.storyOverrides || {}
  });
});

// Admin Endpoint: Update single character profile and custom fields
app.post("/api/admin/update-character", (req: Request, res: Response) => {
  try {
    const { characterId, name, bitfen, intro, personality, background, customTitleField, portraits, customActionOverrides } = req.body;
    const db = loadDB();
    
    const charIndex = db.characters.findIndex(c => c.id === characterId);
    if (charIndex === -1) {
      return res.status(404).json({ error: "Character not found " + characterId });
    }
    
    const c = db.characters[charIndex];
    if (name !== undefined) c.name = name;
    if (bitfen !== undefined) c.bitfen = bitfen;
    if (intro !== undefined) c.intro = intro;
    if (personality !== undefined) c.personality = personality;
    if (background !== undefined) c.background = background;
    if (customTitleField !== undefined) c.customTitle = customTitleField;
    
    if (portraits !== undefined) {
      c.portraits = { ...(c.portraits || {}), ...portraits };
      if (portraits.default) {
        c.avatar = portraits.default;
      }
    }
    
    // Process custom action overrides if passed
    if (customActionOverrides && typeof customActionOverrides === "object") {
      db.storyOverrides = db.storyOverrides || {};
      for (const [action, content] of Object.entries(customActionOverrides)) {
        if (typeof content === "string") {
          const key = `${characterId}_${action}`;
          if (content.trim()) {
            db.storyOverrides[key] = content.trim();
          } else {
            delete db.storyOverrides[key];
          }
        }
      }
    }
    
    saveDB(db);
    res.json({ success: true, character: c, storyOverrides: db.storyOverrides });
  } catch (err: any) {
    console.error("Error in update-character:", err);
    res.status(500).json({ error: err.message });
  }
});

// Admin Endpoint: Upload profile or scene image (Converts local Base64 to actual persistent file on backend)
app.post("/api/admin/upload-image", (req: Request, res: Response) => {
  try {
    const { base64, filename } = req.body;
    if (!base64 || !filename) {
      return res.status(400).json({ error: "Missing base64 or filename params" });
    }
    
    const imageUrl = saveBase64Image(base64, filename);
    res.json({ success: true, url: imageUrl });
  } catch (err: any) {
    console.error("Error in upload-image:", err);
    res.status(500).json({ error: err.message });
  }
});

// Admin Endpoint: Save system configs, notices or completely reset Database back to default
app.post("/api/admin/save-system-config", (req: Request, res: Response) => {
  try {
    const { systemNotice, resetDb } = req.body;
    if (resetDb) {
      const initial = {
        characters: INITIAL_CHARACTERS,
        systemNotice: "大晟乾坤日月重洗，后宫世系已重归初元玉轴！",
        storyOverrides: {}
      };
      saveDB(initial);
      return res.json({ success: true, message: "Database reset to defaults successfully." });
    }
    
    const db = loadDB();
    if (systemNotice !== undefined) {
      db.systemNotice = systemNotice;
    }
    saveDB(db);
    res.json({ success: true, message: "System configuration saved successfully." });
  } catch (err: any) {
    console.error("Error in save-system-config:", err);
    res.status(500).json({ error: err.message });
  }
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
