// ============================================================
// DrawerUI 主界面（双模式：抽屉 ⇄ 浮窗）
// 修补包 2-A.1：
//   ① 由 index.js 负责关闭魔法棒菜单
//   ② 预览模态框尺寸/层级修复
//   ③ 世界书列表固定高度，内部滚动
//   ④ 字段隔离说明：所有勾选/禁用列表都存在
//      extension_settings["tabbit-plot-helper"] 命名空间下，
//      绝不读写酒馆主设置（world_info.globalSelect / 世界书 entry.disable）
//   方案 C：双模式（抽屉/浮窗），手机端强制抽屉
// ============================================================

import { WorldInfoHelper } from "./world-info-helper.js";

const VIEW_MODE_KEY = "tabbit_view_mode";   // localStorage：drawer | floating
const FLOAT_RECT_KEY = "tabbit_float_rect"; // localStorage：{x,y,w,h}
const MOBILE_BREAKPOINT = 768;              // <= 768px 视为移动端，强制抽屉

export class DrawerUI {
  constructor({ extId, displayName, stateStore, settings, saveSettings }) {
    this.extId = extId;
    this.displayName = displayName;
    this.stateStore = stateStore;
    this.settings = settings;
    this.saveSettings = saveSettings;

    this.wiHelper = new WorldInfoHelper();
    this.rootEl = null;       // 根容器（可能是抽屉，也可能是浮窗）
    this.maskEl = null;       // 仅抽屉模式有
    this.activeTab = "outline";

    // 双模式
    this.viewMode = this._loadViewMode();   // drawer | floating
    this.isMobile = this._isMobile();
    if (this.isMobile) this.viewMode = "drawer"; // 手机端强制抽屉

    // 浮窗状态
    this._floatRect = this._loadFloatRect();
    this._isMaximized = false;
    this._dragState = null;
    this._resizeState = null;

    // 世界书状态
    this._availableBooks = [];
    this._expandedBooks = new Set();
    this._bookEntriesCache = {};

    this._render();
    this._bindCommonEvents();
    this._bindModeSpecificEvents();
    this._bindResponsive();
  }

  // ============================================================
  // 模式持久化
  // ============================================================
  _loadViewMode() {
    try {
      const v = localStorage.getItem(VIEW_MODE_KEY);
      return (v === "floating" || v === "drawer") ? v : "drawer";
    } catch { return "drawer"; }
  }
  _saveViewMode() {
    try { localStorage.setItem(VIEW_MODE_KEY, this.viewMode); } catch {}
  }
  _loadFloatRect() {
    try {
      const v = JSON.parse(localStorage.getItem(FLOAT_RECT_KEY) || "null");
      if (v && typeof v.x === "number") return v;
    } catch {}
    // 默认浮窗位置：右上角偏内 540×640
    const w = Math.min(540, window.innerWidth - 80);
    const h = Math.min(640, window.innerHeight - 80);
    return {
      x: window.innerWidth - w - 40,
      y: 60,
      w,
      h,
    };
  }
  _saveFloatRect() {
    try { localStorage.setItem(FLOAT_RECT_KEY, JSON.stringify(this._floatRect)); } catch {}
  }
  _isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  // ============================================================
  // 渲染
  // ============================================================
  _render() {
    document.getElementById("tabbit-drawer")?.remove();
    document.getElementById("tabbit-drawer-mask")?.remove();
    document.getElementById("tabbit-floating")?.remove();

    if (this.viewMode === "drawer") {
      this._renderDrawer();
    } else {
      this._renderFloating();
    }
  }

  _renderDrawer() {
    this.maskEl = document.createElement("div");
    this.maskEl.id = "tabbit-drawer-mask";
    document.body.appendChild(this.maskEl);

    this.rootEl = document.createElement("div");
    this.rootEl.id = "tabbit-drawer";
    this.rootEl.innerHTML = this._getInnerHTML();
    document.body.appendChild(this.rootEl);
  }

  _renderFloating() {
    this.maskEl = null;
    this.rootEl = document.createElement("div");
    this.rootEl.id = "tabbit-floating";
    this.rootEl.innerHTML = this._getInnerHTML();
    document.body.appendChild(this.rootEl);

    // 应用浮窗位置/尺寸
    this._applyFloatRect();

    // 添加 4 边 + 4 角的缩放手柄
    const handles = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
    handles.forEach(dir => {
      const h = document.createElement("div");
      h.className = `tabbit-resize-handle tabbit-resize-`;
      h.dataset.dir = dir;
      this.rootEl.appendChild(h);
    });
  }

