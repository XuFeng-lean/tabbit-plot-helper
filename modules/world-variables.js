export function ensurePlotStore(chatMetadata) {
  if (!chatMetadata.tabbit_plot) {
    chatMetadata.tabbit_plot = {
      active_outline: null,
      outline_drafts: [],
      world_variables: [],
      used_options: [],
      config: {}
    };
  }

  const store = chatMetadata.tabbit_plot;

  if (!Array.isArray(store.outline_drafts)) store.outline_drafts = [];
  if (!Array.isArray(store.world_variables)) store.world_variables = [];
  if (!Array.isArray(store.used_options)) store.used_options = [];
  if (!store.config || typeof store.config !== "object") store.config = {};

  return store;
}

export function saveOutlineToStore(chatMetadata, outline) {
  const store = ensurePlotStore(chatMetadata);

  store.active_outline = {
    ...outline,
    saved_at: new Date().toISOString()
  };

  store.outline_drafts.unshift({
    ...outline,
    saved_at: new Date().toISOString()
  });

  store.outline_drafts = store.outline_drafts.slice(0, 20);
}

export function mergeWorldVariables(chatMetadata, variables) {
  const store = ensurePlotStore(chatMetadata);

  const existing = new Set(
    store.world_variables.map((item) => normalizeVariableKey(item))
  );

  for (const variable of variables) {
    const key = normalizeVariableKey(variable);
    if (!key || existing.has(key)) continue;

    store.world_variables.unshift({
      title: variable.title || "未命名暗线",
      description: variable.description || String(variable),
      status: variable.status || "active",
      created_at: new Date().toISOString()
    });

    existing.add(key);
  }

  store.world_variables = store.world_variables.slice(0, 12);
}

export function saveUsedOption(chatMetadata, option) {
  const store = ensurePlotStore(chatMetadata);

  store.used_options.unshift({
    ...option,
    used_at: new Date().toISOString()
  });

  store.used_options = store.used_options.slice(0, 20);
}

function normalizeVariableKey(variable) {
  if (!variable) return "";
  if (typeof variable === "string") return variable.trim();
  return String(variable.title || variable.description || "").trim();
}
