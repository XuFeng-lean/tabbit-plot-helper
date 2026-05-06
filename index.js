// 剧情辅助器 - 主入口完整版 v1.0.0
import { extension_settings, getContext } from "../../../extensions.js";
import {
  saveSettingsDebounced,
  eventSource,
  event_types,
  chat_metadata,
  saveMetadataDebounced
} from "../../../../script.js";

import { callLLM, testIndependentApi } from "./modules/api-client.js";
import { buildPlotContext } from "./modules/context-builder.js";
import { ensurePlotStore, saveOutlineToStore, saveUsedOption, mergeWorldVariables } from "./modules/world-variables.js";
import { loadPresetOptionsToSelects } from "./modules/preset-manager.js";

import { buildOutlineWithIdeaPrompt } from "./prompts/outline-with-idea.js";
import { buildOutlineNoIdeaPrompt } from "./prompts/outline-no-idea.js";
import { buildOptionsPrompt } from "./prompts/options-generation.js";
import { buildOptionTranslationPrompt } from "./prompts/option-translation.js";

const EXT_ID = "tabbit-plot-helper";
const EXT_NAME = "剧情辅助器";

const defaultSettings = {
  api: {
    enabled: false,
    type: "openai",
    baseUrl: "",
    apiKey: "",
    model: "",
    temperature: 0.85,
    maxTokens: 4000,
    customHeaders: {}
  },
  preset: {
    mode: "follow",
    outlinePreset: "",
    optionsPreset: "",
    translatePreset: "",
    enhancedRoleplay: true
  },
  advanced: {
    midFakeVictory: false,
    themeImage: false,
    worldVariables: true
  },
  context: {
    recentMessages: 20,
    includeWorldInfo: true,
    includeUserPersona: true
  },
  ui: {
    defaultInspiration: "relationship"
  }
};

function deepMergeDefaults(target, source) {
  for (const key of Object.keys(source)) {
    if (target[key] === undefined || target[key] === null) {
      target[key] = structuredClone(source[key]);
      continue;
    }
    if (
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      deepMergeDefaults(target[key], source[key]);
    }
  }
}

function initSettings() {
  if (!extension_settings[EXT_ID]) {
    extension_settings[EXT_ID] = structuredClone(defaultSettings);
  } else {
    deepMergeDefaults(extension_settings[EXT_ID], defaultSettings);
  }
  saveSettingsDebounced();
  return extension_settings[EXT_ID];
}

function injectExtensionButton() {
  injectDesktopExtensionMenuButton();
  setupMobileMagicWandHijack();
}

/**
 * 电脑端 / 宽屏端：
 * 仍然把“剧情辅助器”插入到扩展菜单顶部。
 */
function injectDesktopExtensionMenuButton() {
  if (document.getElementById("tabbit-plot-btn")) return;

  const button = document.createElement("div");
  button.id = "tabbit-plot-btn";
  button.className = "tabbit-plot-entry-btn list-group-item flex-container flexGap5";
  button.title = "打开剧情辅助器";
  button.innerHTML = [
    "<div class='fa-solid fa-feather-pointed extensionsMenuExtensionButton'></div>",
    "<span>剧情辅助器</span>"
  ].join("");

  button.addEventListener("click", openMainPopup);

  const extensionsMenu = document.getElementById("extensionsMenu");
  if (extensionsMenu) {
    extensionsMenu.prepend(button);
  } else {
    setTimeout(injectDesktopExtensionMenuButton, 500);
  }
}

/**
 * 手机端：
 * 直接接管底部魔法棒按钮。
 *
 * 效果：
 * - 手机端点击魔法棒：打开剧情辅助器
 * - 电脑端不影响，仍然使用原本扩展菜单
 */
function setupMobileMagicWandHijack() {
  if (window.__tabbitPlotMagicWandHijackInstalled) return;
  window.__tabbitPlotMagicWandHijackInstalled = true;

  tryBindMagicWandButton();

  // 酒馆手机端底部栏有时是延迟渲染的，所以多次重试
  setTimeout(tryBindMagicWandButton, 500);
  setTimeout(tryBindMagicWandButton, 1200);
  setTimeout(tryBindMagicWandButton, 2500);

  // 监听 DOM 变化，防止切换页面 / 刷新局部 UI 后按钮丢失绑定
  const observer = new MutationObserver(() => {
    tryBindMagicWandButton();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style"]
  });
}

