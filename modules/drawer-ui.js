// ============================================================
// DrawerUI：抽屉式主界面
// 阶段 1：仅渲染骨架（三个 Tab + 占位内容 + 设置面板入口）
// 阶段 2：填入主线大纲完整功能
// 阶段 3：填入剧情选项完整功能
// 阶段 4：填入设置面板完整功能
// ============================================================

export class DrawerUI {
  constructor({ extId, displayName, stateStore, settings, saveSettings }) {
    this.extId = extId;
    this.displayName = displayName;
    this.stateStore = stateStore;
    this.settings = settings;
    this.saveSettings = saveSettings;

    this.drawerEl = null;
    this.maskEl = null;
    this.activeTab = "outline";

    this._render();
    this._bindEvents();
  }

  _render() {
    // 移除旧的（防止重复）
    document.getElementById("tabbit-drawer")?.remove();
    document.getElementById("tabbit-drawer-mask")?.remove();

    // 遮罩
    this.maskEl = document.createElement("div");
    this.maskEl.id = "tabbit-drawer-mask";
    document.body.appendChild(this.maskEl);

    // 抽屉
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
          <span>📖 ${this.displayName}</span>
        </div>
        <button class="tabbit-drawer-close" data-action="close" title="关闭">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="tabbit-tabs">
        <button class="tabbit-tab active" data-tab="outline">
          <i class="fa-solid fa-scroll"></i>
          <span>主线大纲</span>
        </button>
        <button class="tabbit-tab" data-tab="options">
          <i class="fa-solid fa-list-check"></i>
          <span>剧情选项</span>
        </button>
        <button class="tabbit-tab" data-tab="settings">
          <i class="fa-solid fa-gear"></i>
          <span>设置</span>
        </button>
      </div>

      <div class="tabbit-drawer-body">
        <div class="tabbit-pane active" data-pane="outline">
          ${this._getOutlinePlaceholder()}
        </div>
        <div class="tabbit-pane" data-pane="options">
          ${this._getOptionsPlaceholder()}
        </div>
        <div class="tabbit-pane" data-pane="settings">
          ${this._getSettingsHTML()}
        </div>
      </div>
    `;
  }

  _getOutlinePlaceholder() {
    return `
      <div class="tabbit-placeholder">
        <div class="tabbit-placeholder-icon"><i class="fa-solid fa-scroll"></i></div>
        <div class="tabbit-placeholder-title">主线大纲生成</div>
        <div class="tabbit-placeholder-desc">
          阶段 2 将在这里实现：<br>
          有想法 → 输入内容 → 生成 3 个一句话钩子 → 选定 → 生成 3 个大纲<br>
          没想法 → 多选灵感引擎 → 同上流程<br>
          每一步都保留生成历史，确认后才清除。
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
          阶段 3 将在这里实现：<br>
          5 个方向（主线推进 / 关系演变 / 机会意外 / 暗流涌动 / 内在冲突）<br>
          每个方向直接生成第一人称情节，点击「使用」自动填入聊天输入框。<br>
          支持重新生成与历史回看。
        </div>
      </div>
    `;
  }

  _getSettingsHTML() {
    const s = this.settings;
    return `
      <div class="tabbit-settings-section">
        <h4><i class="fa-solid fa-circle-info"></i> 当前进度</h4>
        <div class="tabbit-settings-hint">
          这是阶段 1 的骨架版本，UI 结构与设置已就绪，但功能逻辑（大纲生成 / 剧情选项 / 完整上下文调用 / 独立 API）将在阶段 2-4 陆续填入。
          请确认抽屉能正常打开、Tab 能切换、下面的设置能保存——这就是阶段 1 的验证标准。
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
        <div class="tabbit-settings-hint">阶段 4 将在此处加入：自定义区间输入、标签过滤、世界书条目勾选与预览。</div>
      </div>

      <div class="tabbit-settings-section">
        <h4><i class="fa-solid fa-flask"></i> 高级叙事模块</h4>
        <div class="tabbit-settings-row">
          <label for="tabbit-set-fakevictory">中期伪胜利</label>
          <input type="checkbox" id="tabbit-set-fakevictory" class="tabbit-checkbox" ${s.advanced.midFakeVictory ? "checked" : ""}>
        </div>
        <div class="tabbit-settings-hint">在第二幕中段插入「以为赢了却输得更惨」的转折，重创主角初始信念。默认关闭。</div>

        <div class="tabbit-settings-row" style="margin-top:10px">
          <label for="tabbit-set-themeimg">主题意象</label>
          <input type="checkbox" id="tabbit-set-themeimg" class="tabbit-checkbox" ${s.advanced.themeImage ? "checked" : ""}>
        </div>
        <div class="tabbit-settings-hint">为故事设定一个反复出现的核心象征物，在剧情选项中偶尔以「意象低语」形式浮现。默认关闭。</div>
      </div>

      <div class="tabbit-settings-section">
        <h4><i class="fa-solid fa-plug"></i> API 配置</h4>
        <div class="tabbit-settings-row">
          <label for="tabbit-set-apimode">API 模式</label>
          <select id="tabbit-set-apimode" class="tabbit-select" style="max-width:180px">
            <option value="follow">跟随酒馆主 API</option>
            <option value="independent">独立 API（阶段 4 启用）</option>
          </select>
        </div>
        <div class="tabbit-settings-hint">独立 API 配置（Base URL / Key / 模型 / 测试连接）将在阶段 4 完整实现。</div>
      </div>

      <div class="tabbit-settings-section">
        <h4><i class="fa-solid fa-sliders"></i> 预设破限</h4>
        <div class="tabbit-settings-row">
          <label for="tabbit-set-presetmode">预设</label>
          <select id="tabbit-set-presetmode" class="tabbit-select" style="max-width:180px">
            <option value="follow">跟随酒馆当前激活预设</option>
            <option value="custom">指定预设（阶段 4 启用）</option>
          </select>
        </div>
        <div class="tabbit-settings-hint">阶段 4 将列出酒馆里已导入的所有预设供选择。</div>
      </div>
    `;
  }

  _bindEvents() {
    // 关闭
    this.drawerEl.querySelector("[data-action='close']").addEventListener("click", () => this.close());
    this.maskEl.addEventListener("click", () => this.close());

    // Tab 切换
    this.drawerEl.querySelectorAll(".tabbit-tab").forEach(tabBtn => {
      tabBtn.addEventListener("click", () => this._switchTab(tabBtn.dataset.tab));
    });

    // 设置项绑定
    this._bindSettingsEvents();
  }

  _bindSettingsEvents() {
    const s = this.settings;
    const $ = (id) => this.drawerEl.querySelector(id);

    const msgModeEl = $("#tabbit-set-msgmode");
    if (msgModeEl) {
      msgModeEl.value = s.context.messageMode;
      msgModeEl.addEventListener("change", (e) => {
        s.context.messageMode = e.target.value;
        this.saveSettings();
        this._showToast("已保存");
      });
    }

    const fakeEl = $("#tabbit-set-fakevictory");
    if (fakeEl) {
      fakeEl.addEventListener("change", (e) => {
        s.advanced.midFakeVictory = e.target.checked;
        this.saveSettings();
        this._showToast("已保存");
      });
    }

    const themeEl = $("#tabbit-set-themeimg");
    if (themeEl) {
      themeEl.addEventListener("change", (e) => {
        s.advanced.themeImage = e.target.checked;
        this.saveSettings();
        this._showToast("已保存");
      });
    }

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
  }

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
    const old = document.querySelector(".tabbit-toast-tip");
    if (old) old.remove();

    const tip = document.createElement("div");
    tip.className = "tabbit-toast-tip";
    tip.textContent = msg;
    Object.assign(tip.style, {
      position: "fixed",
      bottom: "30px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(0,0,0,0.85)",
      color: "white",
      padding: "10px 18px",
      borderRadius: "6px",
      fontSize: "13px",
      zIndex: "10001",
      pointerEvents: "none",
    });
    document.body.appendChild(tip);
    setTimeout(() => tip.remove(), 1500);
  }

  open() {
    this.maskEl.classList.add("show");
    requestAnimationFrame(() => this.drawerEl.classList.add("open"));
  }

  close() {
    this.drawerEl.classList.remove("open");
    this.maskEl.classList.remove("show");
  }

  onChatChanged() {
    // 阶段 2/3 会在这里刷新已有数据；阶段 1 不做处理
  }
}

