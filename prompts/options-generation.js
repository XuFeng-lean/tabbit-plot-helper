export function buildOptionsPrompt({ context, settings }) {
  return [
    getRoleplayPrefix(settings),
    "",
    "你正在为 SillyTavern 当前角色聊天生成下一步剧情方向。",
    "请根据当前聊天内容、角色卡、User Persona、世界书，以及可选的活动大纲，生成 5 个不同方向的剧情选项。",
    "",
    getContextBlock(context),
    "",
    getOutlineBlock(context),
    "",
    getWorldVariableBlock(context, settings),
    "",
    getUsedOptionsBlock(context),
    "",
    getRules(settings),
    "",
    getOutputSchema(settings)
  ].join("\n");
}

function getRoleplayPrefix(settings) {
  if (!settings.preset.enhancedRoleplay) return "";

  return [
    "你是互动式小说的剧情选项设计师。",
    "你要给用户提供下一步可采取的剧情方向，而不是代替角色直接写完整剧情。",
    "每个选项都必须能自然接上最近聊天，并保持角色一致性。"
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

function getOutlineBlock(context) {
  if (!context.active_outline) {
    return "【活动大纲】\n无。请仅基于当前聊天生成剧情方向。";
  }

  return [
    "【活动大纲】",
    "标题：" + (context.active_outline.title || "未命名"),
    "一句话亮点：" + (context.active_outline.logline || ""),
    "关系变化：" + (context.active_outline.relationship_shift || ""),
    "角色弧光：" + (context.active_outline.character_arc || ""),
    "三幕结构：" + JSON.stringify(context.active_outline.three_act || {}),
    "关键转折点：" + JSON.stringify(context.active_outline.key_turning_points || [])
  ].join("\n");
}

function getWorldVariableBlock(context, settings) {
  if (!settings.advanced.worldVariables) {
    return "【世界变量 / 暗流伏笔】\n未启用。";
  }

  if (!Array.isArray(context.world_variables) || context.world_variables.length === 0) {
    return "【世界变量 / 暗流伏笔】\n当前暂无。请本次额外生成 1 到 2 个新的后台暗线变量。";
  }

  return [
    "【世界变量 / 暗流伏笔】",
    context.world_variables.map((item, index) => {
      return [
        String(index + 1) + ". " + (item.title || "未命名暗线"),
        "描述：" + (item.description || ""),
        "状态：" + (item.status || "active")
      ].join("\n");
    }).join("\n\n"),
    "",
    "请在“暗流涌动”选项中优先使用或推进其中一个变量，也可以新增 1 个合理变量。"
  ].join("\n");
}

function getUsedOptionsBlock(context) {
  if (!Array.isArray(context.used_options) || context.used_options.length === 0) {
    return "【已使用过的剧情选项】\n无。";
  }

  return [
    "【已使用过的剧情选项】",
    context.used_options.slice(0, 8).map((item, index) => {
      return String(index + 1) + ". " + (item.title || item.summary || "未命名选项");
    }).join("\n"),
    "请避免重复生成类似选项。"
  ].join("\n");
}

function getRules(settings) {
  const rules = [
    "【生成规则】",
    "1. 必须生成 5 个选项，分别对应：主线推进、关系演变、机会意外、暗流涌动、内在冲突。",
    "2. 每个选项都要包含：类型、标题、情节梗概、目的标签、叙事节拍、后果预告。",
    "3. 选项是“方向”，不是完整回复。用户之后会选择其中一个，再由扩展改写成第一人称行动。",
    "4. 必须避免 OOC：不能让角色突然做出违背角色卡或最近聊天事实的行为。",
    "5. 节拍标签可以是：张力升级、短暂喘息、情感爆发、风暴前夜、角色内省、危机临近、关系升温、真相逼近。"
  ];

  if (settings.advanced.themeImage) {
    rules.push("6. 已启用主题意象：若时机合适，可将其中一个选项设计为“意象低语”，但不要每次都强行使用。");
  }

  return rules.join("\n");
}

function getOutputSchema(settings) {
  const variablePart = settings.advanced.worldVariables
    ? [
      "  \"world_variables\": [",
      "    {",
      "      \"title\": \"后台暗线标题\",",
      "      \"description\": \"主角暂时不知道，但世界正在发生的变化\",",
      "      \"status\": \"active\"",
      "    }",
      "  ],"
    ].join("\n")
    : "";

  return [
    "【输出要求】",
    "只输出 JSON，不要输出 Markdown，不要解释。",
    "{",
    "  \"options\": [",
    "    {",
    "      \"label\": \"A\",",
    "      \"type\": \"主线推进\",",
    "      \"title\": \"选项标题\",",
    "      \"summary\": \"2 到 3 句话说明这个方向会发生什么\",",
    "      \"tags\": [\"推进主线\", \"节拍：张力升级\"],",
    "      \"beat\": \"张力升级\",",
    "      \"consequence\": \"这个选项可能带来的短期和长期后果\"",
    "    }",
    "  ],",
    variablePart,
    "  \"advice\": \"金牌策划建议：从节奏、角色弧光和剧情推进角度建议用户优先考虑哪个选项，以及为什么。\"",
    "}",
    "必须生成 5 个 options，label 依次为 A、B、C、D、E。"
  ].join("\n");
}
