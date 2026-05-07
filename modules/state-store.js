// ============================================================
// StateStore：统一管理扩展运行时状态
// 职责：
//   1. 维护当前聊天的状态（活动大纲、历史钩子、历史大纲、历史选项等）
//   2. 数据自动绑定到 chat_metadata，切换聊天时自动加载
//   3. 提供给 UI 和功能流程统一的读写接口
// 阶段 1：仅搭骨架，提供基础读写。阶段 2/3 会扩充具体业务方法。
// ============================================================

const STORE_KEY = "tabbit_plot_data";

const DEFAULT_CHAT_DATA = {
  // 主线大纲流程
  outline: {
    activeOutline: null,           // 用户最终确认的活动大纲
    hookHistory: [],               // 钩子生成历史（每次重新生成都追加）
    outlineHistory: [],            // 大纲生成历史
    selectedHook: null,            // 用户选中的钩子（确认后清空 hookHistory）
    inProgressMode: null,          // "with-idea" / "no-idea" / null
    userIdea: "",                  // 用户输入的想法（with-idea 模式）
    selectedEngines: [],           // 选中的灵感引擎（no-idea 模式）
  },

  // 剧情选项流程
  options: {
    optionHistory: [],             // 选项生成历史
    lastGeneratedAt: null,
  },

  // 主题意象（高级模块）
  themeImage: null,
};

export class StateStore {
  constructor(extId) {
    this.extId = extId;
    this._cache = null;
  }

  // ---------- 内部：获取 chat_metadata ----------
  _getChatMetadata() {
    try {
      const ctx = (typeof globalThis.SillyTavern?.getContext === "function")
        ? globalThis.SillyTavern.getContext()
        : null;
      if (ctx && ctx.chatMetadata) return ctx.chatMetadata;
      if (typeof globalThis.chat_metadata === "object") return globalThis.chat_metadata;
    } catch (_) {}
    return null;
  }

  _saveChatMetadata() {
    try {
      const ctx = (typeof globalThis.SillyTavern?.getContext === "function")
        ? globalThis.SillyTavern.getContext()
        : null;
      if (ctx && typeof ctx.saveMetadata === "function") {
        ctx.saveMetadata();
        return;
      }
      if (typeof globalThis.saveMetadataDebounced === "function") {
        globalThis.saveMetadataDebounced();
      }
    } catch (e) {
      console.warn(`[${this.extId}] saveMetadata 失败:`, e);
    }
  }

  // ---------- 公开：读取/写入当前聊天的扩展数据 ----------
  getData() {
    if (this._cache) return this._cache;

    const meta = this._getChatMetadata();
    if (!meta) {
      this._cache = JSON.parse(JSON.stringify(DEFAULT_CHAT_DATA));
      return this._cache;
    }

    if (!meta[STORE_KEY]) {
      meta[STORE_KEY] = JSON.parse(JSON.stringify(DEFAULT_CHAT_DATA));
    } else {
      // 兼容旧数据：补全缺失字段
      this._mergeDefaults(meta[STORE_KEY], DEFAULT_CHAT_DATA);
    }

    this._cache = meta[STORE_KEY];
    return this._cache;
  }

  save() {
    const meta = this._getChatMetadata();
    if (meta && this._cache) {
      meta[STORE_KEY] = this._cache;
      this._saveChatMetadata();
    }
  }

  _mergeDefaults(target, defaults) {
    for (const key of Object.keys(defaults)) {
      if (target[key] === undefined || target[key] === null) {
        target[key] = JSON.parse(JSON.stringify(defaults[key]));
        continue;
      }
      if (
        typeof defaults[key] === "object" &&
        !Array.isArray(defaults[key]) &&
        typeof target[key] === "object" &&
        !Array.isArray(target[key])
      ) {
        this._mergeDefaults(target[key], defaults[key]);
      }
    }
  }

  // ---------- 切换聊天时清空缓存 ----------
  onChatChanged() {
    this._cache = null;
  }
}

