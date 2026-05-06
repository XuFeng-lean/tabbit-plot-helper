// ================================
// 剧情辅助器 · 完整功能整合版 index.js
// 手机端：魔法棒【短按原功能 / 长按剧情辅助器】
// 桌面端：扩展菜单入口
// ================================

import { extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

// === 核心模块引入 ===
// 注意：如果您的文件不在 modules 文件夹下，请去掉路径中的 modules/
import { DrawerUI } from './modules/drawer-ui.js';
import { OutlineGenerator } from './modules/outline-generator.js';
import { OptionGenerator } from './modules/option-generator.js';
import { WorldVariableExtractor } from './modules/world-variable-extractor.js';
import { PresetManager } from './modules/preset-manager.js';

const EXT_ID = "tabbit-plot-helper";
let drawerInstance = null; // 用于保存 UI 实例

/**
 * ================================
 * 插件初始化
 * ================================
 */
jQuery(() => {
  initSettings();
  injectDesktopExtensionMenuButton();
  setupMobileMagicWandLongPress();

  console.log("[剧情辅助器] 完整版已加载（长按魔法棒/扩展菜单入口）");
});

/**
 * ================================
 * 初始化设置
 * ================================
 */
function initSettings() {
  if (!extension_settings[EXT_ID]) {
    extension_settings[EXT_ID] = {};
    saveSettingsDebounced();
  }
}

/**
 * ================================
 * 桌面端：扩展菜单入口
 * ================================
 */
function injectDesktopExtensionMenuButton() {
  const menu = document.getElementById("extensionsMenu");
  if (!menu) return;

  if (document.getElementById("tabbit-plot-btn")) return;

  const btn = document.createElement("div");
  btn.id = "tabbit-plot-btn";
  btn.className = "list-group-item flex-container flexGap5";
  btn.innerHTML = `
    <div class="fa-solid fa-feather-pointed extensionsMenuExtensionButton"></div>
    <span>剧情辅助器</span>
  `;

  btn.addEventListener("click", openMainPopup);
  menu.prepend(btn);
}

/**
 * ================================
 * 手机端：魔法棒长按逻辑
 * ================================
 */
function setupMobileMagicWandLongPress() {
  if (window.__tabbitPlotMagicWandInstalled) return;
  window.__tabbitPlotMagicWandInstalled = true;

  const LONG_PRESS_MS = 500;
  let pressTimer = null;
  let longPressTriggered = false;

  const tryBind = () => {
    if (!isMobileViewport()) return;

    const wand = findMagicWandButton();
    if (!wand) return;

    if (wand.dataset.tabbitPlotBound === "true") return;
    wand.dataset.tabbitPlotBound = "true";

    wand.addEventListener(
      "touchstart",
      () => {
        longPressTriggered = false;
        pressTimer = setTimeout(() => {
          longPressTriggered = true;
          openMainPopup();
        }, LONG_PRESS_MS);
      },
      { passive: true }
    );

    wand.addEventListener(
      "touchend",
      (e) => {
        clearTimeout(pressTimer);
        if (longPressTriggered) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
      },
      true
    );

    wand.addEventListener("touchcancel", () => {
      clearTimeout(pressTimer);
    });
  };

  tryBind();
  setTimeout(tryBind, 600);
  setTimeout(tryBind, 1500);

  new MutationObserver(tryBind).observe(document.body, {
    childList: true,
    subtree: true
  });
}

function isMobileViewport() {
  return window.innerWidth <= 768;
}

function findMagicWandButton() {
  const selectors = [
    "#extensionsMenuButton",
    ".extensionsMenuButton",
    ".fa-wand-magic-sparkles",
    ".fa-magic",
    "[title*='扩展']"
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (!el) continue;
    return el.closest("button, div") || el;
  }
  return null;
}

/**
 * ================================
 * 主功能入口：初始化并打开抽屉面板
 * ================================
 */
function openMainPopup() {
  // 只有在第一次点击时才初始化所有模块
  if (!drawerInstance) {
    console.log("[剧情辅助器] 正在初始化 UI 组件...");
    try {
      const modules = {
        outlineGenerator: new OutlineGenerator(),
        optionGenerator: new OptionGenerator(),
        worldVariableExtractor: new WorldVariableExtractor(),
        presetManager: new PresetManager()
      };
      drawerInstance = new DrawerUI(modules);
    } catch (error) {
      console.error("[剧情辅助器] 初始化失败:", error);
      alert("插件初始化失败，请检查控制台报错。");
      return;
    }
  }

  // 展开抽屉
  drawerInstance.toggle(true);
}