/**
 * 尝试找到魔法棒按钮并绑定点击事件。
 */
function tryBindMagicWandButton() {
  if (!isMobileViewport()) return;

  const wandButton = findMagicWandButton();

  if (!wandButton) return;

  if (wandButton.dataset.tabbitPlotBound === "true") return;

  wandButton.dataset.tabbitPlotBound = "true";
  wandButton.classList.add("tabbit-plot-magic-wand-bound");
  wandButton.title = "剧情辅助器";

  /**
   * 使用捕获阶段拦截点击。
   * 这样可以优先于酒馆原本的魔法棒菜单触发。
   */
  wandButton.addEventListener(
    "click",
    (event) => {
      if (!isMobileViewport()) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      openMainPopup();
    },
    true
  );

  /**
   * 某些手机 WebView 用 touchend 触发按钮，这里也拦截一次。
   */
  wandButton.addEventListener(
    "touchend",
    (event) => {
      if (!isMobileViewport()) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      openMainPopup();
    },
    true
  );

  console.log("[剧情辅助器] 已接管手机端魔法棒按钮");
}

/**
 * 判断当前是否是手机 / 窄屏。
 */
function isMobileViewport() {
  const width = window.innerWidth || document.documentElement.clientWidth || 9999;
  return width <= 700;
}

/**
 * 尝试定位酒馆底部的魔法棒按钮。
 *
 * 不同中文整合包、主题、版本的 DOM 名称可能不同，
 * 所以这里采用多重选择器 + 图标兜底定位。
 */
function findMagicWandButton() {
  const selectors = [
    "#extensionsMenuButton",
    "#extensions_menu_button",
    "#extensions-button",
    "#extensions_button",
    "#extensionsButton",
    "[title='扩展程序']",
    "[title='Extensions']",
    "[title='扩展']",
    ".fa-wand-magic-sparkles",
    ".fa-magic-wand-sparkles",
    ".fa-wand-magic",
    ".fa-magic",
    ".fa-solid.fa-wand-magic-sparkles",
    ".fa-solid.fa-magic-wand-sparkles",
    ".extensionsMenuButton",
    ".extensions_button"
  ];

  for (const selector of selectors) {
    const node = document.querySelector(selector);
    const button = normalizeToClickableButton(node);
    if (button && isLikelyBottomToolbarButton(button)) {
      return button;
    }
  }

  // 兜底：扫描底部区域中带“魔法棒/扩展”特征的元素
  const candidates = Array.from(
    document.querySelectorAll("button, div, span, i, a")
  );

  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

  for (const el of candidates) {
    const rect = el.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) continue;

    // 只看屏幕底部 35% 区域，避免误伤顶部扩展按钮
    const inBottomArea = rect.top > viewportHeight * 0.65;

    const className = String(el.className || "").toLowerCase();
    const title = String(el.getAttribute("title") || "").toLowerCase();
    const aria = String(el.getAttribute("aria-label") || "").toLowerCase();
    const text = String(el.textContent || "").toLowerCase();

    const looksLikeMagicWand =
      className.includes("wand") ||
      className.includes("magic") ||
      className.includes("extension") ||
      title.includes("扩展") ||
      title.includes("extension") ||
      aria.includes("扩展") ||
      aria.includes("extension") ||
      text.includes("扩展程序");

    if (!inBottomArea || !looksLikeMagicWand) continue;

    const button = normalizeToClickableButton(el);
    if (button && isLikelyBottomToolbarButton(button)) {
      return button;
    }
  }

  return null;
}

/**
 * 如果找到的是 i 图标，则向上寻找真正可点击的父元素。
 */
function normalizeToClickableButton(node) {
  if (!node) return null;

  const clickable = node.closest(
    "button, a, .menu_button, .drawer-button, .interactable, div"
  );

  return clickable || node;
}

/**
 * 判断它是否像底部工具栏按钮。
 */
