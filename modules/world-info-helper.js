// ============================================================
// WorldInfoHelper：读取世界书数据
// 兼容多版本酒馆：SillyTavern.getContext / 全局变量 / fetch API
// ============================================================

export class WorldInfoHelper {

  // ---------- 获取所有可用世界书的"书名"列表 ----------
  // 返回：[{ name: "xxx", source: "character" | "global" | "chat" }]
  async getAllAvailableBooks() {
    const result = [];
    const seen = new Set();

    // 1. 当前角色绑定的世界书
    const charBooks = this._getCharacterBooks();
    for (const name of charBooks) {
      if (!seen.has(name)) {
        result.push({ name, source: "character" });
        seen.add(name);
      }
    }

    // 2. 当前聊天附加的世界书
    const chatBooks = this._getChatBooks();
    for (const name of chatBooks) {
      if (!seen.has(name)) {
        result.push({ name, source: "chat" });
        seen.add(name);
      }
    }

    // 3. 全局/已导入的所有世界书
    const allBooks = await this._getAllImportedBooks();
    for (const name of allBooks) {
      if (!seen.has(name)) {
        result.push({ name, source: "global" });
        seen.add(name);
      }
    }

    return result;
  }

  _getCharacterBooks() {
    try {
      const ctx = globalThis.SillyTavern?.getContext?.();
      if (!ctx) return [];

      const charId = ctx.characterId;
      const characters = ctx.characters;
      if (charId === undefined || charId === null || !characters) return [];

      const char = characters[charId];
      if (!char) return [];

      const books = new Set();

      // 主世界书
      const primary = char.data?.character_book?.name || char.data?.extensions?.world;
      if (primary) books.add(primary);

      // 附加世界书
      const extra = char.data?.extensions?.world_info?.charLore;
      if (Array.isArray(extra)) {
        for (const item of extra) {
          if (item?.extraBooks) item.extraBooks.forEach(b => books.add(b));
        }
      }

      // 从全局 world_info 字段读
      const charBookField = ctx.characters?.[charId]?.data?.extensions?.world;
      if (charBookField) books.add(charBookField);

      return Array.from(books).filter(Boolean);
    } catch (e) {
      console.warn("[剧情辅助器] 读取角色世界书失败:", e);
      return [];
    }
  }

  _getChatBooks() {
    try {
      const ctx = globalThis.SillyTavern?.getContext?.();
      if (!ctx) return [];
      const meta = ctx.chatMetadata;
      const list = meta?.world_info?.globalSelect || meta?.chat_world || [];
      return Array.isArray(list) ? list.filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  }

  async _getAllImportedBooks() {
    // 方法 1：通过 fetch /api/settings 或 /api/worldinfo
    try {
      const headers = this._getRequestHeaders();
      const resp = await fetch("/api/settings/get", {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data?.world_names)) {
          return data.world_names;
        }
      }
    } catch (e) {
      // 继续尝试下个方法
    }

    // 方法 2：全局变量 world_names
    try {
      if (Array.isArray(globalThis.world_names)) {
        return globalThis.world_names;
      }
    } catch (_) {}

    return [];
  }

  // ---------- 加载某本世界书的所有条目 ----------
  // 返回：[{ uid, comment, key, content, disable }]
  async loadBookEntries(bookName) {
    if (!bookName) return [];

    try {
      const headers = this._getRequestHeaders();
      const resp = await fetch("/api/worldinfo/get", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: bookName }),
      });

      if (!resp.ok) {
        console.warn(`[剧情辅助器] 无法加载世界书 ${bookName}: ${resp.status}`);
        return [];
      }

      const data = await resp.json();
      const entries = data?.entries || {};

      const list = Object.values(entries).map(e => ({
        uid: e.uid,
        comment: e.comment || "(无标题)",
        key: Array.isArray(e.key) ? e.key.join(", ") : (e.key || ""),
        content: e.content || "",
        disable: !!e.disable,
      }));

      // 按 uid 排序
      list.sort((a, b) => (a.uid || 0) - (b.uid || 0));
      return list;
    } catch (e) {
      console.warn(`[剧情辅助器] 加载世界书条目失败:`, e);
      return [];
    }
  }

  _getRequestHeaders() {
    try {
      if (typeof globalThis.getRequestHeaders === "function") {
        return globalThis.getRequestHeaders();
      }
    } catch (_) {}
    // 回退默认
    return {
      "Content-Type": "application/json",
    };
  }
}
