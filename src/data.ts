import { Character } from "./types";

export const BITFEN_HIERARCHY = [
  "君后",
  "贵君",
  "正君",
  "卿",
  "贵人",
  "常在",
  "答应",
  "官男子"
];

export const INITIAL_CHARACTERS: Character[] = [
  {
    id: "nanjingyun",
    name: "南璟云",
    originalBitfen: "无 (贴身暗卫)",
    bitfen: "官男子", // Can be promoted later
    intro: "自幼追随的贴身死士，沉稳寡言，武艺绝伦。纵使满身伤痕，也永远守候在你的影子里。",
    background: "家族中所有成年男子因莫须有的叛国罪名流放并贱卖为奴，留下体弱多病的弟弟与年迈的祖母在荒凉的祖籍。他拼尽一身性命投身皇家禁卫暗部，以此获取微薄月银寄回故里，为幼弟购药强强续命。",
    personality: "忠心耿耿，隐忍深沉。虽情感极深而极度自卑，面对帝王的宠幸习惯于俯首称奴，鲜少展露真心笑容，唯有在私密处低喘、顺从。对弟弟和祖母是唯一的眷恋，视皇帝为终其一生捍卫的神明。",
    affection: 65,
    health: 90,
    fertility: 30,
    intelligence: 85,
    pregnantProgress: 0,
    isPregnant: false,
    relationshipHistory: ["潜邸时期：暗中护卫数载。", "登基大典：带领羽林卫肃清大皇子叛党，浴血拼下皇位。"]
  },
  {
    id: "ganyanxu",
    name: "甘言旭",
    originalBitfen: "贵人",
    bitfen: "贵人",
    intro: "正一品文渊阁大学士嫡子，满腹经纶，温润如玉。擅弹古琴，一双眸子澄明深黑如夜宇。",
    background: "世代书香名门，清廉自守，为稳固文官政治而送入宫中。其人才华橫溢，极具才名，入宫即蒙君宠，获授贵人之位。",
    personality: "端庄高洁，内秀而自傲。谈吐高雅优雅，极懂朝政得失，是帝王在墨香砚台前难得的知己。虽然表面上波澜不惊，但被你动情逗弄时亦会露出清冷中的绯红与隐忍面。极其厌恶后宫争斗。",
    affection: 35,
    health: 80,
    fertility: 40,
    intelligence: 95,
    pregnantProgress: 0,
    isPregnant: false,
    relationshipHistory: ["礼部秀选：学富五车、诗才无双，帝大悦，赐号‘贵人’。"]
  },
  {
    id: "gushuyu",
    name: "顾书煜",
    originalBitfen: "答应",
    bitfen: "答应",
    intro: "九品知县庶出幼子，性格怯懦，眉清目秀。身姿纤柔，见人便低头敛眉，乖顺之极。",
    background: "微末地方官员的庶出子，在家中饱受白眼与虐待，入选时甚至局促不安。选秀时，帝因看中其不着华贵而带有一丝畏缩的懂事娇羞，遂封为答应。",
    personality: "唯唯诺诺，柔顺似水，极其依恋帝王的怀抱。由于自幼缺少爱意，对帝王哪怕是偶尔的雨露施恩也会激动得叩首流泪。对帝王的旨意绝不违抗，在宫中常被他人轻视排挤，总是忍气吞声，只在偏殿默默等待圣驾临幸。",
    affection: 50,
    health: 75,
    fertility: 55,
    intelligence: 70,
    pregnantProgress: 0,
    isPregnant: false,
    relationshipHistory: ["选秀入宫：乖巧怯懦，得蒙龙恩。"]
  },
  {
    id: "zhunianxi",
    name: "朱念熹",
    originalBitfen: "答应",
    bitfen: "答应",
    intro: "江南巨贾朱氏之孙，聪慧无双。生了一双妩媚而精细的丹凤眼，看人时似笑非笑，风情万种。",
    background: "江南三大富商之首的朱家极力塞入宫内的嫡次子。豪贾世家出身，自小耳濡目染，通晓人性与金石之局，善于讨得圣人欢心。选秀之时，用一双灼热撩人的丹凤眼大胆直视金銮天颜，得以一纸圣诏封答应。",
    personality: "聪敏俏皮，精明内敛。虽不时娇滴滴、爱撒娇，私底下算盘打得极响，懂得如何用温柔与金银打通各处宫墙。看似极重钱财，实则最是看懂尔虞我诈，甚至能在暗中利用朱家商号为帝王输送军需、调济库银。",
    affection: 40,
    health: 85,
    fertility: 45,
    intelligence: 92,
    pregnantProgress: 0,
    isPregnant: false,
    relationshipHistory: ["选秀御前：大殿之上，以绝世身段与欲语还休的丹凤眼引龙颜侧目，封为答应。"]
  },
  {
    id: "xiaohexian",
    name: "萧鹤贤",
    originalBitfen: "正君 (潜邸侧福晋)",
    bitfen: "正君",
    intro: "正一品武官嫡长子，曾是潜邸的侧福晋。身姿矫健如苍鹰，容颜华贵，英豪逼人。",
    background: "开国功勋大将军之子，随父兄习得弯弓骑射。入府极早，是你从夺嫡深渊里走来时坚实的武力支持。入宫后，你感念其荣辱与共，下旨册封为正君，地位在诸妃之上。",
    personality: "脾气暴躁嚣张，占有欲极强，时有跋扈之举。但他心里却有一腔滚烫如铁砂的真情——只因深爱着你，才拼命想霸占你身边的全部位置。在前朝，他敢于为了你与群臣争辩，在宫中一旦见到别的男妃获宠便会醋意滔天，又极易被三言两语哄好，私密临幸时最是热烈大胆。",
    affection: 75,
    health: 95,
    fertility: 35,
    intelligence: 80,
    pregnantProgress: 0,
    isPregnant: false,
    relationshipHistory: ["潜邸五年：恩爱绸缪、同生共死。", "登基夺嫡：在前朝，于宗人府等地方，萧鹤贤四处奔走撒播宿敌三阿哥的丑闻绝密，让其英名尽毁再无力染指江山。"]
  },
  {
    id: "liumingche",
    name: "柳明澈",
    originalBitfen: "常在 (潜邸格格)",
    bitfen: "常在",
    intro: "王府时的小妾（格格），极其清冷，沉默本分。居所常年缭绕着一种古怪而极度诱人的幽香。",
    background: "偏庶出身，不擅谄言，在潜邸时就如尘埃一般不受众人瞩目。由于体弱多病，少有人提起他。可你登基后发现他精擅香草，调香手段通神，你每每心烦气躁、路过他宫宇，总能被其奇香安抚，赐封为常在。",
    personality: "安分守己，与世无争。即使在深夜也只是坐在小院里安然捣香。对你的敬畏大过情爱，性情极为孤僻敏感。他研制的各类奇香，不仅能安神，亦有些不可告人的催情及调理孕子体质的奇效，你赐予他的少，他却将毕生执念都融入一炉炉轻烟之中。",
    affection: 45,
    health: 70,
    fertility: 60,
    intelligence: 82,
    pregnantProgress: 0,
    isPregnant: false,
    relationshipHistory: ["潜邸格格：在冷僻小院中度过寂静五年。", "新皇登基：以一炉‘龙涎安神香’拂拭御前焦躁，帝不忍落，封为常在。"]
  },
  {
    id: "xieyanhui",
    name: "谢燕回",
    originalBitfen: "正君 (凯旋大将军)",
    bitfen: "正君",
    intro: "定国大将军，放荡不羁，剑目星眉。不懂宫廷礼仪，在龙榻上多也是一副桀骜放肆的姿态。",
    background: "在沙场斩敌近万的高手，豪爽之英豪。早先你微服巡边，于落日荒漠中一瞥见他战甲褴褛却张狂大笑的狂野浪荡，深深震颤。得胜班师回朝后，你不顾礼部百官唾骂，劝说他解甲入宫为妃，他气急之下亦不愿叛你，只得无奈受命，帝封其为正君抚慰之。",
    personality: "桀骜难训，狂妄洒脱。在宫中仍是大口喝酒，拒绝行寻常男妃之礼。平日极少主动讨好你，甚至还会嘲笑内廷的尔虞我诈。但当他卸下重重防备，在深宫床帏内展现出的纠缠英气和不情愿的迎合，却最具征服快感，甚至会为了你逐渐收敛将领脾气。",
    affection: 48,
    health: 98,
    fertility: 25,
    intelligence: 84,
    pregnantProgress: 0,
    isPregnant: false,
    relationshipHistory: ["漠北结识：在血与沙的战场见证英姿。", "凯旋归廷：帝于宣德殿握其手、劝下征甲入驻凤阁，封最高位阶之一的‘正君’。"]
  },
  {
    id: "minghen",
    name: "明痕",
    originalBitfen: "毓国质子 (质皇子)",
    bitfen: "官男子", // lowest but player can promote
    intro: "毓国末代小皇子，年仅十五。骨骼纤细，懵懂无知，望向你时常含着鹿儿般的恐惧泪光。",
    background: "败亡国度毓国的幼子。你与谢燕回荡平毓国边城，毓国举国而降。大军班师，俘虏群中独一小少年稚嫩如雏雁，蜷缩在谢燕回铁甲坐骑旁战栗。帝生怜爱之心，将仅十五岁的他带入宫中禁足，赏赐常在寝偏殿。",
    personality: "天真、极度害怕。完全不懂男妃侍寝这些男女/男男荒淫之礼，甚至把你看作毁其家国的刽子手兼唯一的护身符，感情极其纠结矛盾。平日里柔弱顺从，时常默默流泪，抱紧其母妃留下的香帕，需要你徐徐爱护、步步引导教诲。",
    affection: 20,
    health: 65,
    fertility: 65,
    intelligence: 75,
    pregnantProgress: 0,
    isPregnant: false,
    relationshipHistory: ["毓国之破：家国破碎时在马嘶声中被御指点中，沦为帝王恩赐的囚徒。"]
  }
];

