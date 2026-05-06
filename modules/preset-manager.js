export function loadPresetOptionsToSelects(popup, settings) {
  const selects = [
    popup.querySelector("#tabbit-preset-outline"),
    popup.querySelector("#tabbit-preset-options"),
    popup.querySelector("#tabbit-preset-translate")
  ].filter(Boolean);

  if (selects.length === 0) return;

  const presets = getPresetListBestEffort();

  for (const select of selects) {
    const oldValue = select.value;
    select.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "跟随当前预设 / 不指定";
    select.appendChild(defaultOption);

    presets.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = preset.name;
      select.appendChild(option);
    });

    if (oldValue) select.value = oldValue;
  }

  const outline = popup.querySelector("#tabbit-preset-outline");
  const options = popup.querySelector("#tabbit-preset-options");
  const translate = popup.querySelector("#tabbit-preset-translate");

  if (outline && settings.preset.outlinePreset) outline.value = settings.preset.outlinePreset;
  if (options && settings.preset.optionsPreset) options.value = settings.preset.optionsPreset;
  if (translate && settings.preset.translatePreset) translate.value = settings.preset.translatePreset;
}

function getPresetListBestEffort() {
  const result = [];

  try {
    const ctx = window.SillyTavern && typeof window.SillyTavern.getContext === "function"
      ? window.SillyTavern.getContext()
      : null;

    if (ctx && typeof ctx.getPresetManager === "function") {
      const manager = ctx.getPresetManager();
      const list = manager && (manager.presets || manager.presetList || manager.items);
      if (Array.isArray(list)) {
        list.forEach((item) => {
          result.push({
            id: item.id || item.name || item.filename || String(item),
            name: item.name || item.filename || item.id || String(item)
          });
        });
      }
    }
  } catch (_) {}

  try {
    const candidates = [
      window.openai_setting_names,
      window.preset_names,
      window.textgenerationwebui_preset_names
    ];

    candidates.forEach((list) => {
      if (Array.isArray(list)) {
        list.forEach((name) => {
          if (name && !result.some((item) => item.id === name)) {
            result.push({
              id: name,
              name: name
            });
          }
        });
      }
    });
  } catch (_) {}

  if (result.length === 0) {
    result.push({
      id: "current",
      name: "当前酒馆预设"
    });
  }

  return result;
}
