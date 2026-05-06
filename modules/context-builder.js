import { chat, chat_metadata, saveMetadata, generateQuietPrompt } from "../../../../../script.js";
export async function buildPlotContext(ctx, settings, chatMetadata) {
  const result = {
    character_name: "",
    user_name: "",
    character_card: "",
    user_persona: "",
    world_info: "",
    recent_chat: "",
    active_outline: null,
    world_variables: [],
    used_options: []
  };

  const safeCtx = ctx || {};

  result.character_name =
    safeCtx.name2 ||
    safeCtx.characterName ||
    getGlobalValue("name2") ||
    "当前角色";

  result.user_name =
    safeCtx.name1 ||
    safeCtx.userName ||
    getGlobalValue("name1") ||
    "用户";

  result.character_card = extractCharacterCard(safeCtx);
  result.user_persona = settings.context.includeUserPersona ? extractUserPersona(safeCtx) : "";
  result.world_info = settings.context.includeWorldInfo ? extractWorldInfo(safeCtx) : "";
  result.recent_chat = extractRecentChat(safeCtx, settings.context.recentMessages);

  const store = chatMetadata && chatMetadata.tabbit_plot ? chatMetadata.tabbit_plot : null;
  if (store) {
    result.active_outline = store.active_outline || null;
    result.world_variables = Array.isArray(store.world_variables) ? store.world_variables : [];
    result.used_options = Array.isArray(store.used_options) ? store.used_options : [];
  }

  return result;
}

function getGlobalValue(name) {
  try {
    return window[name] || "";
  } catch (_) {
    return "";
  }
}

function extractCharacterCard(ctx) {
  try {
    const chid = ctx.characterId ?? ctx.this_chid ?? window.this_chid;
    const characters = ctx.characters || window.characters || [];
    const character = characters && characters[chid] ? characters[chid] : null;

    if (!character) return "";

    const parts = [];

    if (character.name) parts.push("角色名：" + character.name);
    if (character.description) parts.push("角色描述：" + character.description);
    if (character.personality) parts.push("性格：" + character.personality);
    if (character.scenario) parts.push("场景：" + character.scenario);
    if (character.mes_example) parts.push("示例对话：" + character.mes_example);
    if (character.creator_notes) parts.push("作者注释：" + character.creator_notes);

    return parts.join("\n\n");
  } catch (_) {
    return "";
  }
}

function extractUserPersona(ctx) {
  const candidates = [
    ctx.power_user && ctx.power_user.persona_description,
    ctx.persona_description,
    ctx.userPersona,
    window.power_user && window.power_user.persona_description,
    window.persona_description
  ];

  for (const item of candidates) {
    if (typeof item === "string" && item.trim()) {
      return item.trim();
    }
  }

  return "";
}

function extractWorldInfo(ctx) {
  const parts = [];

  try {
    if (Array.isArray(ctx.worldInfoEntries)) {
      ctx.worldInfoEntries.forEach((entry) => {
        if (entry && entry.content) parts.push(entry.content);
      });
    }

    if (Array.isArray(ctx.world_info)) {
      ctx.world_info.forEach((entry) => {
        if (entry && entry.content) parts.push(entry.content);
      });
    }

    if (window.world_info && typeof window.world_info === "object") {
      const values = Object.values(window.world_info);
      values.slice(0, 30).forEach((entry) => {
        if (entry && entry.content) parts.push(entry.content);
      });
    }
  } catch (_) {
    return "";
  }

  return parts.slice(0, 20).join("\n\n");
}

function extractRecentChat(ctx, count) {
  const chat = ctx.chat || window.chat || [];
  if (!Array.isArray(chat) || chat.length === 0) return "";

  const recent = chat.slice(-count);

  return recent.map((message) => {
    const name = message.name || message.role || "未知";
    const text = message.mes || message.content || "";
    return name + "：" + stripHtml(text);
  }).join("\n\n");
}

function stripHtml(text) {
  return String(text || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