function isLikelyBottomToolbarButton(node) {
  if (!node) return false;

  const rect = node.getBoundingClientRect();
  const style = window.getComputedStyle(node);
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

  if (!rect || rect.width <= 0 || rect.height <= 0) return false;
  if (style.display === "none") return false;
  if (style.visibility === "hidden") return false;
  if (Number(style.opacity) === 0) return false;

  const inBottomArea = rect.top > viewportHeight * 0.55;
  const reasonableSize = rect.width >= 20 && rect.height >= 20 && rect.width <= 120 && rect.height <= 120;

  return inBottomArea && reasonableSize;
}


function openMainPopup() {
  const existing = document.getElementById("tabbit-plot-popup");
  if (existing) {
    existing.remove();
    return;
  }

  ensurePlotStore(chat_metadata);

  const popup = document.createElement("div");
  popup.id = "tabbit-plot-popup";
  popup.className = "tabbit-plot-popup";
  popup.innerHTML = getPopupHTML();

  document.body.appendChild(popup);
  bindPopupEvents(popup);
  updateOutlineStatus(popup);
  loadPresetOptionsToSelects(popup, extension_settings[EXT_ID]);
}

function getPopupHTML() {
  return [
    "<div class='tabbit-popup-overlay'></div>",
    "<div class='tabbit-popup-container'>",
      "<div class='tabbit-popup-header'>",
        "<h3>📖 剧情辅助器</h3>",
        "<button class='tabbit-close-btn' data-action='close'>✕</button>",
      "</div>",

      "<div class='tabbit-tab-nav'>",
        "<button class='tabbit-tab-btn active' data-tab='outline'>",
          "<i class='fa-solid fa-scroll'></i><span>剧情大纲</span>",
        "</button>",
        "<button class='tabbit-tab-btn' data-tab='options'>",
          "<i class='fa-solid fa-list-check'></i><span>剧情选项</span>",
        "</button>",
        "<button class='tabbit-tab-btn' data-tab='settings'>",
          "<i class='fa-solid fa-gear'></i><span>设置</span>",
        "</button>",
      "</div>",

      "<div class='tabbit-tab-content'>",
        "<div class='tabbit-tab-pane active' data-pane='outline'>",
          getOutlinePaneHTML(),
        "</div>",
        "<div class='tabbit-tab-pane' data-pane='options'>",
          getOptionsPaneHTML(),
        "</div>",
        "<div class='tabbit-tab-pane' data-pane='settings'>",
          getSettingsPaneHTML(),
        "</div>",
      "</div>",
    "</div>"
  ].join("");
}

function getOutlinePaneHTML() {
  return [
    "<div class='tabbit-section'>",
      "<h4>选择生成模式</h4>",

      "<div class='tabbit-mode-selector'>",
        "<button class='tabbit-mode-btn active' data-mode='with-idea'>",
          "<strong>我有想法</strong>",
          "<small>输入想要的剧情走向</small>",
        "</button>",
        "<button class='tabbit-mode-btn' data-mode='no-idea'>",
          "<strong>给我灵感</strong>",
          "<small>AI 基于灵感引擎生成</small>",
        "</button>",
      "</div>",

      "<div class='tabbit-mode-pane' data-mode-pane='with-idea'>",
        "<textarea class='tabbit-textarea' id='tabbit-user-idea' placeholder='描述你想要的剧情结局、情绪基调、关键事件等……' rows='4'></textarea>",
      "</div>",

      "<div class='tabbit-mode-pane' data-mode-pane='no-idea' style='display:none'>",
        "<label class='tabbit-label'>选择灵感引擎：</label>",
        "<select class='tabbit-select' id='tabbit-inspiration-engine'>",
          "<option value='polti36'>普尔蒂 36 种剧情模式（经典戏剧）</option>",
          "<option value='relationship'>关系重塑模型（现代角色互动）</option>",
          "<option value='system'>系统基模（宏大叙事 / 群像）</option>",
        "</select>",
      "</div>",

      "<button class='tabbit-primary-btn' id='tabbit-generate-outline'>",
        "<i class='fa-solid fa-wand-magic-sparkles'></i> 生成 3 个大纲",
      "</button>",

      "<div class='tabbit-result-area' id='tabbit-outline-result'></div>",
    "</div>"
  ].join("");
}

