// ============================================================
// DrawerUI 抽屉式主界面
// 阶段 2-A：设置面板增加 自定义区间 + 世界书管理
// 主线大纲 / 剧情选项 仍为占位，阶段 2-B 实现
// ============================================================

import { WorldInfoHelper } from "./world-info-helper.js";

export class DrawerUI {
  constructor({ extId, displayName, stateStore, settings, saveSettings }) {
    this.extId = extId;
    this.displayName = displayName;
    this.stateStore = stateStore;
    this.settings = settings;
    this.saveSettings = saveSettings;

    this.wiHelper = new WorldInfoHelper();
    this.drawerEl = null;
    this.maskEl = null;
    this.activeTab = "outline";

    // 世界书相关本地状态
    this._availableBooks = [];     // [{ name, source }]
    this._expandedBooks = new Set(); // 当前展开的书名
    this._bookEntriesCache = {};   // { bookName: [entries...] }

    this._render();
    this._bindEvents();
  }

  _render() {
    document.getElementById("tabbit-drawer")?.remove();
    document.getElementById("tabbit-drawer-mask")?.remove();

    this.maskEl = document.createElement("div");
    this.maskEl.id = "tabbit-drawer-mask";
    document.body.appendChild(this.maskEl);

    this.drawerEl = document.createElement("div");
    this.drawerEl.id = "tabbit-drawer";
    this.drawerEl.innerHTML = this._getHTML();
    document.body.appendChild(this.drawerEl);
  }

  _getHTML() {
    return `
      <div class="tabbit-drawer-header">
        <div class="tabbit-drawer-title">
          <i class="fa-solid fa-feather-pointed tabbit-drawer-title-icon"></i>
          <span>📖 剧情辅助器</span>
        </div>
        <button class="tabbit-drawer-close" data-action="close" title="关闭">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="tabbit-tabs">
        <button class="tabbit-tab active" data-tab="outline">
          <i class="fa-solid fa-scroll"></i><span>主线大纲</span>
        </button>
        <button class="tabbit-tab" data-tab="options">
          <i class="fa-solid fa-list-check"></i><span>剧情选项</span>
        </button>
        <button class="tabbit-tab" data-tab="settings">
          <i class="fa-solid fa-gear"></i><span>设置</span>
        </button>
      </div>

      <div class="tabbit-drawer-body">
        <div class="tabbit-pane active" data-pane="outline">${this._getOutlinePlaceholder()}</div>
        <div class="tabbit-pane" data-pane="options">${this._getOptionsPlaceholder()}</div>
        <div class="tabbit-pane" data-pane="settings">${this._getSettingsHTML()}</div>
      </div>
    `;
  }

  _getOutlinePlaceholder() {
    return `
      <div class="tabbit-placeholder">
        <div class="tabbit-placeholder-icon"><i class="fa-solid fa-scroll"></i></div>
        <div class="tabbit-placeholder-title">主线大纲生成</div>
        <div class="tabbit-placeholder-desc">
          阶段 2-B 即将实现完整流程：<br>
          有想法 / 没想法 → 生成 3 个一句话钩子 → 选定 → 生成 3 个大纲
        </div>
      </div>
    `;
  }

  _getOptionsPlaceholder() {
    return `
      <div class="tabbit-placeholder">
        <div class="tabbit-placeholder-icon"><i class="fa-solid fa-list-check"></i></div>
        <div class="tabbit-placeholder-title">剧情选项生成</div>
        <div class="tabbit-placeholder-desc">
          阶段 3 实现：5 个方向直接生成第一人称情节，可一键填入聊天框
        </div>
      </div>
    `;
  }

