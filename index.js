// ============================================================
// 剧情辅助器 主入口
// 修补包 2-A.1：包含修复 ① 关闭魔法棒菜单
// ============================================================

import { extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced, eventSource, event_types } from "../../../../script.js";

import { StateStore } from "./modules/state-store.js";
import { DrawerUI } from "./modules/drawer-ui.js";

// ============================================================
// 常量
// ============================================================
const EXT_ID = "tabbit-plot-helper";
const EXT_DISPLAY_NAME = "剧情辅助器";

// ============================================================
// 默认设置（修补包 2-A.1 隔离声明：
//   所有字段仅作用于本插件，存储于 extension_settings["tabbit-plot-helper"]，
//   不读写酒馆主设置中的 world_info / preset 等任何字段）
// ============================================================
const DEFAULT_SETTINGS = {
  context: {
    messageMode: "recent20",
    customRangeStart: 0,
    customRangeEnd: 0,
    includeCharacterCard: true,
    includeUserPersona: true,
    includeWorldInfo: true,
    extraWorldInfoBookNames: [],   // 仅插件
    disabledEntries: {},           // 仅插件
  },
  advanced: {
    midFakeVictory: false,
    themeImage: false,
  },
  api: {
    mode: "follow",
    independent: { url: "", key: "", model: "" },
  },
  preset: {
    mode: "follow",
    customPresetName: "",
  },
};

// ============================================================
// 全局变量
// ============================================================
let drawerUI = null;
let stateStore = null;

// ============================================================
// 工具：递归补全默认字段
// ============================================================
function mergeDefaults(target, defaults) {
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
      mergeDefaults(target[key], defaults[key]);
    }
  }
}

// ============================================================
// 初始化设置
// ============================================================
function initSettings() {
  if (!extension_settings[EXT_ID]) {
    extension_settings[EXT_ID] = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  } else {
    mergeDefaults(extension_settings[EXT_ID], DEFAULT_SETTINGS);
  }
  saveSettingsDebounced();
}

// ============================================================
// 注入魔法棒菜单按钮（双端统一入口）
// ============================================================
function injectExtensionMenuButton() {
  if (document.getElementById("tabbit-plot-menu-btn")) return;

  const menu = document.getElementById("extensionsMenu");
  if (!menu) {
    setTimeout(injectExtensionMenuButton, 500);
    return;
  }

  const btn = document.createElement("div");
  btn.id = "tabbit-plot-menu-btn";
  btn.className = "list-group-item flex-container flexGap5 interactable";
  btn.tabIndex = 0;
  btn.title = `打开 `;
  btn.innerHTML = `
    <div class="fa-solid fa-feather-pointed extensionsMenuExtensionButton"></div>
    <span>📖 </span>
  `;

  btn.addEventListener("click", handleMenuButtonClick);
  menu.prepend(btn);
  console.log(`[] 入口按钮已注入到魔法棒菜单`);
}

// ============================================================
// 菜单按钮点击处理（修补包 2-A.1：修复 ①）
// ============================================================
function handleMenuButtonClick(e) {
  e.preventDefault();
  e.stopPropagation();

  // ===== 修复 ①：主动关闭魔法棒菜单 =====
  try {
    const wandMenus = document.querySelectorAll(
      "#extensionsMenu, .extensions-menu, " +
      "#wand-menu, .wand-menu, " +
      "#mobile-tools-menu, .options-content"
    );
    wandMenus.forEach(menu => {
      menu.style.display = "none";
      menu.classList.remove("shown", "open", "show", "active");
    });
    document.body.classList.remove("wand-open", "menu-open");
  } catch (err) {
    console.warn(`[] 关闭魔法棒菜单失败（不影响功能）:`, err);
  }

  // ===== 打开插件界面 =====
  try {
    if (!drawerUI) {
      drawerUI = new DrawerUI({
        extId: EXT_ID,
        displayName: EXT_DISPLAY_NAME,
        stateStore: stateStore,
        settings: extension_settings[EXT_ID],
        saveSettings: saveSettingsDebounced,
      });
    }
    drawerUI.open();
  } catch (error) {
    console.error(`[] 打开界面失败:`, error);
    alert(`[] 打开失败：

请把这段错误截图发给开发者。`);
  }
}

// ============================================================
// 修复菜单显示状态（防止下次打开魔法棒时菜单仍是 display:none）
// ============================================================
function bindMenuShowFix() {
  // 监听魔法棒触发器，只要点了魔法棒就还原菜单显示
  const triggers = document.querySelectorAll(
    "#extensionsMenuButton, #leftSendForm .menu_button, " +
    "#extensionsMenuButton i, .extensionsMenuButton"
  );
  triggers.forEach(t => {
    t.addEventListener("click", () => {
      // 异步执行，避免与酒馆自身打开逻辑冲突
      setTimeout(() => {
        const menu = document.getElementById("extensionsMenu");
        if (menu && menu.style.display === "none") {
          menu.style.display = "";
        }
      }, 0);
    });
  });
}