function getOptionsPaneHTML() {
  return [
    "<div class='tabbit-section'>",
      "<div class='tabbit-info-box'>",
        "<i class='fa-solid fa-circle-info'></i>",
        "<span id='tabbit-outline-status'>正在读取当前聊天大纲状态……</span>",
      "</div>",

      "<button class='tabbit-primary-btn' id='tabbit-generate-options'>",
        "<i class='fa-solid fa-dice-d20'></i> 生成 5 个剧情方向",
      "</button>",

      "<div class='tabbit-result-area' id='tabbit-options-result'></div>",
    "</div>"
  ].join("");
}

function getSettingsPaneHTML() {
  return [
    "<div class='tabbit-settings'>",

      "<details class='tabbit-collapse' open>",
        "<summary>🔌 独立 API 配置</summary>",
        "<div class='tabbit-collapse-body'>",
          "<label class='tabbit-checkbox'>",
            "<input type='checkbox' id='tabbit-api-enabled'> 启用独立 API（关闭则使用酒馆主 API）",
          "</label>",
          "<label class='tabbit-label'>API 类型</label>",
          "<select class='tabbit-select' id='tabbit-api-type'>",
            "<option value='openai'>OpenAI 兼容（推荐，支持 DeepSeek / Moonshot / 中转站等）</option>",
            "<option value='custom'>自定义 OpenAI 兼容</option>",
          "</select>",
          "<label class='tabbit-label'>Base URL</label>",
          "<input type='text' class='tabbit-input' id='tabbit-api-baseurl' placeholder='https://api.deepseek.com/v1'>",
          "<label class='tabbit-label'>API Key</label>",
          "<input type='password' class='tabbit-input' id='tabbit-api-key' placeholder='sk-xxxxxxxxxxxxx'>",
          "<label class='tabbit-label'>模型名称</label>",
          "<input type='text' class='tabbit-input' id='tabbit-api-model' placeholder='deepseek-chat'>",
          "<button class='tabbit-secondary-btn' id='tabbit-test-api'>",
            "<i class='fa-solid fa-plug'></i> 测试连接",
          "</button>",
        "</div>",
      "</details>",

      "<details class='tabbit-collapse'>",
        "<summary>🎭 预设选择</summary>",
        "<div class='tabbit-collapse-body'>",
          "<label class='tabbit-label'>预设模式</label>",
          "<select class='tabbit-select' id='tabbit-preset-mode'>",
            "<option value='follow'>跟随酒馆当前激活预设（推荐）</option>",
            "<option value='independent'>扩展独立预设（进阶）</option>",
          "</select>",
          "<div id='tabbit-independent-preset-area' style='display:none'>",
            "<label class='tabbit-label'>大纲生成预设</label>",
            "<select class='tabbit-select' id='tabbit-preset-outline'></select>",
            "<label class='tabbit-label'>选项生成预设</label>",
            "<select class='tabbit-select' id='tabbit-preset-options'></select>",
            "<label class='tabbit-label'>选项翻译预设</label>",
            "<select class='tabbit-select' id='tabbit-preset-translate'></select>",
          "</div>",
          "<label class='tabbit-checkbox'>",
            "<input type='checkbox' id='tabbit-enhanced-roleplay' checked> 强化扮演模式",
          "</label>",
          "<p class='tabbit-hint'>开启后，扩展会更强调沉浸式剧情创作、角色一致性和叙事推进；不会内置任何违规或危险内容。</p>",
        "</div>",
      "</details>",

      "<details class='tabbit-collapse'>",
        "<summary>🎬 高级叙事模块</summary>",
        "<div class='tabbit-collapse-body'>",
          "<label class='tabbit-checkbox'><input type='checkbox' id='tabbit-mid-fake-victory'> 中期伪胜利</label>",
          "<p class='tabbit-hint'>在第二幕中段插入“以为赢了却输得更惨”的转折，适合长篇、权谋、冒险、成长线。</p>",

          "<label class='tabbit-checkbox'><input type='checkbox' id='tabbit-theme-image'> 主题意象</label>",
          "<p class='tabbit-hint'>为故事设定反复出现的核心象征物，后续可在剧情选项中以“意象低语”方式出现。</p>",

          "<label class='tabbit-checkbox'><input type='checkbox' id='tabbit-world-variables' checked> 世界变量 / 暗流伏笔</label>",
          "<p class='tabbit-hint'>维护主角暂时不知道的后台变量，例如势力调查、隐秘误会、远处危机，让后续剧情更有因果链。</p>",
        "</div>",
      "</details>",

      "<details class='tabbit-collapse'>",
        "<summary>📚 上下文配置</summary>",
        "<div class='tabbit-collapse-body'>",
          "<label class='tabbit-label'>最近聊天条数：<span id='tabbit-msg-count-display'>20</span></label>",
          "<input type='range' class='tabbit-range' id='tabbit-msg-count' min='5' max='50' value='20'>",
          "<label class='tabbit-checkbox'><input type='checkbox' id='tabbit-include-worldinfo' checked> 包含当前生效世界书摘要</label>",
          "<label class='tabbit-checkbox'><input type='checkbox' id='tabbit-include-persona' checked> 包含 User Persona 摘要</label>",
        "</div>",
      "</details>",

      "<details class='tabbit-collapse'>",
        "<summary>⚙️ 基础设置</summary>",
        "<div class='tabbit-collapse-body'>",
          "<label class='tabbit-label'>默认灵感引擎</label>",
          "<select class='tabbit-select' id='tabbit-default-inspiration'>",
            "<option value='polti36'>普尔蒂 36 种剧情模式</option>",
            "<option value='relationship'>关系重塑模型</option>",
            "<option value='system'>系统基模</option>",
          "</select>",
        "</div>",
      "</details>",

      "<button class='tabbit-primary-btn' id='tabbit-save-settings'>",
        "<i class='fa-solid fa-floppy-disk'></i> 保存设置",
      "</button>",

    "</div>"
  ].join("");
}