  _getSettingsHTML() {
    const s = this.settings;
    const isCustom = s.context.messageMode === "custom";

    return `
      <div class="tabbit-settings-section">
        <h4><i class="fa-solid fa-circle-info"></i> 当前进度</h4>
        <div class="tabbit-settings-hint">
          阶段 2-A 已就绪：自定义区间、世界书管理可用。<br>
          阶段 2-B 将填入主线大纲完整功能。
        </div>
      </div>

      <div class="tabbit-settings-section">
        <h4><i class="fa-solid fa-comments"></i> 上下文调用</h4>

        <div class="tabbit-settings-row">
          <label for="tabbit-set-msgmode">聊天记录注入</label>
          <select id="tabbit-set-msgmode" class="tabbit-select" style="max-width:180px">
            <option value="recent20">最近 20 条</option>
            <option value="recent50">最近 50 条</option>
            <option value="recent100">最近 100 条</option>
            <option value="all">全部消息</option>
            <option value="custom">自定义区间</option>
          </select>
        </div>

        <div id="tabbit-custom-range" style="display:${isCustom ? 'block' : 'none'}; margin-top:8px;">
          <div class="tabbit-settings-hint" style="margin-bottom:6px;">
            指定从第几楼到第几楼（楼层从 0 开始计数）
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <span style="font-size:13px;">从</span>
            <input type="number" id="tabbit-set-rangestart" class="tabbit-input"
                   style="max-width:90px;" min="0" value="${s.context.customRangeStart}">
            <span style="font-size:13px;">楼 到</span>
            <input type="number" id="tabbit-set-rangeend" class="tabbit-input"
                   style="max-width:90px;" min="0" value="${s.context.customRangeEnd}">
            <span style="font-size:13px;">楼</span>
          </div>
        </div>

        <div class="tabbit-settings-row" style="margin-top:12px;">
          <label for="tabbit-set-includecard">包含角色卡</label>
          <input type="checkbox" id="tabbit-set-includecard" class="tabbit-checkbox"
                 ${s.context.includeCharacterCard ? 'checked' : ''}>
        </div>
        <div class="tabbit-settings-row">
          <label for="tabbit-set-includepersona">包含用户人设</label>
          <input type="checkbox" id="tabbit-set-includepersona" class="tabbit-checkbox"
                 ${s.context.includeUserPersona ? 'checked' : ''}>
        </div>
        <div class="tabbit-settings-row">
          <label for="tabbit-set-includewi">包含世界书</label>
          <input type="checkbox" id="tabbit-set-includewi" class="tabbit-checkbox"
                 ${s.context.includeWorldInfo ? 'checked' : ''}>
        </div>
      </div>

      <div class="tabbit-settings-section">
        <h4><i class="fa-solid fa-book"></i> 世界书管理</h4>
        <div class="tabbit-settings-hint" style="margin-bottom:10px;">
          勾选要参与上下文的世界书；点击书名展开可查看条目并选择启用。
          条目右侧的 👁 可以预览完整内容。
        </div>
        <div id="tabbit-wi-list">
          <div class="tabbit-placeholder" style="padding:20px;">
            <div class="tabbit-placeholder-desc">正在加载世界书列表...</div>
          </div>
        </div>
      </div>

      <div class="tabbit-settings-section">
        <h4><i class="fa-solid fa-flask"></i> 高级叙事模块</h4>
        <div class="tabbit-settings-row">
          <label for="tabbit-set-fakevictory">中期伪胜利</label>
          <input type="checkbox" id="tabbit-set-fakevictory" class="tabbit-checkbox"
                 ${s.advanced.midFakeVictory ? 'checked' : ''}>
        </div>
        <div class="tabbit-settings-hint">第二幕中段插入「赢了却输得更惨」的转折，重创主角初始信念。</div>

        <div class="tabbit-settings-row" style="margin-top:10px">
          <label for="tabbit-set-themeimg">主题意象</label>
          <input type="checkbox" id="tabbit-set-themeimg" class="tabbit-checkbox"
                 ${s.advanced.themeImage ? 'checked' : ''}>
        </div>
        <div class="tabbit-settings-hint">为故事设定反复出现的核心象征物，在剧情选项中以「意象低语」浮现。</div>
      </div>

      <div class="tabbit-settings-section">
        <h4><i class="fa-solid fa-plug"></i> API 配置</h4>
        <div class="tabbit-settings-row">
          <label for="tabbit-set-apimode">API 模式</label>
          <select id="tabbit-set-apimode" class="tabbit-select" style="max-width:180px">
            <option value="follow">跟随酒馆主 API</option>
            <option value="independent">独立 API（阶段 4）</option>
          </select>
        </div>
      </div>

      <div class="tabbit-settings-section">
        <h4><i class="fa-solid fa-sliders"></i> 预设破限</h4>
        <div class="tabbit-settings-row">
          <label for="tabbit-set-presetmode">预设</label>
          <select id="tabbit-set-presetmode" class="tabbit-select" style="max-width:180px">
            <option value="follow">跟随酒馆当前激活预设</option>
            <option value="custom">指定预设（阶段 4）</option>
          </select>
        </div>
      </div>
    `;
  }