// ============================================================
// 启动
// ============================================================
jQuery(async () => {
  console.log(`[] 启动中...`);

  initSettings();
  stateStore = new StateStore(EXT_ID);

  // 注入入口按钮
  injectExtensionMenuButton();

  // 修复菜单显示状态
  setTimeout(bindMenuShowFix, 1000);

  // 监听聊天切换
  try {
    if (eventSource && event_types) {
      eventSource.on(event_types.CHAT_CHANGED, () => {
        if (stateStore) stateStore.onChatChanged();
        if (drawerUI) drawerUI.onChatChanged();
      });
    }
  } catch (e) {
    console.warn(`[] 事件监听绑定失败:`, e);
  }

  console.log(`[] 启动完成`);
});
// ============================================================
// 【临时调试浮层】手机端无法 F12 时使用
// 验证完毕后可删除整段
// ============================================================
(function setupDebugOverlay() {
  // 创建屏幕底部诊断条
  function makeBar() {
    if (document.getElementById("tabbit-debug-bar")) return;
    const bar = document.createElement("div");
    bar.id = "tabbit-debug-bar";
    Object.assign(bar.style, {
      position: "fixed",
      left: "0",
      right: "0",
      bottom: "0",
      background: "rgba(20,20,30,0.95)",
      color: "#0f0",
      fontSize: "11px",
      lineHeight: "1.4",
      padding: "6px 10px",
      zIndex: "999999",
      maxHeight: "40vh",
      overflowY: "auto",
      fontFamily: "monospace",
      whiteSpace: "pre-wrap",
      wordBreak: "break-all",
      borderTop: "2px solid #0f0",
    });
    bar.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
      <b>📋 剧情辅助器调试日志</b>
      <button id="tabbit-debug-close" style="background:#444;color:#fff;border:none;padding:2px 8px;border-radius:3px;font-size:11px;">关闭</button>
    </div>
    <div id="tabbit-debug-content"></div>`;
    document.body.appendChild(bar);
    document.getElementById("tabbit-debug-close").onclick = () => bar.remove();
  }

  function log(msg, color = "#0f0") {
    makeBar();
    const c = document.getElementById("tabbit-debug-content");
    if (!c) return;
    const line = document.createElement("div");
    line.style.color = color;
    line.textContent = `[] `;
    c.appendChild(line);
    c.scrollTop = c.scrollHeight;
  }

  // 1. 捕获全局报错
  window.addEventListener("error", (e) => {
    log(`❌ 全局错误: ` + ` @ : ` + (e.filename || "?") + ":" + (e.lineno || "?"), "#f55");
  });
  window.addEventListener("unhandledrejection", (e) => {
    log(`❌ Promise 拒绝: ` + (e.reason?.message || e.reason), "#f55");
  });

  // 2. 暴露手动诊断函数
  window.tabbitDiag = function () {
    log("===== 开始诊断 =====", "#ff0");

    // 检查酒馆环境
    log(`SillyTavern 全局: ` + (typeof window.SillyTavern !== "undefined" ? "✅" : "❌"));
    log(`extension_settings: ` + (typeof window.extension_settings !== "undefined" ? "✅" : "❌"));

    // 检查菜单容器
    const menu = document.getElementById("extensionsMenu");
    log(`#extensionsMenu: ` + (menu ? "✅ 存在" : "❌ 找不到"));
    if (menu) {
      log(`  └ display: ` + getComputedStyle(menu).display);
      log(`  └ 子元素数: ` + menu.children.length);
    }

    // 检查我们的按钮
    const btn = document.getElementById("tabbit-plot-menu-btn");
    log(`#tabbit-plot-menu-btn: ` + (btn ? "✅ 已注入" : "❌ 未注入"), btn ? "#0f0" : "#f55");
    if (btn) {
      log(`  └ display: ` + getComputedStyle(btn).display);
      log(`  └ visibility: ` + getComputedStyle(btn).visibility);
      log(`  └ parent: ` + (btn.parentElement?.id || btn.parentElement?.tagName));
    }

    // 检查 drawerUI
    log(`drawerUI 实例: ` + (typeof drawerUI !== "undefined" && drawerUI ? "✅" : "❌"));

    log("===== 诊断结束 =====", "#ff0");
  };

  // 3. 自动在加载完成后跑一次
  setTimeout(() => {
    log("✅ 调试浮层已加载");
    if (typeof window.tabbitDiag === "function") {
      try { window.tabbitDiag(); } catch (e) { log("诊断异常: " + e.message, "#f55"); }
    }
  }, 3000);

  // 4. 提供一个右上角的浮动按钮，方便随时点开诊断
  setTimeout(() => {
    if (document.getElementById("tabbit-diag-btn")) return;
    const diagBtn = document.createElement("div");
    diagBtn.id = "tabbit-diag-btn";
    diagBtn.textContent = "🔍诊断";
    Object.assign(diagBtn.style, {
      position: "fixed",
      top: "10px",
      right: "10px",
      background: "#f59e0b",
      color: "#000",
      padding: "6px 10px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: "bold",
      zIndex: "999998",
      cursor: "pointer",
      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
    });
    diagBtn.onclick = () => { try { window.tabbitDiag(); } catch (e) { log("err: " + e.message, "#f55"); } };
    document.body.appendChild(diagBtn);
  }, 4000);
})();