export const STATIC_MEMORIALS = [
  {
    id: "m1",
    title: "江南春汛上奏",
    content: "两江总督上言：江南春雨连绵，江堤决口泛滥，千里水田受淹。灾民流离，嗷嗷待哺，请拨赈灾银十万两，并开常平仓放粮！",
    choices: [
      {
        text: "当即开仓，拨银十万，遣妥当大臣亲赴两江",
        effect: "灾民获救，朝野声望大涨，国库中度损耗",
        statsChange: { treasury: -100000, stability: 15, prestige: 10, authority: 5 },
        resultText: "你派遣甘言旭之父监察河工，河决得抚，江南百姓在洪水中对你感恩戴德，山呼万岁！国库稍显空虚，但朝局安稳。"
      },
      {
        text: "拒拨十万，由地方豪绅捐助，朝廷仅遣官慰问",
        effect: "保全库银，但两江民怨鼎沸，社稷动荡",
        statsChange: { treasury: 0, stability: -15, prestige: -15, authority: -5 },
        resultText: "地方商绅勾结中饱私囊，两江饿毙者无数。民间爆出暴动谣言，你的口碑落入深渊，朱念熹听闻此事，叹息着让族里暗自施粥挽回局势。"
      }
    ]
  },
  {
    id: "m2",
    title: "漠北鞑靼异动",
    content: "边关十万火急报：趁谢燕回将军入宫卸甲，鞑靼残部死灰复燃，大肆寇边掳掠。群臣惶惶，有的主和通婚，有的请帝允准谢燕回再度出战！",
    choices: [
      {
        text: "准谢燕回解免内廷枷锁，穿甲带兵驰援边境",
        effect: "谢大胜而归，谢燕回好感度飞升，军威大震",
        statsChange: { treasury: -50000, prestige: 20, authority: 10, stability: 15 },
        resultText: "谢燕回大笑三声，于龙榻前一叩首：‘陛下不困臣于笼中，臣当为陛下取蛮酋首级！’。三月后，北境大捷，谢将军好感暴涨，他与你的感情愈加深厚。"
      },
      {
        text: "不准他出宫，另派他将，实行和亲安抚策略",
        effect: "保全了爱妃，但谢将军在殿中砸碎酒罐，无比落寞",
        statsChange: { treasury: -20000, prestige: -10, stability: -5, authority: -5 },
        resultText: "你派出无能之人，边关损兵折将，不得不割肉求和。谢燕回听闻后在宫内喝得烂醉，指着养心殿方向冷笑：‘陛下将臣当雀鸟玩弄，可知三军血冷！’，对你好感大跌。"
      }
    ]
  },
  {
    id: "m3",
    title: "国子监御赐春闱",
    content: "天子春闱将至，礼部尚书请折：是否御驾亲临国子监，主试天下士子，并钦点状元，以彰皇仁？",
    choices: [
      {
        text: "帝亲临国子监主考，提拔清寒之士",
        effect: "朝廷掌控文坛，文馆甘言旭无比自豪，威望上升",
        statsChange: { treasury: -10000, stability: 10, prestige: 15, authority: 10 },
        resultText: "你亲临国子监。下笔如神的士子们万分激荡。甘言旭在偏殿听闻陛下重用贤才，眼中流露出前所未有的脉脉温情，呈上亲制香毫一管。"
      },
      {
        text: "着宰辅代行，天子体虚，在后宫陪伴年轻新宠",
        effect: "陪伴了答应顾书煜，其好感上升，但天下清流多有腹诽",
        statsChange: { stability: -5, prestige: -5, treasury: 0, authority: -5 },
        resultText: "你在小阁楼里与顾书煜下棋喝茶，小煜受宠若惊，脸蛋通红地软在你的膝头。然而前朝清流士子因此指责陛下沉溺男色，龙德受污。"
      }
    ]
  }
];