  // ============================================================
  // 事件绑定
  // ============================================================
  _bindEvents() {
    this.drawerEl.querySelector("[data-action='close']").addEventListener("click", () => this.close());
    this.maskEl.addEventListener("click", () => this.close());

    this.drawerEl.querySelectorAll(".tabbit-tab").forEach(btn => {
      btn.addEventListener("click", () => this._switchTab(btn.dataset.tab));
    });

    this._bindSettingsEvents();
  }

  _bindSettingsEvents() {
    const s = this.settings;
    const $ = (sel) => this.drawerEl.querySelector(sel);

    // 聊天记录注入模式
    const msgModeEl = $("#tabbit-set-msgmode");
    if (msgModeEl) {
      msgModeEl.value = s.context.messageMode;
      msgModeEl.addEventListener("change", (e) => {
        s.context.messageMode = e.target.value;
        const customBox = $("#tabbit-custom-range");
        if (customBox) customBox.style.display = e.target.value === "custom" ? "block" : "none";
        this.saveSettings();
        this._showToast("已保存");
      });
    }

    // 自定义区间 from
    const rangeStartEl = $("#tabbit-set-rangestart");
    if (rangeStartEl) {
      rangeStartEl.addEventListener("change", (e) => {
        const v = Math.max(0, parseInt(e.target.value, 10) || 0);
        s.context.customRangeStart = v;
        e.target.value = v;
        if (s.context.customRangeEnd < v) {
          s.context.customRangeEnd = v;
          const endEl = $("#tabbit-set-rangeend");
          if (endEl) endEl.value = v;
        }
        this.saveSettings();
        this._showToast("已保存");
      });
    }

    // 自定义区间 to
    const rangeEndEl = $("#tabbit-set-rangeend");
    if (rangeEndEl) {
      rangeEndEl.addEventListener("change", (e) => {
        let v = parseInt(e.target.value, 10);
        if (isNaN(v) || v < 0) v = 0;
        if (v < s.context.customRangeStart) v = s.context.customRangeStart;
        s.context.customRangeEnd = v;
        e.target.value = v;
        this.saveSettings();
        this._showToast("已保存");
      });
    }

    // 包含选项
    const bindCheckbox = (id, path) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("change", (e) => {
        const keys = path.split(".");
        let obj = s;
        for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
        obj[keys[keys.length - 1]] = e.target.checked;
        this.saveSettings();
        this._showToast("已保存");
      });
    };
    bindCheckbox("#tabbit-set-includecard", "context.includeCharacterCard");
    bindCheckbox("#tabbit-set-includepersona", "context.includeUserPersona");
    bindCheckbox("#tabbit-set-includewi", "context.includeWorldInfo");
    bindCheckbox("#tabbit-set-fakevictory", "advanced.midFakeVictory");
    bindCheckbox("#tabbit-set-themeimg", "advanced.themeImage");

    // API 模式
    const apiModeEl = $("#tabbit-set-apimode");
    if (apiModeEl) {
      apiModeEl.value = s.api.mode;
      apiModeEl.addEventListener("change", (e) => {
        s.api.mode = e.target.value;
        this.saveSettings();
        this._showToast("已保存");
      });
    }

    // 预设模式
    const presetModeEl = $("#tabbit-set-presetmode");
    if (presetModeEl) {
      presetModeEl.value = s.preset.mode;
      presetModeEl.addEventListener("change", (e) => {
        s.preset.mode = e.target.value;
        this.saveSettings();
        this._showToast("已保存");
      });
    }

