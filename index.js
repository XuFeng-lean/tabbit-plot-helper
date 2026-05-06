// ================================
// 剧情辅助器 · 最终稳定入口版 index.js
// 手机端：魔法棒【短按原功能 / 长按剧情辅助器】
// 桌面端：扩展菜单入口
// ================================

import { extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

const EXT_ID = "tabbit-plot-helper";

/**
 * ================================
 * 插件初始化
 * ================================
 */
jQuery(() => {
  initSettings();
  injectDesktopExtensionMenuButton();
  setupMobileMagicWandLongPress();

  console.log("[剧情辅助器] 已加载（长按魔法棒入口模式）");
});

/**
 * ================================
 * 初始化设置（占位，防止 undefined）
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
 * 短按：酒馆原功能
 * 长按（>= 500ms）：剧情辅助器
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

    // ===== 触摸开始 =====
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

    // ===== 触摸结束 =====
    wand.addEventListener(
      "touchend",
      (e) => {
        clearTimeout(pressTimer);

        // 如果已经触发长按，阻止后续 click
        if (longPressTriggered) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
      },
      true
    );

    // ===== 触摸取消（滑走 / 中断）=====
    wand.addEventListener("touchcancel", () => {
      clearTimeout(pressTimer);
    });

    console.log("[剧情辅助器] 魔法棒已绑定：短按原功能 / 长按剧情辅助器");
  };

  // 多次尝试，适配酒馆异步渲染
  tryBind();
  setTimeout(tryBind, 600);
  setTimeout(tryBind, 1500);

  new MutationObserver(tryBind).observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * ================================
 * 判断是否手机端
 * ================================
 */
function isMobileViewport() {
  return window.innerWidth <= 768;
}

/**
 * ================================
 * 查找魔法棒按钮（多重兜底）
 * ================================
 */
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

  // 兜底：扫描底部区域
  const all = Array.from(document.querySelectorAll("button, div, i"));
  const h = window.innerHeight;

  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.top < h * 0.6) continue;

    const cls = String(el.className || "").toLowerCase();
    if (cls.includes("wand") || cls.includes("magic")) {
      return el.closest("button, div") || el;
    }
  }

  return null;
}

/**
 * ================================
 * 主弹窗入口（当前为验证版）
 * ✅ 你确认稳定后，我可以帮你无缝接回完整 UI
 * ================================
 */
function openMainPopup() {
  alert("✅ 剧情辅助器已成功打开（入口稳定版）");
}
