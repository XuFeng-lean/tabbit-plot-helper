export function buildOutlineNoIdeaPrompt({ engine, context, settings }) {
  return [
    getRoleplayPrefix(settings),
    "",
    "你正在为一个已经开始的 SillyTavern 角色聊天生成主线剧情大纲。",
    "用户暂时没有明确想法。请根据指定灵感引擎，结合角色卡、User Persona、世界书和最近聊天，生成 3 个不同方向的主线大纲。",
    "",
    getEngineRules(engine),
    "",
    getContextBlock(context),
    "",
    getAdvancedRules(settings),
    "",
    getOutputSchema()
  ].join("\n");
}

function getRoleplayPrefix(settings) {
  if (!settings.preset.enhancedRoleplay) return "";

  return [
    "你是互动式小说的剧情策划引擎。",
    "你的任务是为用户提供可玩、可延展、符合角色人设的剧情主线。",
    "不要让角色突然 OOC，不要忽略已有聊天事实。",
    "输出必须清晰、可执行、适合继续在角色扮演聊天中推进。"
  ].join("\n");
}

function getEngineRules(engine) {
  if (engine === "polti36") {
    return [
      "【灵感引擎：普尔蒂 36 种剧情模式】",
      "请从经典戏剧冲突中汲取灵感，例如：哀求、援救、复仇、追捕、灾祸、反抗、谜、夺取、牺牲、发现、失而复得、爱与职责冲突等。",
      "不要机械列举模式名称，而要将其自然转化为符合当前角色和世界观的剧情。"
    ].join("\n");
  }

  if (engine === "system") {
    return [
      "【灵感引擎：系统基模】",
      "请优先考虑系统性冲突，例如：富者愈富、公地悲剧、目标侵蚀、延迟反馈、治标不治本、改变杠杆点。",
      "反派或阻碍不应只是个人坏，而应体现某种失衡系统的后果。",
      "结局方向应尽量从“击败某人”升级到“改变规则、信息流、目标或关系结构”。"
    ].join("\n");
  }

  return [
    "【灵感引擎：关系重塑模型】",
    "请优先从人物关系变化出发构思剧情。",
    "一个好大纲必须让用户立刻好奇：在这种设定下，角色之间接下来要如何相处？",
    "请设计至少一种关系重塑：敌对变合作、依赖变背叛、误解变理解、保护变控制、同盟变竞争、上下级关系翻转等。"
  ].join("\n");
}

function getContextBlock(context) {
  return [
    "【当前角色名】",
    context.character_name,
    "",
    "【用户名】",
    context.user_name,
    "",
    "【角色卡摘要】",
    context.character_card || "无",
    "",
    "【User Persona】",
    context.user_persona || "无",
    "",
    "【当前世界书 / 世界设定】",
    context.world_info || "无",
    "",
    "【最近聊天】",
    context.recent_chat || "无"
  ].join("\n");
}

function getAdvancedRules(settings) {
  const rules = [
    "【创作原则】",
    "1. 大纲必须符合当前角色人设、用户人设、世界书和最近聊天。",
    "2. 大纲必须包含关系变化、角色弧光、三幕结构、冲突层级和关键转折点。",
    "3. 不要生成空泛概念，要给出用户下一步能真正用来推进聊天的剧情方向。",
    "4. 三个大纲必须明显不同，不要只是换标题。"
  ];

  if (settings.advanced.midFakeVictory) {
    rules.push("5. 已启用“中期伪胜利”：每个大纲都要在第二幕中段包含一个伪胜利转折。");
  }

  if (settings.advanced.themeImage) {
    rules.push("6. 已启用“主题意象”：每个大纲都要包含一个核心意象，并说明它如何反复出现。");
  }

  return rules.join("\n");
}

function getOutputSchema() {
  return [
    "【输出要求】",
    "只输出 JSON，不要输出 Markdown，不要解释。",
    "{",
    "  \"outlines\": [",
    "    {",
    "      \"title\": \"大纲标题\",",
    "      \"logline\": \"一句话亮点\",",
    "      \"relationship_shift\": \"核心关系变化\",",
    "      \"character_arc\": \"主角信念弧光\",",
    "      \"three_act\": {",
    "        \"act1\": \"第一幕：激励事件与初始冲突\",",
    "        \"act2\": \"第二幕：冲突升级，中段转折或伪胜利\",",
    "        \"act3\": \"第三幕：高潮、选择与结局方向\"",
    "      },",
    "      \"conflict_layers\": \"内在冲突 + 人际冲突 + 环境冲突说明\",",
    "      \"key_turning_points\": [\"转折点1\", \"转折点2\", \"转折点3\"]",
    "    }",
    "  ]",
    "}",
    "必须生成 3 个 outlines。"
  ].join("\n");
}
