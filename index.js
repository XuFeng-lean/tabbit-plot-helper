// 剧情辅助器 - 主入口（骨架版 v1.0.0）
import { extension_settings, getContext } from "../../../extensions.js";
import { saveSettingsDebounced, eventSource, event_types } from "../../../../script.js";

const EXT_ID = "tabbit-plot-helper";
const EXT_NAME = "剧情辅助器";

// ============ 默认设置 ============
const defaultSettings = {
  // API 配置
  api: {
    enabled: false,
    type: "openai",          // openai / claude / google / custom
    baseUrl: "",
    apiKey: "",
    model: "",
    temperature: 0.85,
    maxTokens: 4000,
    customHeaders: {},
  },
  // 预设配置
  preset: {
    mode: "follow",          // follow(跟随主预设) / independent(独立)
    outlinePreset: "",
    optionsPreset: "",
    translatePreset: "",
    enhancedRoleplay: true,
  },
  // 高级叙事模块
  advanced: {
    midFakeVictory: false,
    themeImage: false,
    worldVariables: true,
  },
  // 上下文配置
  context: {
    recentMessages: 20,
    includeWorldInfo: true,
    includeUserPersona: true,
  },
  // UI 配置
  ui: {
    defaultInspiration: "relationship",  // polti36 / relationship / system
  },
};

// ============ 初始化设置 ============
function initSettings() {
  if (!extension_settings[EXT_ID]) {
    extension_settings[EXT_ID] = structuredClone(defaultSettings);
  }
  // 兼容老版本：补全缺失字段
  const settings = extension_settings[EXT_ID];
  for (const key of Object.keys(defaultSettings)) {
    if (!settings[key]) settings[key] = structuredClone(defaultSettings[key]);
  }
  saveSettingsDebounced();
  return settings;
}

// ============ 注入扩展按钮 ============
function injectExtensionButton() {
  // 已存在则跳过
  if (document.getElementById("tabbit-plot-btn")) return;

  const button = document.createElement("div");
  button.id = "tabbit-plot-btn";
  button.className = "tabbit-plot-entry-btn list-group-item flex-container flexGap5";
  button.title = "打开剧情辅助器";
  button.innerHTML = `
    <div class="fa-solid fa-feather-pointed extensionsMenuExtensionButton"></div>
    <span>剧情辅助器</span>
  `;
  button.addEventListener("click", openMainPopup);

  // 插入到扩展菜单顶部
  const extensionsMenu = document.getElementById("extensionsMenu");
  if (extensionsMenu) {
    extensionsMenu.prepend(button);
  } else {
    // 兜底：500ms 后重试
    setTimeout(injectExtensionButton, 500);
  }
}

// ============ 主弹窗 ============
function openMainPopup() {
  // 已打开则关闭
  const existing = document.getElementById("tabbit-plot-popup");
  if (existing) {
    existing.remove();
    return;
  }

  const popup = document.createElement("div");
  popup.id = "tabbit-plot-popup";
  popup.className = "tabbit-plot-popup";
  popup.innerHTML = getPopupHTML();
  document.body.appendChild(popup);

  bindPopupEvents(popup);
}

function getPopupHTML() {
  return `
    <div class="tabbit-popup-overlay"></div>
    <div class="tabbit-popup-container">
      <div class="tabbit-popup-header">
        <h3>📖 剧情辅助器</h3>
        <button class="tabbit-close-btn" data-action="close">✕</button>
      </div>

      <div class="tabbit-tab-nav">
        <button class="tabbit-tab-btn active" data-tab="outline">
          <i class="fa-solid fa-scroll"></i><span>剧情大纲</span>
        </button>
        <button class="tabbit-tab-btn" data-tab="options">
          <i class="fa-solid fa-list-check"></i><span>剧情选项</span>
        </button>
        <button class="tabbit-tab-btn" data-tab="settings">
          <i class="fa-solid fa-gear"></i><span>设置</span>
        </button>
      </div>

      <div class="tabbit-tab-content">
        <div class="tabbit-tab-pane active" data-pane="outline">
          ${getOutlinePaneHTML()}
        </div>
        <div class="tabbit-tab-pane" data-pane="options">
          ${getOptionsPaneHTML()}
        </div>
        <div class="tabbit-tab-pane" data-pane="settings">
          ${getSettingsPaneHTML()}
        </div>
      </div>
    </div>
  `;
}