function bindPopupEvents(popup) {
  popup.querySelector("[data-action='close']").addEventListener("click", () => popup.remove());
  popup.querySelector(".tabbit-popup-overlay").addEventListener("click", () => popup.remove());

  popup.querySelectorAll(".tabbit-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      popup.querySelectorAll(".tabbit-tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
      popup.querySelectorAll(".tabbit-tab-pane").forEach((p) => p.classList.toggle("active", p.dataset.pane === tab));
      if (tab === "settings") {
        loadPresetOptionsToSelects(popup, extension_settings[EXT_ID]);
      }
      if (tab === "options") {
        updateOutlineStatus(popup);
      }
    });
  });

  popup.querySelectorAll(".tabbit-mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;
      popup.querySelectorAll(".tabbit-mode-btn").forEach((b) => b.classList.toggle("active", b === btn));
      popup.querySelectorAll("[data-mode-pane]").forEach((p) => {
        p.style.display = p.dataset.modePane === mode ? "block" : "none";
      });
    });
  });

  const presetMode = popup.querySelector("#tabbit-preset-mode");
  if (presetMode) {
    presetMode.addEventListener("change", (e) => {
      const area = popup.querySelector("#tabbit-independent-preset-area");
      if (area) area.style.display = e.target.value === "independent" ? "block" : "none";
    });
  }

  const msgRange = popup.querySelector("#tabbit-msg-count");
  if (msgRange) {
    msgRange.addEventListener("input", (e) => {
      const display = popup.querySelector("#tabbit-msg-count-display");
      if (display) display.textContent = e.target.value;
    });
  }

  popup.querySelector("#tabbit-save-settings").addEventListener("click", () => {
    saveSettingsFromUI(popup);
    showToast("设置已保存");
  });

  popup.querySelector("#tabbit-test-api").addEventListener("click", async () => {
    saveSettingsFromUI(popup);
    await handleTestApi();
  });

  popup.querySelector("#tabbit-generate-outline").addEventListener("click", async () => {
    saveSettingsFromUI(popup);
    await handleGenerateOutline(popup);
  });

  popup.querySelector("#tabbit-generate-options").addEventListener("click", async () => {
    saveSettingsFromUI(popup);
    await handleGenerateOptions(popup);
  });

  loadSettingsToUI(popup);
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
  popup.querySelector("#tabbit-inspiration-engine").value = s.ui.defaultInspiration;

  const independentArea = popup.querySelector("#tabbit-independent-preset-area");
  if (independentArea) {
    independentArea.style.display = s.preset.mode === "independent" ? "block" : "none";
  }
}

