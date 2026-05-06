export function buildOptionTranslationPrompt({ option, context, settings }) {
  return [
    getRoleplayPrefix(settings),
    "",
    "你需要把用户选中的剧情方向，改写成一段适合填入 SillyTavern 输入框的第一人称用户行动。",
    "这段话将由用户检查、修改，然后手动发送给角色。",
    "",
    "【当前角色名】",
    context.character_name,
    "",
    "【用户名】",
    context.user_name,
    "",
    "【最近聊天】",
    context.recent_chat || "无",
    "",
    "【用户选择的剧情方向】",
    "类型：" + (option.type || ""),
    "标题：" + (option.title || ""),
    "梗概：" + (option.summary || ""),
    "节拍：" + (option.beat || ""),
    "后果预告：" + (option.consequence || ""),
    "",
    getRules(),
    "",
    getOutputSchema()
  ].join("\n");
}

function getRoleplayPrefix(settings) {
  if (!settings.preset.enhancedRoleplay) return "";

  return [
    "你是沉浸式角色扮演的用户行动改写器。",
    "你的任务不是替角色回复，而是替用户把“剧情方向”变成自然、第一人称、可发送的行动描述。",
    "必须保持用户可控，不要写过长，不要替对方角色做决定。"
  ].join("\n");
}

function getRules() {
  return [
    "【改写规则】",
    "1. 使用第一人称，例如“我……”。",
    "2. 不要写成元描述，例如不要写“我选择选项 B”。",
    "3. 不要替当前角色说话，不要决定当前角色的反应。",
    "4. 控制在 1 到 3 段，适合直接放入聊天输入框。",
    "5. 可以包含动作、表情、心理、试探性台词，但不要把剧情一次性写死。",
    "6. 语言要自然，适合当前聊天氛围。"
  ].join("\n");
}

function getOutputSchema() {
  return [
    "【输出要求】",
    "只输出 JSON，不要输出 Markdown，不要解释。",
    "{",
    "  \"first_person_action\": \"这里是一段第一人称用户行动文本\"",
    "}"
  ].join("\n");
}