function getOutlinePaneHTML() {
  return `
    <div class="tabbit-section">
      <h4>选择生成模式</h4>
      <div class="tabbit-mode-selector">
        <button class="tabbit-mode-btn active" data-mode="with-idea">
          <strong>我有想法</strong>
          <small>输入想要的剧情走向</small>
        </button>
        <button class="tabbit-mode-btn" data-mode="no-idea">
          <strong>给我灵感</strong>
          <small>AI 基于灵感引擎生成</small>
        </button>
      </div>

      <div class="tabbit-mode-pane" data-mode-pane="with-idea">
        <textarea 
          class="tabbit-textarea" 
          id="tabbit-user-idea"
          placeholder="描述你想要的剧情结局、情绪基调、关键事件等……"
          rows="4"></textarea>
      </div>

      <div class="tabbit-mode-pane" data-mode-pane="no-idea" style="display:none">
        <label class="tabbit-label">选择灵感引擎：</label>
        <select class="tabbit-select" id="tabbit-inspiration-engine">
          <option value="polti36">普尔蒂 36 种剧情模式（经典戏剧）</option>
          <option value="relationship" selected>关系重塑模型（现代角色互动）</option>
          <option value="system">系统基模（宏大叙事 / 群像）</option>
        </select>
      </div>

      <button class="tabbit-primary-btn" id="tabbit-generate-outline">
        <i class="fa-solid fa-wand-magic-sparkles"></i> 生成 3 个大纲
      </button>

      <div class="tabbit-result-area" id="tabbit-outline-result"></div>
    </div>
  `;
}

function getOptionsPaneHTML() {
  return `
    <div class="tabbit-section">
      <div class="tabbit-info-box">
        <i class="fa-solid fa-circle-info"></i>
        <span id="tabbit-outline-status">当前聊天暂无活动大纲，将仅基于聊天上下文生成选项</span>
      </div>

      <button class="tabbit-primary-btn" id="tabbit-generate-options">
        <i class="fa-solid fa-dice-d20"></i> 生成 5 个剧情方向
      </button>

      <div class="tabbit-result-area" id="tabbit-options-result"></div>
    </div>
  `;
}