    // 加载世界书列表
    this._loadAndRenderWorldInfoList();
  }

  // ============================================================
  // 世界书管理
  // ============================================================
  async _loadAndRenderWorldInfoList() {
    const container = this.drawerEl.querySelector("#tabbit-wi-list");
    if (!container) return;

    try {
      this._availableBooks = await this.wiHelper.getAllAvailableBooks();
    } catch (e) {
      console.warn("[剧情辅助器] 加载世界书列表失败:", e);
      this._availableBooks = [];
    }

    if (this._availableBooks.length === 0) {
      container.innerHTML = `
        <div class="tabbit-placeholder" style="padding:20px;">
          <div class="tabbit-placeholder-desc">
            未检测到可用世界书。<br>
            请确认当前角色已绑定世界书，或在酒馆「世界信息」中已导入世界书。
          </div>
        </div>
      `;
      return;
    }

    this._renderWorldInfoList();
  }

  _renderWorldInfoList() {
    const container = this.drawerEl.querySelector("#tabbit-wi-list");
    if (!container) return;

    const s = this.settings;
    const selectedBooks = s.context.extraWorldInfoBookNames || [];

    container.innerHTML = this._availableBooks.map(book => {
      const checked = selectedBooks.includes(book.name);
      const expanded = this._expandedBooks.has(book.name);
      const tag = book.source === "character" ? "角色绑定"
                : book.source === "chat" ? "聊天附加"
                : "已导入";
      const tagColor = book.source === "character" ? "#10b981"
                     : book.source === "chat" ? "#f59e0b"
                     : "#6366f1";

      return `
        <div class="tabbit-wi-book" data-book="${this._escapeAttr(book.name)}">
          <div class="tabbit-wi-book-header">
            <input type="checkbox" class="tabbit-checkbox tabbit-wi-checkbox"
                   data-book="${this._escapeAttr(book.name)}"
                   ${checked ? 'checked' : ''}>
            <span class="tabbit-wi-bookname" data-book="${this._escapeAttr(book.name)}">
              ${this._escapeHtml(book.name)}
            </span>
            <span class="tabbit-wi-tag" style="background:${tagColor}">${tag}</span>
            <button class="tabbit-wi-toggle" data-book="${this._escapeAttr(book.name)}" title="${expanded ? '收起' : '展开条目'}">
              <i class="fa-solid fa-chevron-${expanded ? 'up' : 'down'}"></i>
            </button>
          </div>
          <div class="tabbit-wi-entries" data-book="${this._escapeAttr(book.name)}"
               style="display:${expanded ? 'block' : 'none'};">
            ${expanded ? this._renderEntriesHTML(book.name) : ''}
          </div>
        </div>
      `;
    }).join("");

    // 绑定勾选
    container.querySelectorAll(".tabbit-wi-checkbox").forEach(cb => {
      cb.addEventListener("change", (e) => {
        const bookName = e.target.dataset.book;
        const arr = s.context.extraWorldInfoBookNames;
        const idx = arr.indexOf(bookName);
        if (e.target.checked && idx === -1) arr.push(bookName);
        if (!e.target.checked && idx !== -1) arr.splice(idx, 1);
        this.saveSettings();
        this._showToast("已保存");
      });
    });

    // 绑定展开/收起
    container.querySelectorAll(".tabbit-wi-toggle, .tabbit-wi-bookname").forEach(el => {
      el.addEventListener("click", async (e) => {
        const bookName = e.currentTarget.dataset.book;
        await this._toggleBookExpand(bookName);
      });
    });
  }

  async _toggleBookExpand(bookName) {
    if (this._expandedBooks.has(bookName)) {
      this._expandedBooks.delete(bookName);
    } else {
      this._expandedBooks.add(bookName);
      if (!this._bookEntriesCache[bookName]) {
        try {
          this._bookEntriesCache[bookName] = await this.wiHelper.loadBookEntries(bookName);
        } catch (e) {
          console.warn(`[剧情辅助器] 加载条目失败:`, e);
          this._bookEntriesCache[bookName] = [];
        }
      }
    }
    this._renderWorldInfoList();
  }

  _renderEntriesHTML(bookName) {
    const entries = this._bookEntriesCache[bookName] || [];
    if (entries.length === 0) {
      return `<div class="tabbit-wi-empty">（该世界书无条目，或加载失败）</div>`;
    }

    const s = this.settings;
    const disabledMap = this._getDisabledEntriesMap();
    const bookDisabled = disabledMap[bookName] || new Set();

    return entries.map(entry => {
      const isEnabled = !entry.disable && !bookDisabled.has(entry.uid);
      const preview = (entry.content || "").slice(0, 80).replace(/\n/g, " ");
      return `
        <div class="tabbit-wi-entry">
          <input type="checkbox" class="tabbit-checkbox tabbit-wi-entry-cb"
                 data-book="${this._escapeAttr(bookName)}" data-uid="${entry.uid}"
                 ${isEnabled ? 'checked' : ''}>
          <div class="tabbit-wi-entry-info">
            <div class="tabbit-wi-entry-title">${this._escapeHtml(entry.comment)}</div>
            <div class="tabbit-wi-entry-key">${this._escapeHtml(entry.key) || '(无关键词)'}</div>
            <div class="tabbit-wi-entry-preview">${this._escapeHtml(preview)}${entry.content.length > 80 ? '...' : ''}</div>
          </div>
          <button class="tabbit-wi-entry-eye" data-book="${this._escapeAttr(bookName)}" data-uid="${entry.uid}" title="查看完整内容">
            <i class="fa-solid fa-eye"></i>
          </button>
        </div>
      `;
    }).join("") + this._bindEntryEventsAfterRender(bookName);
  }

  _bindEntryEventsAfterRender(bookName) {
    setTimeout(() => {
      const container = this.drawerEl.querySelector(`.tabbit-wi-entries[data-book="${this._escapeAttr(bookName)}"]`);
      if (!container) return;

      container.querySelectorAll(".tabbit-wi-entry-cb").forEach(cb => {
        cb.addEventListener("change", (e) => {
          const uid = parseInt(e.target.dataset.uid, 10);
          const book = e.target.dataset.book;
          this._toggleEntryDisabled(book, uid, !e.target.checked);
        });
      });

      container.querySelectorAll(".tabbit-wi-entry-eye").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const uid = parseInt(e.currentTarget.dataset.uid, 10);
          const book = e.currentTarget.dataset.book;
          this._showEntryPreview(book, uid);
        });
      });
    }, 0);
    return "";
  }

  _getDisabledEntriesMap() {
    const s = this.settings;
    if (!s.context.disabledEntries) s.context.disabledEntries = {};
    const result = {};
    for (const [book, uids] of Object.entries(s.context.disabledEntries)) {
      result[book] = new Set(uids);
    }
    return result;
  }

  _toggleEntryDisabled(bookName, uid, disabled) {
    const s = this.settings;
    if (!s.context.disabledEntries) s.context.disabledEntries = {};
    if (!s.context.disabledEntries[bookName]) s.context.disabledEntries[bookName] = [];

    const arr = s.context.disabledEntries[bookName];
    const idx = arr.indexOf(uid);

    if (disabled && idx === -1) arr.push(uid);
    if (!disabled && idx !== -1) arr.splice(idx, 1);

    this.saveSettings();
    this._showToast(disabled ? "已禁用条目" : "已启用条目");
  }

  _showEntryPreview(bookName, uid) {
    const entry = (this._bookEntriesCache[bookName] || []).find(e => e.uid === uid);
    if (!entry) return;

    // 简易模态预览
    const old = document.getElementById("tabbit-entry-preview");
    if (old) old.remove();

    const modal = document.createElement("div");
    modal.id = "tabbit-entry-preview";
    modal.innerHTML = `
      <div class="tabbit-preview-mask"></div>
      <div class="tabbit-preview-box">
        <div class="tabbit-preview-header">
          <strong>${this._escapeHtml(entry.comment)}</strong>
          <button class="tabbit-preview-close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="tabbit-preview-meta">
          <div><b>关键词：</b>${this._escapeHtml(entry.key) || '(无)'}</div>
          <div><b>来源：</b>${this._escapeHtml(bookName)}</div>
        </div>
        <div class="tabbit-preview-content">${this._escapeHtml(entry.content)}</div>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector(".tabbit-preview-mask").addEventListener("click", close);
    modal.querySelector(".tabbit-preview-close").addEventListener("click", close);
  }

  // ============================================================
  // 工具
  // ============================================================
  _switchTab(tabName) {
    this.activeTab = tabName;
    this.drawerEl.querySelectorAll(".tabbit-tab").forEach(t => {
      t.classList.toggle("active", t.dataset.tab === tabName);
    });
    this.drawerEl.querySelectorAll(".tabbit-pane").forEach(p => {
      p.classList.toggle("active", p.dataset.pane === tabName);
    });
  }

  _showToast(msg) {
    document.querySelector(".tabbit-toast-tip")?.remove();
    const tip = document.createElement("div");
    tip.className = "tabbit-toast-tip";
    tip.textContent = msg;
    Object.assign(tip.style, {
      position: "fixed", bottom: "30px", left: "50%",
      transform: "translateX(-50%)", background: "rgba(0,0,0,0.85)",
      color: "white", padding: "10px 18px", borderRadius: "6px",
      fontSize: "13px", zIndex: "10001", pointerEvents: "none",
    });
    document.body.appendChild(tip);
    setTimeout(() => tip.remove(), 1500);
  }

  _escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  _escapeAttr(s) { return this._escapeHtml(s); }

  open() {
    this.maskEl.classList.add("show");
    requestAnimationFrame(() => this.drawerEl.classList.add("open"));
  }
  close() {
    this.drawerEl.classList.remove("open");
    this.maskEl.classList.remove("show");
  }
  onChatChanged() {
    // 阶段 2-B 会刷新主线大纲数据
  }
}