function saveSettingsFromUI(popup) {
  const s = extension_settings[EXT_ID];

  s.api.enabled = popup.querySelector("#tabbit-api-enabled").checked;
  s.api.type = popup.querySelector("#tabbit-api-type").value;
  s.api.baseUrl = popup.querySelector("#tabbit-api-baseurl").value.trim();
  s.api.apiKey = popup.querySelector("#tabbit-api-key").value.trim();
  s.api.model = popup.querySelector("#tabbit-api-model").value.trim();

  s.preset.mode = popup.querySelector("#tabbit-preset-mode").value;
  s.preset.enhancedRoleplay = popup.querySelector("#tabbit-enhanced-roleplay").checked;

  const outlinePreset = popup.querySelector("#tabbit-preset-outline");
  const optionsPreset = popup.querySelector("#tabbit-preset-options");
  const translatePreset = popup.querySelector("#tabbit-preset-translate");

  if (outlinePreset) s.preset.outlinePreset = outlinePreset.value;
  if (optionsPreset) s.preset.optionsPreset = optionsPreset.value;
  if (translatePreset) s.preset.translatePreset = translatePreset.value;

  s.advanced.midFakeVictory = popup.querySelector("#tabbit-mid-fake-victory").checked;
  s.advanced.themeImage = popup.querySelector("#tabbit-theme-image").checked;
  s.advanced.worldVariables = popup.querySelector("#tabbit-world-variables").checked;

  s.context.recentMessages = parseInt(popup.querySelector("#tabbit-msg-count").value, 10);
  s.context.includeWorldInfo = popup.querySelector("#tabbit-include-worldinfo").checked;
  s.context.includeUserPersona = popup.querySelector("#tabbit-include-persona").checked;

  s.ui.defaultInspiration = popup.querySelector("#tabbit-default-inspiration").value;

  saveSettingsDebounced();
}

async function handleTestApi() {
  const settings = extension_settings[EXT_ID];

  if (!settings.api.enabled) {
    showToast("请先启用独立 API");
    return;
  }

  try {
    showToast("正在测试 API……", 1200);
    const result = await testIndependentApi(settings.api);
    if (result.ok) {
      showToast("API 测试成功");
    } else {
      showToast("API 测试失败：" + result.message, 5000);
    }
  } catch (error) {
    showToast("API 测试异常：" + error.message, 5000);
  }
}

async function handleGenerateOutline(popup) {
  const resultArea = popup.querySelector("#tabbit-outline-result");
  resultArea.innerHTML = renderLoading("正在生成 3 个剧情大纲……");

  try {
    const settings = extension_settings[EXT_ID];
    const context = await buildPlotContext(getContext(), settings, chat_metadata);
    const activeModeBtn = popup.querySelector(".tabbit-mode-btn.active");
    const mode = activeModeBtn ? activeModeBtn.dataset.mode : "with-idea";

    let prompt = "";

    if (mode === "with-idea") {
      const idea = popup.querySelector("#tabbit-user-idea").value.trim();
      if (!idea) {
        resultArea.innerHTML = renderError("请先输入你的剧情想法，或者切换到“给我灵感”。");
        return;
      }
      prompt = buildOutlineWithIdeaPrompt({
        userIdea: idea,
        context,
        settings
      });
    } else {
      const engine = popup.querySelector("#tabbit-inspiration-engine").value;
      prompt = buildOutlineNoIdeaPrompt({
        engine,
        context,
        settings
      });
    }

    const raw = await callLLM({
      prompt,
      task: "outline",
      settings,
      context
    });

    const parsed = parseJsonFromModel(raw);
    if (!parsed || !Array.isArray(parsed.outlines)) {
      resultArea.innerHTML = renderRawResult(raw, "模型没有返回标准 JSON，已显示原始结果。");
      return;
    }

    resultArea.innerHTML = renderOutlineCards(parsed.outlines);

    resultArea.querySelectorAll("[data-save-outline]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = parseInt(btn.dataset.saveOutline, 10);
        saveOutlineToStore(chat_metadata, parsed.outlines[index]);
        saveMetadataDebounced();
        updateOutlineStatus(popup);
        showToast("已设为当前聊天的活动大纲");
      });
    });
  } catch (error) {
    resultArea.innerHTML = renderError(error.message);
  }
}