  _applyFloatRect() {
    if (!this.rootEl || this.viewMode !== "floating") return;
    const r = this._floatRect;
    // 边界保护
    r.x = Math.max(0, Math.min(r.x, window.innerWidth - 200));
    r.y = Math.max(0, Math.min(r.y, window.innerHeight - 100));
    r.w = Math.max(360, Math.min(r.w, window.innerWidth));
    r.h = Math.max(280, Math.min(r.h, window.innerHeight));

    Object.assign(this.rootEl.style, {
      left: `px`,
      top: `px`,
      width: `px`,
      height: `px`,
    });
  }

  _getInnerHTML() {
    const modeIcon = this.viewMode === "drawer" ? "fa-window-restore" : "fa-window-maximize";
    const modeTitle = this.viewMode === "drawer" ? "切换为浮窗模式" : "切换为抽屉模式";
    const showModeBtn = !this.isMobile; // 手机端不显示模式切换按钮

    const showMaxBtn = this.viewMode === "floating";

    return `
      <div class="tabbit-header" data-drag-handle>
        <div class="tabbit-title">
          <i class="fa-solid fa-feather-pointed tabbit-title-icon"></i>
          <span>📖 剧情辅助器</span>
        </div>
        <div class="tabbit-header-actions">
          
          
          <button class="tabbit-icon-btn" data-action="close" title="关闭">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
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

      <div class="tabbit-body">
        <div class="tabbit-pane active" data-pane="outline"></div>
        <div class="tabbit-pane" data-pane="options"></div>
        <div class="tabbit-pane" data-pane="settings"></div>
      </div>
    `;
  }

  _getOutlinePlaceholder() {
    return `
      <div class="tabbit-placeholder">
        <div class="tabbit-placeholder-icon"><i class="fa-solid fa-scroll"></i></div>
        <div class="tabbit-placeholder-title">主线大纲生成</div>
        <div class="tabbit-placeholder-desc">
          阶段 2-B 即将填入完整流程：<br>
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
          阶段 3 实现：5 个方向直接生成第一人称情节，可一键填入聊天框<br>
          建议切换到「浮窗模式」使用，可同时看到 AI 回复
        </div>
      </div>
    `;
  }