function getSettingsPaneHTML() {
  // 折叠式区块（手机端友好）
  return `
    <div class="tabbit-settings">
      
      <details class="tabbit-collapse" open>
        <summary>🔌 独立 API 配置</summary>
        <div class="tabbit-collapse-body">
          <label class="tabbit-checkbox">
            <input type="checkbox" id="tabbit-api-enabled"> 启用独立 API（关闭则使用酒馆主 API）
          </label>
          <label class="tabbit-label">API 类型</label>
          <select class="tabbit-select" id="tabbit-api-type">
            <option value="openai">OpenAI 兼容（推荐，支持 DeepSeek/Moonshot/中转站等）</option>
            <option value="claude">Claude 兼容</option>
            <option value="google">Google Gemini</option>
            <option value="custom">自定义</option>
          </select>
          <label class="tabbit-label">Base URL</label>
          <input type="text" class="tabbit-input" id="tabbit-api-baseurl" 
            placeholder="https://api.deepseek.com/v1">
          <label class="tabbit-label">API Key</label>
          <input type="password" class="tabbit-input" id="tabbit-api-key" 
            placeholder="sk-xxxxxxxxxxxxx">
          <label class="tabbit-label">模型名称</label>
          <input type="text" class="tabbit-input" id="tabbit-api-model" 
            placeholder="deepseek-chat">
          <button class="tabbit-secondary-btn" id="tabbit-test-api">
            <i class="fa-solid fa-plug"></i> 测试连接
          </button>
        </div>
      </details>

      <details class="tabbit-collapse">
        <summary>🎭 预设选择（破限预设）</summary>
        <div class="tabbit-collapse-body">
          <label class="tabbit-label">预设模式</label>
          <select class="tabbit-select" id="tabbit-preset-mode">
            <option value="follow">跟随酒馆当前激活预设（推荐）</option>
            <option value="independent">扩展独立预设（进阶）</option>
          </select>
          <div id="tabbit-independent-preset-area" style="display:none">
            <label class="tabbit-label">大纲生成预设</label>
            <select class="tabbit-select" id="tabbit-preset-outline"></select>
            <label class="tabbit-label">选项生成预设</label>
            <select class="tabbit-select" id="tabbit-preset-options"></select>
            <label class="tabbit-label">选项翻译预设</label>
            <select class="tabbit-select" id="tabbit-preset-translate"></select>
          </div>
          <label class="tabbit-checkbox">
            <input type="checkbox" id="tabbit-enhanced-roleplay" checked> 强化扮演模式
          </label>
          <p class="tabbit-hint">开启后扩展会在自己的提示词里附加一段角色扮演前置，配合破限预设效果更佳。</p>
        </div>
      </details>

      <details class="tabbit-collapse">
        <summary>🎬 高级叙事模块</summary>
        <div class="tabbit-collapse-body">
          <label class="tabbit-checkbox">
            <input type="checkbox" id="tabbit-mid-fake-victory"> 中期伪胜利
          </label>
          <p class="tabbit-hint">在第二幕中段插入「以为赢了却输得更惨」的转折，重创主角初始信念，驱动更深刻的角色弧光。适合长篇剧情。</p>
          
          <label class="tabbit-checkbox">
            <input type="checkbox" id="tabbit-theme-image"> 主题意象
          </label>
          <p class="tabbit-hint">设定一个贯穿全文的核心象征物（如蓝色蝴蝶、远方的塔），后续选项中会偶尔以「意象低语」形式出现，为故事注入诗意。</p>
          
          <label class="tabbit-checkbox">
            <input type="checkbox" id="tabbit-world-variables" checked> 世界变量 / 暗流伏笔
          </label>
          <p class="tabbit-hint">扩展会在后台维护"主角不知道但读者能感觉到"的世界变量（如某个秘密组织正在调查主角），后续通过「暗流涌动」选项慢慢显现，让剧情自然涌现因果链。</p>
        </div>
      </details>

      <details class="tabbit-collapse">
        <summary>📚 上下文配置</summary>
        <div class="tabbit-collapse-body">
          <label class="tabbit-label">最近聊天条数：<span id="tabbit-msg-count-display">20</span></label>
          <input type="range" class="tabbit-range" id="tabbit-msg-count" min="5" max="50" value="20">
          <label class="tabbit-checkbox">
            <input type="checkbox" id="tabbit-include-worldinfo" checked> 包含当前生效世界书
          </label>
          <label class="tabbit-checkbox">
            <input type="checkbox" id="tabbit-include-persona" checked> 包含 User Persona
          </label>
        </div>
      </details>

      <details class="tabbit-collapse">
        <summary>⚙️ 基础设置</summary>
        <div class="tabbit-collapse-body">
          <label class="tabbit-label">默认灵感引擎</label>
          <select class="tabbit-select" id="tabbit-default-inspiration">
            <option value="polti36">普尔蒂 36 种剧情模式</option>
            <option value="relationship">关系重塑模型</option>
            <option value="system">系统基模</option>
          </select>
        </div>
      </details>

      <button class="tabbit-primary-btn" id="tabbit-save-settings">
        <i class="fa-solid fa-floppy-disk"></i> 保存设置
      </button>
    </div>
  `;
}

// ============ 事件绑定 ============
function bindPopupEvents(popup) {
  // 关闭
  popup.querySelector("[data-action='close']").addEventListener("click", () => popup.remove());
  popup.querySelector(".tabbit-popup-overlay").addEventListener("click", () => popup.remove());

  // Tab 切换
  popup.querySelectorAll(".tabbit-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      popup.querySelectorAll(".tabbit-tab-btn").forEach(b => b.classList.toggle("active", b === btn));
      popup.querySelectorAll(".tabbit-tab-pane").forEach(p => 
        p.classList.toggle("active", p.dataset.pane === tab)
      );
    });
  });

  // 大纲模式切换
  popup.querySelectorAll(".tabbit-mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;
      popup.querySelectorAll(".tabbit-mode-btn").forEach(b => b.classList.toggle("active", b === btn));
      popup.querySelectorAll("[data-mode-pane]").forEach(p => 
        p.style.display = p.dataset.modePane === mode ? "block" : "none"
      );
    });
  });

  // 预设模式切换
  const presetMode = popup.querySelector("#tabbit-preset-mode");
  if (presetMode) {
    presetMode.addEventListener("change", (e) => {
      popup.querySelector("#tabbit-independent-preset-area").style.display =
        e.target.value === "independent" ? "block" : "none";
    });
  }

  // 滑块联动显示
  const msgRange = popup.querySelector("#tabbit-msg-count");
  if (msgRange) {
    msgRange.addEventListener("input", (e) => {
      popup.querySelector("#tabbit-msg-count-display").textContent = e.target.value;
    });
  }

  // 加载已保存的设置到 UI
  loadSettingsToUI(popup);

  // 保存设置（实际逻辑在第二批代码中）
  popup.querySelector("#tabbit-save-settings")?.addEventListener("click", () => {
    saveSettingsFromUI(popup);
    showToast("✅ 设置已保存");
  });

  // 占位：生成按钮（实际逻辑在第二批代码中）
  popup.querySelector("#tabbit-generate-outline")?.addEventListener("click", () => {
    showToast("⚠️ 第二批代码包含完整生成逻辑，请等待后续文件");
  });
  popup.querySelector("#tabbit-generate-options")?.addEventListener("click", () => {
    showToast("⚠️ 第二批代码包含完整生成逻辑，请等待后续文件");
  });
  popup.querySelector("#tabbit-test-api")?.addEventListener("click", () => {
    showToast("⚠️ 第二批代码包含 API 测试逻辑，请等待后续文件");
  });
}