async function handleGenerateOptions(popup) {
  const resultArea = popup.querySelector("#tabbit-options-result");
  resultArea.innerHTML = renderLoading("正在生成 5 个剧情方向……");

  try {
    const settings = extension_settings[EXT_ID];
    const context = await buildPlotContext(getContext(), settings, chat_metadata);

    const prompt = buildOptionsPrompt({
      context,
      settings
    });

    const raw = await callLLM({
      prompt,
      task: "options",
      settings,
      context
    });

    const parsed = parseJsonFromModel(raw);
    if (!parsed || !Array.isArray(parsed.options)) {
      resultArea.innerHTML = renderRawResult(raw, "模型没有返回标准 JSON，已显示原始结果。");
      return;
    }

    if (settings.advanced.worldVariables && Array.isArray(parsed.world_variables)) {
      mergeWorldVariables(chat_metadata, parsed.world_variables);
      saveMetadataDebounced();
    }

    resultArea.innerHTML = renderOptionCards(parsed.options, parsed.advice);

    resultArea.querySelectorAll("[data-translate-option]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const index = parseInt(btn.dataset.translateOption, 10);
        await handleTranslateOption(popup, parsed.options[index]);
      });
    });
  } catch (error) {
    resultArea.innerHTML = renderError(error.message);
  }
}

async function handleTranslateOption(popup, option) {
  const resultArea = popup.querySelector("#tabbit-options-result");
  const oldHtml = resultArea.innerHTML;

  try {
    showToast("正在改写为第一人称行动……", 1500);

    const settings = extension_settings[EXT_ID];
    const context = await buildPlotContext(getContext(), settings, chat_metadata);

    const prompt = buildOptionTranslationPrompt({
      option,
      context,
      settings
    });

    const raw = await callLLM({
      prompt,
      task: "translate",
      settings,
      context
    });

    const parsed = parseJsonFromModel(raw);
    const finalText = parsed && parsed.first_person_action ? parsed.first_person_action : raw.trim();

    injectTextToSendBox(finalText);
    saveUsedOption(chat_metadata, option);
    saveMetadataDebounced();

    showToast("已填入输入框，你可以修改后手动发送");
  } catch (error) {
    resultArea.innerHTML = oldHtml + renderError("选项改写失败：" + error.message);
  }
}

function injectTextToSendBox(text) {
  const selectors = [
    "#send_textarea",
    "textarea#send_textarea",
    "textarea[name='send_textarea']",
    "#send_form textarea",
    "textarea"
  ];

  let textarea = null;

  for (const selector of selectors) {
    const found = document.querySelector(selector);
    if (found && found.tagName && found.tagName.toLowerCase() === "textarea") {
      textarea = found;
      break;
    }
  }

  if (!textarea) {
    throw new Error("没有找到酒馆输入框，请手动复制生成文本。");
  }

  textarea.value = text;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));
  textarea.focus();

  setTimeout(() => {
    try {
      textarea.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (_) {
      textarea.scrollIntoView();
    }
  }, 100);
}

function updateOutlineStatus(popup) {
  const store = ensurePlotStore(chat_metadata);
  const status = popup.querySelector("#tabbit-outline-status");
  if (!status) return;

  if (store.active_outline) {
    const title = store.active_outline.title || "未命名大纲";
    status.textContent = "当前聊天已有活动大纲：" + title + "。生成选项时会结合该大纲。";
  } else {
    status.textContent = "当前聊天暂无活动大纲，将仅基于聊天上下文生成选项。";
  }
}

function parseJsonFromModel(text) {
  if (!text || typeof text !== "string") return null;

  let cleaned = text.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "").trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) {
      const slice = cleaned.slice(first, last + 1);
      try {
        return JSON.parse(slice);
      } catch (__) {
        return null;
      }
    }
    return null;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderLoading(text) {
  return [
    "<div class='tabbit-info-box'>",
      "<i class='fa-solid fa-spinner fa-spin'></i>",
      "<span>", escapeHtml(text), "</span>",
    "</div>"
  ].join("");
}