  // ============================================================
  // 设置面板（保持 2-A 内容，仅微调世界书容器结构）
  // ============================================================
  _getSettingsHTML() {
    const s = this.settings;
    const isCustom = s.context.messageMode === "custom";

    return `
      <div class="tabbit-section">
        <h4><i class="fa-solid fa-circle-info"></i> 当前进度</h4>
        <div class="tabbit-hint">
          阶段 2-A 已就绪：自定义区间、世界书管理可用。<br>
          下次更新将填入主线大纲完整功能。
        </div>
      </div>

      <div class="tabbit-section">
        <h4><i class="fa-solid fa-comments"></i> 上下文调用</h4>

        <div class="tabbit-row">
          <label for="tabbit-set-msgmode">聊天记录注入</label>
          <select id="tabbit-set-msgmode" class="tabbit-select" style="max-width:180px">
            <option value="recent20">最近 20 条</option>
            <option value="recent50">最近 50 条</option>
            <option value="recent100">最近 100 条</option>
            <option value="all">全部消息</option>
            <option value="custom">自定义区间</option>
          </select>
        </div>

        <div id="tabbit-custom-range" style="display:; margin-top:8px;">
          <div class="tabbit-hint" style="margin-bottom:6px;">指定从第几楼到第几楼（楼层从 0 开始）</div>
          <div style="display:flex; gap:8px; align-items:center;">
            <span style="font-size:13px;">从</span>
            <input type="number" id="tabbit-set-rangestart" class="tabbit-input"
                   style="max-width:90px;" min="0" value="">
            <span style="font-size:13px;">楼 到</span>
            <input type="number" id="tabbit-set-rangeend" class="tabbit-input"
                   style="max-width:90px;" min="0" value="">
            <span style="font-size:13px;">楼</span>
          </div>
        </div>

        <div class="tabbit-row" style="margin-top:12px;">
          <label for="tabbit-set-includecard">包含角色卡</label>
          <input type="checkbox" id="tabbit-set-includecard" class="tabbit-checkbox" >
        </div>
        <div class="tabbit-row">
          <label for="tabbit-set-includepersona">包含用户人设</label>
          <input type="checkbox" id="tabbit-set-includepersona" class="tabbit-checkbox" >
        </div>
        <div class="tabbit-row">
          <label for="tabbit-set-includewi">包含世界书</label>
          <input type="checkbox" id="tabbit-set-includewi" class="tabbit-checkbox" >
        </div>
      </div>

      <div class="tabbit-section">
        <h4><i class="fa-solid fa-book"></i> 世界书管理</h4>
        <div class="tabbit-hint" style="margin-bottom:10px;">
          仅作用于本插件：勾选要参与上下文的世界书并管理条目开关。<br>
          <b style="color:#10b981;">不会修改酒馆主设置中的世界书状态。</b>
        </div>
        <!-- 修复 ③：固定高度盒子，内部滚动 -->
        <div id="tabbit-wi-box" class="tabbit-wi-box">
          <div id="tabbit-wi-list">
            <div class="tabbit-placeholder" style="padding:20px;">
              <div class="tabbit-placeholder-desc">正在加载世界书列表...</div>
            </div>
          </div>
        </div>
      </div>

      <div class="tabbit-section">
        <h4><i class="fa-solid fa-flask"></i> 高级叙事模块</h4>
        <div class="tabbit-row">
          <label for="tabbit-set-fakevictory">中期伪胜利</label>
          <input type="checkbox" id="tabbit-set-fakevictory" class="tabbit-checkbox" >
        </div>
        <div class="tabbit-hint">第二幕中段插入「赢了却输得更惨」的转折。</div>

        <div class="tabbit-row" style="margin-top:10px">
          <label for="tabbit-set-themeimg">主题意象</label>
          <input type="checkbox" id="tabbit-set-themeimg" class="tabbit-checkbox" >
        </div>
        <div class="tabbit-hint">为故事设定反复出现的核心象征物。</div>
      </div>

      <div class="tabbit-section">
        <h4><i class="fa-solid fa-plug"></i> API 配置</h4>
        <div class="tabbit-row">
          <label for="tabbit-set-apimode">API 模式</label>
          <select id="tabbit-set-apimode" class="tabbit-select" style="max-width:180px">
            <option value="follow">跟随酒馆主 API</option>
            <option value="independent">独立 API（阶段 4）</option>
          </select>
        </div>
      </div>

      <div class="tabbit-section">
        <h4><i class="fa-solid fa-sliders"></i> 预设破限</h4>
        <div class="tabbit-hint" style="margin-bottom:8px;">
          <b style="color:#10b981;">仅作用于本插件，不会切换酒馆当前激活的预设。</b>
        </div>
        <div class="tabbit-row">
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
  // 通用事件
  // ============================================================
  _bindCommonEvents() {
    // 渲染初始内容
    this._renderPanes();

    // 关闭
    this.rootEl.querySelector("[data-action='close']")
      ?.addEventListener("click", () => this.close());

    // Tab 切换
    this.rootEl.querySelectorAll(".tabbit-tab").forEach(btn => {
      btn.addEventListener("click", () => this._switchTab(btn.dataset.tab));
    });

    // 模式切换按钮
    this.rootEl.querySelector("[data-action='switch-mode']")
      ?.addEventListener("click", () => this._switchMode());

    // 最大化/还原
    this.rootEl.querySelector("[data-action='toggle-maximize']")
      ?.addEventListener("click", () => this._toggleMaximize());

    // 设置面板事件
    this._bindSettingsEvents();
  }

  _renderPanes() {
    this.rootEl.querySelector("[data-pane='outline']").innerHTML = this._getOutlinePlaceholder();
    this.rootEl.querySelector("[data-pane='options']").innerHTML = this._getOptionsPlaceholder();
    this.rootEl.querySelector("[data-pane='settings']").innerHTML = this._getSettingsHTML();
  }

  _bindModeSpecificEvents() {
    if (this.viewMode === "drawer") {
      this.maskEl?.addEventListener("click", () => this.close());
    } else {
      // 浮窗：拖拽 + 缩放
      this._bindDrag();
      this._bindResize();
    }
  }

  _bindResponsive() {
    window.addEventListener("resize", this._onWindowResize = () => {
      const wasMobile = this.isMobile;
      this.isMobile = this._isMobile();
      if (this.isMobile && this.viewMode === "floating") {
        // 切到手机端，强制抽屉
        this.viewMode = "drawer";
        this._saveViewMode();
        const wasOpen = this.rootEl?.classList.contains("open");
        this._render();
        this._bindCommonEvents();
        this._bindModeSpecificEvents();
        if (wasOpen) this.open();
      } else if (this.viewMode === "floating") {
        this._applyFloatRect();
      }
    });
  }

  // ============================================================
  // 模式切换
  // ============================================================
  _switchMode() {
    if (this.isMobile) {
      this._showToast("移动端仅支持抽屉模式");
      return;
    }
    this.viewMode = this.viewMode === "drawer" ? "floating" : "drawer";
    this._saveViewMode();

    this._render();
    this._bindCommonEvents();
    this._bindModeSpecificEvents();
    this.open();
    this._showToast(`已切换到`);
  }

  _toggleMaximize() {
    if (this.viewMode !== "floating") return;
    if (this._isMaximized) {
      this._floatRect = this._floatRectBeforeMax || this._floatRect;
      this._isMaximized = false;
    } else {
      this._floatRectBeforeMax = { ...this._floatRect };
      this._floatRect = { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
      this._isMaximized = true;
    }
    this._applyFloatRect();
    this._saveFloatRect();
  }

  // ============================================================
  // 拖拽
  // ============================================================
  _bindDrag() {
    const handle = this.rootEl.querySelector("[data-drag-handle]");
    if (!handle) return;

    const onStart = (clientX, clientY) => {
      if (this._isMaximized) return;
      this._dragState = {
        startX: clientX, startY: clientY,
        origX: this._floatRect.x, origY: this._floatRect.y,
      };
      document.body.style.userSelect = "none";
    };

    handle.addEventListener("mousedown", (e) => {
      if (e.target.closest(".tabbit-icon-btn")) return; // 点按钮不触发拖拽
      onStart(e.clientX, e.clientY);
    });
    handle.addEventListener("touchstart", (e) => {
      if (e.target.closest(".tabbit-icon-btn")) return;
      const t = e.touches[0];
      onStart(t.clientX, t.clientY);
    }, { passive: true });

    const onMove = (clientX, clientY) => {
      if (!this._dragState) return;
      const dx = clientX - this._dragState.startX;
      const dy = clientY - this._dragState.startY;
      this._floatRect.x = this._dragState.origX + dx;
      this._floatRect.y = this._dragState.origY + dy;
      this._applyFloatRect();
    };

    document.addEventListener("mousemove", this._onDragMove = (e) => onMove(e.clientX, e.clientY));
    document.addEventListener("touchmove", this._onDragTouchMove = (e) => {
      if (!this._dragState) return;
      const t = e.touches[0];
      onMove(t.clientX, t.clientY);
    }, { passive: true });

    const onEnd = () => {
      if (this._dragState) {
        this._dragState = null;
        document.body.style.userSelect = "";
        this._saveFloatRect();
      }
    };
    document.addEventListener("mouseup", this._onDragEnd = onEnd);
    document.addEventListener("touchend", this._onDragTouchEnd = onEnd);
  }

  // ============================================================
  // 缩放
  // ============================================================
  _bindResize() {
    const handles = this.rootEl.querySelectorAll(".tabbit-resize-handle");
    handles.forEach(h => {
      const dir = h.dataset.dir;
      const start = (clientX, clientY) => {
        if (this._isMaximized) return;
        this._resizeState = {
          dir,
          startX: clientX, startY: clientY,
          origX: this._floatRect.x, origY: this._floatRect.y,
          origW: this._floatRect.w, origH: this._floatRect.h,
        };
        document.body.style.userSelect = "none";
      };
      h.addEventListener("mousedown", (e) => { e.stopPropagation(); start(e.clientX, e.clientY); });
      h.addEventListener("touchstart", (e) => {
        e.stopPropagation();
        const t = e.touches[0]; start(t.clientX, t.clientY);
      }, { passive: true });
    });

    const onMove = (clientX, clientY) => {
      if (!this._resizeState) return;
      const s = this._resizeState;
      const dx = clientX - s.startX;
      const dy = clientY - s.startY;
      const r = this._floatRect;
      const minW = 360, minH = 280;

      if (s.dir.includes("e")) r.w = Math.max(minW, s.origW + dx);
      if (s.dir.includes("s")) r.h = Math.max(minH, s.origH + dy);
      if (s.dir.includes("w")) {
        const newW = Math.max(minW, s.origW - dx);
        r.x = s.origX + (s.origW - newW);
        r.w = newW;
      }
      if (s.dir.includes("n")) {
        const newH = Math.max(minH, s.origH - dy);
        r.y = s.origY + (s.origH - newH);
        r.h = newH;
      }
      this._applyFloatRect();
    };

    document.addEventListener("mousemove", this._onResizeMove = (e) => onMove(e.clientX, e.clientY));
    document.addEventListener("touchmove", this._onResizeTouchMove = (e) => {
      if (!this._resizeState) return;
      const t = e.touches[0];
      onMove(t.clientX, t.clientY);
    }, { passive: true });

    const onEnd = () => {
      if (this._resizeState) {
        this._resizeState = null;
        document.body.style.userSelect = "";
        this._saveFloatRect();
      }
    };
    document.addEventListener("mouseup", this._onResizeEnd = onEnd);
    document.addEventListener("touchend", this._onResizeTouchEnd = onEnd);
  }

  // ============================================================
  // 设置事件（含世界书）
  // ============================================================
  _bindSettingsEvents() {
    const s = this.settings;
    const $ = (sel) => this.rootEl.querySelector(sel);

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

    const apiModeEl = $("#tabbit-set-apimode");
    if (apiModeEl) {
      apiModeEl.value = s.api.mode;
      apiModeEl.addEventListener("change", (e) => {
        s.api.mode = e.target.value;
        this.saveSettings();
        this._showToast("已保存");
      });
    }
    const presetModeEl = $("#tabbit-set-presetmode");
    if (presetModeEl) {
      presetModeEl.value = s.preset.mode;
      presetModeEl.addEventListener("change", (e) => {
        s.preset.mode = e.target.value;
        this.saveSettings();
        this._showToast("已保存");
      });
    }

    this._loadAndRenderWorldInfoList();
  }

  // ============================================================
  // 世界书（说明：仅写入插件命名空间，不动酒馆主世界信息）
  // ============================================================
  async _loadAndRenderWorldInfoList() {
    const container = this.rootEl.querySelector("#tabbit-wi-list");
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
            未检测到可用世界书。<br>请确认角色已绑定或全局已导入世界书。
          </div>
        </div>`;
      return;
    }
    this._renderWorldInfoList();
  }

  _renderWorldInfoList() {
    const container = this.rootEl.querySelector("#tabbit-wi-list");
    if (!container) return;

    const s = this.settings;
    const selectedBooks = s.context.extraWorldInfoBookNames || [];

    container.innerHTML = this._availableBooks.map(book => {
      const checked = selectedBooks.includes(book.name);
      const expanded = this._expandedBooks.has(book.name);
      const tag = book.source === "character" ? "角色绑定"
                : book.source === "chat" ? "聊天附加" : "已导入";
      const tagColor = book.source === "character" ? "#10b981"
                     : book.source === "chat" ? "#f59e0b" : "#6366f1";
      return `
        <div class="tabbit-wi-book" data-book="">
          <div class="tabbit-wi-book-header">
            <input type="checkbox" class="tabbit-checkbox tabbit-wi-checkbox"
                   data-book="" >
            <span class="tabbit-wi-bookname" data-book=""></span>
            <span class="tabbit-wi-tag" style="background:"></span>
            <button class="tabbit-wi-toggle" data-book="" title="">
              <i class="fa-solid fa-chevron-"></i>
            </button>
          </div>
          <div class="tabbit-wi-entries" data-book="" style="display:;">
            
          </div>
        </div>`;
    }).join("");

    container.querySelectorAll(".tabbit-wi-checkbox").forEach(cb => {
      cb.addEventListener("change", (e) => {
        const bookName = e.target.dataset.book;
        const arr = s.context.extraWorldInfoBookNames;
        const idx = arr.indexOf(bookName);
        if (e.target.checked && idx === -1) arr.push(bookName);
        if (!e.target.checked && idx !== -1) arr.splice(idx, 1);
        this.saveSettings();
        this._showToast("已保存（仅插件）");
      });
    });
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
        } catch {
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
    const disabledMap = this._getDisabledEntriesMap();
    const bookDisabled = disabledMap[bookName] || new Set();

    const html = entries.map(entry => {
      const isEnabled = !bookDisabled.has(entry.uid);
      const preview = (entry.content || "").slice(0, 80).replace(/
/g, " ");
      return `
        <div class="tabbit-wi-entry">
          <input type="checkbox" class="tabbit-checkbox tabbit-wi-entry-cb"
                 data-book="" data-uid=""
                 >
          <div class="tabbit-wi-entry-info">
            <div class="tabbit-wi-entry-title"></div>
            <div class="tabbit-wi-entry-key"></div>
            <div class="tabbit-wi-entry-preview"></div>
          </div>
          <button class="tabbit-wi-entry-eye" data-book="" data-uid="" title="查看完整内容">
            <i class="fa-solid fa-eye"></i>
          </button>
        </div>`;
    }).join("");

    setTimeout(() => this._bindEntryEvents(bookName), 0);
    return html;
  }

  _bindEntryEvents(bookName) {
    const container = this.rootEl?.querySelector(
      `.tabbit-wi-entries[data-book=""]`
    );
    if (!container) return;
    container.querySelectorAll(".tabbit-wi-entry-cb").forEach(cb => {
      cb.addEventListener("change", (e) => {
        const uid = parseInt(e.target.dataset.uid, 10);
        this._toggleEntryDisabled(bookName, uid, !e.target.checked);
      });
    });
    container.querySelectorAll(".tabbit-wi-entry-eye").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const uid = parseInt(e.currentTarget.dataset.uid, 10);
        this._showEntryPreview(bookName, uid);
      });
    });
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
    this._showToast(disabled ? "已禁用（仅插件）" : "已启用（仅插件）");
  }

  // ---------- 修复 ②：预览模态框 ----------
  _showEntryPreview(bookName, uid) {
    const entry = (this._bookEntriesCache[bookName] || []).find(e => e.uid === uid);
    if (!entry) return;

    document.getElementById("tabbit-entry-preview")?.remove();

    const modal = document.createElement("div");
    modal.id = "tabbit-entry-preview";
    modal.innerHTML = `
      <div class="tabbit-preview-mask" data-close="1"></div>
      <div class="tabbit-preview-box">
        <div class="tabbit-preview-header">
          <strong class="tabbit-preview-title"></strong>
          <button class="tabbit-preview-close" data-close="1" title="关闭">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="tabbit-preview-meta">
          <div><b>关键词：</b></div>
          <div><b>来源：</b></div>
        </div>
        <div class="tabbit-preview-content"></div>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => modal.remove();

    // 修复 ②：用事件委托，并阻止内容区点击冒泡
    modal.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) {
        close();
      }
    });
    modal.querySelector(".tabbit-preview-box").addEventListener("click", (e) => {
      if (!e.target.closest("[data-close]")) e.stopPropagation();
    });

    // ESC 关闭
    const onEsc = (e) => {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", onEsc);
      }
    };
    document.addEventListener("keydown", onEsc);
  }

  // ============================================================
  // 工具
  // ============================================================
  _switchTab(tabName) {
    this.activeTab = tabName;
    this.rootEl.querySelectorAll(".tabbit-tab").forEach(t => {
      t.classList.toggle("active", t.dataset.tab === tabName);
    });
    this.rootEl.querySelectorAll(".tabbit-pane").forEach(p => {
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
      fontSize: "13px", zIndex: "10003", pointerEvents: "none",
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

  // ============================================================
  // 公共接口
  // ============================================================
  open() {
    if (this.viewMode === "drawer") {
      this.maskEl?.classList.add("show");
      requestAnimationFrame(() => this.rootEl.classList.add("open"));
    } else {
      this.rootEl.classList.add("open");
      this._applyFloatRect();
    }
  }
  close() {
    this.rootEl?.classList.remove("open");
    this.maskEl?.classList.remove("show");
    document.getElementById("tabbit-entry-preview")?.remove();
  }
  onChatChanged() {
    // 阶段 2-B 会刷新主线大纲数据
  }
}
