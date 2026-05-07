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

