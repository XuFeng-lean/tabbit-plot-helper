// 剧情辅助器 - 手机端魔法棒入口版
import { extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

const EXT_ID = "tabbit-plot-helper";

/**
 * 插件初始化
 */
jQuery(() => {
  initSettings();
  injectDesktopExtensionMenuButton();
  setupMobileMagicWandHijack();

  console.log("[剧情辅助器] 已加载（魔法棒入口模式）");
});

/**
 * 初始化设置（占位，避免报错）
 */
function initSettings() {
  if (!extension_settings[EXT_ID]) {
    extension_settings[EXT_ID] = {};
    saveSettingsDebounced();
  }
}

/**
 * 电脑端：扩展菜单入口（手机端无视）
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
 * ✅ 手机端：接管魔法棒按钮
 */
function setupMobileMagicWandHijack() {
  const tryBind = () => {
    if (!isMobile()) return;

    const wand = findMagicWandButton();
    if (!wand) return;

    if (wand.dataset.tabbitPlotBound === "true") return;
    wand.dataset.tabbitPlotBound = "true";

    // 捕获阶段拦截点击
    wand.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        openMainPopup();
      },
      true
    );

    // 触摸端兜底
    wand.addEventListener(
      "touchend",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        openMainPopup();
      },
      true
    );

    console.log("[剧情辅助器] 已接管魔法棒按钮");
  };

  // 多次尝试，适配异步渲染
  tryBind();
  setTimeout(tryBind, 500);
  setTimeout(tryBind, 1200);
  setTimeout(tryBind, 2500);

  new MutationObserver(tryBind).observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * 打开主弹窗（占位版）
 * ✅ 你后面可以接回完整 UI
 */
function openMainPopup() {
  alert("✅ 剧情辅助器已成功打开（说明入口已生效）");
}

/**
 * 判断是否手机端
 */
function isMobile() {
  return window.innerWidth <= 768;
}

/**
 * 尝试定位魔法棒按钮
 */
function findMagicWandButton() {
  const selectors = [
    "#extensionsMenuButton",
    ".extensionsMenuButton",
    ".fa-wand-magic-sparkles",
    ".fa-magic",
    "[title*='扩展']",
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
