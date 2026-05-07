// ============================================================
// APIClient：统一封装 LLM 调用
// 阶段 2-A：仅实现"跟随酒馆主 API"模式（独立 API 模式留待阶段 4）
// ============================================================

export class APIClient {
  constructor(settings) {
    this.settings = settings;
  }

  // ---------- 主入口：发送对话型请求 ----------
  // messages: [{ role: "system"|"user"|"assistant", content: "..." }]
  // 返回：纯文本字符串
  async chat(messages, { temperature, maxTokens } = {}) {
    const mode = this.settings?.api?.mode || "follow";

    if (mode === "independent") {
      // 阶段 4 实现
      throw new Error("独立 API 模式将在阶段 4 启用");
    }

    return await this._chatViaTavern(messages, { temperature, maxTokens });
  }

  // ---------- 通过酒馆主 API 调用 ----------
  async _chatViaTavern(messages, { temperature, maxTokens } = {}) {
    const ctx = globalThis.SillyTavern?.getContext?.();
    if (!ctx) {
      throw new Error("无法获取 SillyTavern 上下文，请检查酒馆版本");
    }

    // 优先用 ctx.generateRaw（最稳定的内部 API）
    if (typeof ctx.generateRaw === "function") {
      const systemMsgs = messages.filter(m => m.role === "system").map(m => m.content).join("\n\n");
      const userMsgs = messages.filter(m => m.role !== "system");
      const lastUser = userMsgs.filter(m => m.role === "user").pop();
      const userPrompt = lastUser ? lastUser.content : "";

      try {
        const result = await ctx.generateRaw({
          prompt: userPrompt,
          systemPrompt: systemMsgs,
          jsonSchema: null,
        });
        return typeof result === "string" ? result : (result?.text || "");
      } catch (e) {
        console.warn("[剧情辅助器] generateRaw 失败，尝试备用方案:", e);
      }
    }

    // 备用方案：直接调用 ctx.generateQuietPrompt
    if (typeof ctx.generateQuietPrompt === "function") {
      const combined = messages
        .map(m => `[${m.role}]\n${m.content}`)
        .join("\n\n");
      const result = await ctx.generateQuietPrompt(combined, false, false);
      return typeof result === "string" ? result : "";
    }

    throw new Error("当前酒馆版本不支持自动 LLM 调用，请联系开发者");
  }
}