function renderError(text) {
  return [
    "<div class='tabbit-info-box' style='border-left-color:#d9534f;background:rgba(217,83,79,0.12)'>",
      "<i class='fa-solid fa-triangle-exclamation'></i>",
      "<span>", escapeHtml(text), "</span>",
    "</div>"
  ].join("");
}

function renderRawResult(raw, note) {
  return [
    renderError(note),
    "<pre style='white-space:pre-wrap;line-height:1.5;font-size:13px;padding:12px;border:1px solid var(--SmartThemeBorderColor,#333);border-radius:6px;overflow:auto'>",
      escapeHtml(raw),
    "</pre>"
  ].join("");
}

function renderOutlineCards(outlines) {
  return outlines.map((outline, index) => {
    const turns = Array.isArray(outline.key_turning_points) ? outline.key_turning_points : [];
    return [
      "<div class='tabbit-result-card'>",
        "<h4>", escapeHtml(outline.title || "大纲 " + (index + 1)), "</h4>",
        "<p><strong>一句话亮点：</strong>", escapeHtml(outline.logline), "</p>",
        "<p><strong>核心关系变化：</strong>", escapeHtml(outline.relationship_shift), "</p>",
        "<p><strong>主角弧光：</strong>", escapeHtml(outline.character_arc), "</p>",
        "<details open>",
          "<summary>三幕结构</summary>",
          "<p><strong>第一幕：</strong>", escapeHtml(outline.three_act && outline.three_act.act1), "</p>",
          "<p><strong>第二幕：</strong>", escapeHtml(outline.three_act && outline.three_act.act2), "</p>",
          "<p><strong>第三幕：</strong>", escapeHtml(outline.three_act && outline.three_act.act3), "</p>",
        "</details>",
        "<p><strong>冲突层级：</strong>", escapeHtml(outline.conflict_layers), "</p>",
        "<p><strong>关键转折点：</strong></p>",
        "<ul>",
          turns.map((t) => "<li>" + escapeHtml(t) + "</li>").join(""),
        "</ul>",
        "<button class='tabbit-secondary-btn' data-save-outline='", index, "'>设为当前活动大纲</button>",
      "</div>"
    ].join("");
  }).join("");
}

function renderOptionCards(options, advice) {
  const cards = options.map((option, index) => {
    return [
      "<div class='tabbit-result-card'>",
        "<h4>", escapeHtml(option.label || String.fromCharCode(65 + index)), ". ", escapeHtml(option.title || "剧情方向"), "</h4>",
        "<p><strong>类型：</strong>", escapeHtml(option.type), "</p>",
        "<p><strong>情节梗概：</strong>", escapeHtml(option.summary), "</p>",
        "<p><strong>目的标签：</strong>", escapeHtml(Array.isArray(option.tags) ? option.tags.join(" ") : option.tags), "</p>",
        "<p><strong>叙事节拍：</strong>", escapeHtml(option.beat), "</p>",
        "<p><strong>后果预告：</strong>", escapeHtml(option.consequence), "</p>",
        "<button class='tabbit-primary-btn' data-translate-option='", index, "'>",
          "<i class='fa-solid fa-pen-to-square'></i> 改写为第一人称并填入输入框",
        "</button>",
      "</div>"
    ].join("");
  }).join("");

  const adviceHtml = advice
    ? [
      "<div class='tabbit-info-box'>",
        "<i class='fa-solid fa-chess-queen'></i>",
        "<span><strong>金牌策划建议：</strong>", escapeHtml(advice), "</span>",
      "</div>"
    ].join("")
    : "";

  return cards + adviceHtml;
}

function showToast(message, duration = 2500) {
  const oldToast = document.querySelector(".tabbit-toast");
  if (oldToast) oldToast.remove();

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

jQuery(async () => {
  initSettings();
  injectExtensionButton();

  eventSource.on(event_types.CHAT_CHANGED, () => {
    ensurePlotStore(chat_metadata);
    const popup = document.getElementById("tabbit-plot-popup");
    if (popup) updateOutlineStatus(popup);
  });

  console.log("[剧情辅助器] 已加载 v1.0.0");
});
