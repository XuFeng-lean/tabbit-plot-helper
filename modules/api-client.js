import { chat, chat_metadata, saveMetadata, generateQuietPrompt } from "../../../../../script.js";
export async function callLLM({ prompt, task, settings, context }) {
  if (settings.api && settings.api.enabled) {
    return await callIndependentOpenAI(prompt, settings.api);
  }

  return await callSillyTavernMainApi(prompt, task, context);
}

export async function testIndependentApi(apiConfig) {
  try {
    if (!apiConfig.baseUrl || !apiConfig.apiKey || !apiConfig.model) {
      return {
        ok: false,
        message: "请填写 Base URL、API Key 和模型名称。"
      };
    }

    const text = await callIndependentOpenAI("请只回复：连接成功", {
      ...apiConfig,
      maxTokens: 20,
      temperature: 0
    });

    return {
      ok: true,
      message: text
    };
  } catch (error) {
    return {
      ok: false,
      message: normalizeError(error)
    };
  }
}

async function callIndependentOpenAI(prompt, apiConfig) {
  const base = apiConfig.baseUrl.replace(/\/$/, "");
  const url = base.endsWith("/chat/completions")
    ? base
    : base + "/chat/completions";

  const headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + apiConfig.apiKey
  };

  if (apiConfig.customHeaders && typeof apiConfig.customHeaders === "object") {
    Object.assign(headers, apiConfig.customHeaders);
  }

  const body = {
    model: apiConfig.model,
    messages: [
      {
        role: "system",
        content: "你是一个专业的互动式小说剧情策划助手。请严格按照用户要求的 JSON 格式输出，不要输出多余解释。"
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: Number(apiConfig.temperature ?? 0.85),
    max_tokens: Number(apiConfig.maxTokens ?? 4000)
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error("独立 API 请求失败：" + response.status + " " + errorText);
  }

  const data = await response.json();
  const content =
    data &&
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    data.choices[0].message.content;

  if (!content) {
    throw new Error("独立 API 没有返回有效内容。");
  }

  return content;
}

async function callSillyTavernMainApi(prompt, task, contextData) {
  const ctx = window.getContext ? window.getContext() : null;

  if (ctx && typeof ctx.generateQuietPrompt === "function") {
    return await ctx.generateQuietPrompt(prompt, false, false);
  }

  if (ctx && typeof ctx.generateRaw === "function") {
    return await ctx.generateRaw(prompt);
  }

  if (window.SillyTavern && typeof window.SillyTavern.getContext === "function") {
    const stContext = window.SillyTavern.getContext();
    if (stContext && typeof stContext.generateQuietPrompt === "function") {
      return await stContext.generateQuietPrompt(prompt, false, false);
    }
  }

  throw new Error(
    "未找到可用的酒馆主 API 调用函数。请启用独立 API，或确认当前酒馆版本暴露 generateQuietPrompt。"
  );
}

async function safeReadText(response) {
  try {
    return await response.text();
  } catch (_) {
    return "";
  }
}

function normalizeError(error) {
  const message = error && error.message ? error.message : String(error);

  if (message.includes("Failed to fetch")) {
    return "浏览器请求失败。手机端常见原因是第三方 API 没有开启 CORS，请尝试使用支持浏览器跨域的中转站，或改用酒馆主 API。";
  }

  return message;
}
