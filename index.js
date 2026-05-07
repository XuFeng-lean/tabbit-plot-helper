// ============================================================
// 剧情辅助器 · 阶段 1：UI 骨架版
// ============================================================
// 入口策略（双端统一）：
//   魔法棒菜单（extensionsMenu）里加一项「📖 剧情辅助器」
//   点击后打开抽屉式界面，包含三个 Tab：
//     - 主线大纲（阶段 2 实现）
//     - 剧情选项（阶段 3 实现）
//     - 设置（阶段 4 实现）
// ============================================================

import { extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced, eventSource, event_types } from "../../../../script.js";

import { StateStore } from "./modules/state-store.js";
import { DrawerUI } from "./modules/drawer-ui.js";

const EXT_ID = "tabbit-plot-helper";
const EXT_DISPLAY_NAME = "剧情辅助器";

let stateStore = null;
let drawerUI = null;

// ============================================================
// 默认设置（阶段 1 先放占位，后续阶段会扩充）
// ============================================================
const DEFAULT_SETTINGS = {
  context: {
    messageMode: "recent20",      // recent20 | recent50 | recent100 | all | custom
    customRangeStart: 0,          // 自定义区间起始楼层
    customRangeEnd: 0,            // 自定义区间结束楼层
    includeCharacterCard: true,
    includeUserPersona: true,
    includeWorldInfo: true,
    extraWorldInfoBookNames: [],  // 用户在设置里勾选的额外世界书
    disabledEntries: {},          // { bookName: [uid1, uid2, ...] } 用户手动禁用的条目
  },
  advanced: {
    midFakeVictory: false,
    themeImage: false,
  },
  api: {
    mode: "follow",               // follow | independent
    independent: {
      url: "",
      key: "",
      model: "",
    },
  },
  preset: {
    mode: "follow",               // follow | custom
    customPresetName: "",
  },
};


// ============================================================
// 初始化设置（深合并，保证升级时不丢字段）
// ============================================================
function initSettings() {
  if (!extension_settings[EXT_ID]) {
    extension_settings[EXT_ID] = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  } else {
    deepMergeDefaults(extension_settings[EXT_ID], DEFAULT_SETTINGS);
  }
  saveSettingsDebounced();
  return extension_settings[EXT_ID];
}

function deepMergeDefaults(target, defaults) {
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
      deepMergeDefaults(target[key], defaults[key]);
    }
  }
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
  btn.title = `打开${EXT_DISPLAY_NAME}`;

  btn.innerHTML = `
    <div class="fa-solid fa-feather-pointed extensionsMenuExtensionButton"></div>
    <span>📖 ${EXT_DISPLAY_NAME}</span>
  `;

  btn.addEventListener("click", handleMenuButtonClick);
  menu.prepend(btn);

  console.log(`[${EXT_ID}] 入口按钮已注入到魔法棒菜单`);
}

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
      // 酒馆常见的关闭方式
      menu.style.display = "none";
      menu.classList.remove("shown", "open", "show", "active");
    });

    // 部分主题用 body 上的 class 控制菜单
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
// 启动
// ============================================================
jQuery(async () => {
  try {
    initSettings();
    stateStore = new StateStore(EXT_ID);

    injectExtensionMenuButton();

    // 监听聊天切换：状态需要重新绑定到当前聊天
    if (eventSource && event_types) {
      eventSource.on(event_types.CHAT_CHANGED, () => {
        if (stateStore) stateStore.onChatChanged();
        if (drawerUI) drawerUI.onChatChanged();
      });
    }

    console.log(`[${EXT_ID}] 阶段 1 加载完成`);
  } catch (error) {
    console.error(`[${EXT_ID}] 初始化失败:`, error);
  }
});

