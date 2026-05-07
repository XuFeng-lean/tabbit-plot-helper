// ============================================================
// StateStore：统一管理扩展运行时状态
// 阶段 2-A：增加世界书条目开关、自定义区间字段
// ============================================================

const STORE_KEY = "tabbit_plot_data";

const DEFAULT_CHAT_DATA = {
  // 主线大纲流程
  outline: {
    activeOutline: null,
    hookHistory: [],
    outlineHistory: [],
    selectedHook: null,
    inProgressMode: null,
    userIdea: "",
    selectedEngines: [],
  },

  // 剧情选项流程
  options: {
    optionHistory: [],
    lastGeneratedAt: null,
  },

  // 主题意象
  themeImage: null,
};

export class StateStore {
  constructor(extId) {
    this.extId = extId;
    this._cache = null;
  }

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
      console.warn(`[剧情辅助器] saveMetadata 失败:`, e);
    }
  }

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

  onChatChanged() {
    this._cache = null;
  }
}