function loadSettingsToUI(popup) {
  const s = extension_settings[EXT_ID];
  popup.querySelector("#tabbit-api-enabled").checked = s.api.enabled;
  popup.querySelector("#tabbit-api-type").value = s.api.type;
  popup.querySelector("#tabbit-api-baseurl").value = s.api.baseUrl;
  popup.querySelector("#tabbit-api-key").value = s.api.apiKey;
  popup.querySelector("#tabbit-api-model").value = s.api.model;
  popup.querySelector("#tabbit-preset-mode").value = s.preset.mode;
  popup.querySelector("#tabbit-enhanced-roleplay").checked = s.preset.enhancedRoleplay;
  popup.querySelector("#tabbit-mid-fake-victory").checked = s.advanced.midFakeVictory;
  popup.querySelector("#tabbit-theme-image").checked = s.advanced.themeImage;
  popup.querySelector("#tabbit-world-variables").checked = s.advanced.worldVariables;
  popup.querySelector("#tabbit-msg-count").value = s.context.recentMessages;
  popup.querySelector("#tabbit-msg-count-display").textContent = s.context.recentMessages;
  popup.querySelector("#tabbit-include-worldinfo").checked = s.context.includeWorldInfo;
  popup.querySelector("#tabbit-include-persona").checked = s.context.includeUserPersona;
  popup.querySelector("#tabbit-default-inspiration").value = s.ui.defaultInspiration;
  
  // 触发预设模式联动
  if (s.preset.mode === "independent") {
    popup.querySelector("#tabbit-independent-preset-area").style.display = "block";
  }
}

function saveSettingsFromUI(popup) {
  const s = extension_settings[EXT_ID];
  s.api.enabled = popup.querySelector("#tabbit-api-enabled").checked;
  s.api.type = popup.querySelector("#tabbit-api-type").value;
  s.api.baseUrl = popup.querySelector("#tabbit-api-baseurl").value;
  s.api.apiKey = popup.querySelector("#tabbit-api-key").value;
  s.api.model = popup.querySelector("#tabbit-api-model").value;
  s.preset.mode = popup.querySelector("#tabbit-preset-mode").value;
  s.preset.enhancedRoleplay = popup.querySelector("#tabbit-enhanced-roleplay").checked;
  s.advanced.midFakeVictory = popup.querySelector("#tabbit-mid-fake-victory").checked;
  s.advanced.themeImage = popup.querySelector("#tabbit-theme-image").checked;
  s.advanced.worldVariables = popup.querySelector("#tabbit-world-variables").checked;
  s.context.recentMessages = parseInt(popup.querySelector("#tabbit-msg-count").value);
  s.context.includeWorldInfo = popup.querySelector("#tabbit-include-worldinfo").checked;
  s.context.includeUserPersona = popup.querySelector("#tabbit-include-persona").checked;
  s.ui.defaultInspiration = popup.querySelector("#tabbit-default-inspiration").value;
  saveSettingsDebounced();
}

// ============ 简易 Toast 提示 ============
function showToast(message, duration = 2500) {
  const toast = document.createElement("div");
  toast.className = "tabbit-toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============ 启动 ============
jQuery(async () => {
  initSettings();
  injectExtensionButton();
  
  // 监听聊天切换，更新大纲状态显示（功能在第二批接通）
  eventSource.on(event_types.CHAT_CHANGED, () => {
    const popup = document.getElementById("tabbit-plot-popup");
    if (popup) {
      // 占位
    }
  });
  
  console.log(`[${EXT_NAME}] 已加载 v1.0.0`);
});
