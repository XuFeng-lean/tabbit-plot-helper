export function buildOutlineWithIdeaPrompt({ userIdea, context, settings }) {
  return [
    getRoleplayPrefix(settings),
    "",
    "你正在为一个已经开始的 SillyTavern 角色聊天生成剧情大纲。",
    "用户已经有初步想法。请结合当前角色、人设、世界设定和已有聊天，生成 3 个不同方向的剧情大纲。",
    "",
    "【用户想法】",
    userIdea,
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
    "你的目标是帮助用户延展剧情，而不是替用户做道德评判或脱离角色设定。",
    "所有设计必须保持角色一致性，避免 OOC，避免突然改变角色核心动机。",
    "请优先服务于沉浸感、角色弧光、关系变化、情节因果和叙事节奏。"
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
    "1. 优先使用“关系重塑黄金法则”：剧情必须改变角色之间的关系结构，而不是只堆事件。",
    "2. 必须包含角色信念弧光：说明角色从什么信念走向什么信念。",
    "3. 必须包含多层冲突：内在冲突、人际冲突、环境或规则冲突。",
    "4. 必须进行 OOC 自检：任何大纲都不能违背角色卡、人设、世界书和当前聊天中已形成的事实。",
    "5. OKR 是罗盘，不是地图：大纲要有方向，但要保留角色驱动的意外空间。"
  ];

  if (settings.advanced.midFakeVictory) {
    rules.push("6. 已启用“中期伪胜利”：请在第二幕中段设计一个主角以为赢了，但后果更糟的转折。");
  }

  if (settings.advanced.themeImage) {
    rules.push("7. 已启用“主题意象”：请为每个大纲设置一个可反复出现的核心象征物。");
  }

  return rules.join("\n");
}

function getOutputSchema() {
  return [
    "【输出要求】",
    "只输出 JSON，不要输出 Markdown，不要解释。",
    "JSON 格式如下：",
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
