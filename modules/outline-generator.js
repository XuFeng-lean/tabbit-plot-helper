import { chat_metadata, saveMetadata, chat } from "../../../../../script.js";
export class OutlineGenerator {
  constructor() {
    this.outlines = [];
    this.loadFromMetadata();
  }

  loadFromMetadata() {
    if (chat_metadata.tabbit_outlines) {
      this.outlines = chat_metadata.tabbit_outlines;
    }
  }

  saveToMetadata() {
    chat_metadata.tabbit_outlines = this.outlines;
    saveMetadata();
  }

  async generate() {
    // 获取聊天历史
    const chatHistory = this.getChatHistory();
    
    // 构建提示词
    const prompt = this.buildPrompt(chatHistory);
    
    // 调用 AI 生成
    const response = await this.callAI(prompt);
    
    // 解析响应
    const outline = this.parseResponse(response);
    
    // 保存大纲
    this.addOutline(outline);
    
    return outline;
  }

  getChatHistory() {
    const messages = chat.slice(-20); // 获取最近20条消息
    return messages.map(msg => ({
      role: msg.is_user ? 'user' : 'assistant',
      content: msg.mes
    }));
  }

  buildPrompt(chatHistory) {
    const historyText = chatHistory
      .map(msg => `${msg.role === 'user' ? '用户' : '角色'}: ${msg.content}`)
      .join('\n\n');

    return `请根据以下对话历史，生成一个剧情大纲。大纲应该包含：
1. 当前剧情的核心冲突
2. 主要角色的目标和动机
3. 可能的剧情发展方向（3-5个）
4. 潜在的高潮点

对话历史：
${historyText}

请以清晰、结构化的方式输出大纲。`;
  }

  async callAI(prompt) {
    // 使用 SillyTavern 的 AI 生成功能
    const response = await generateQuietPrompt(prompt, false, false);
    return response;
  }

  parseResponse(response) {
    return {
      id: Date.now().toString(),
      title: this.extractTitle(response),
      content: response,
      timestamp: Date.now(),
      active: false
    };
  }

  extractTitle(content) {
    // 尝试从内容中提取标题
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.trim().length > 0 && line.trim().length < 50) {
        return line.trim().replace(/^#+\s*/, '');
      }
    }
    return '大纲 ' + new Date().toLocaleString();
  }

  addOutline(outline) {
    this.outlines.push(outline);
    this.saveToMetadata();
  }

  getOutlines() {
    return this.outlines;
  }

  getOutlineById(id) {
    return this.outlines.find(o => o.id === id);
  }

  getActiveOutline() {
    return this.outlines.find(o => o.active);
  }

  activateOutline(id) {
    // 取消所有激活状态
    this.outlines.forEach(o => o.active = false);
    
    // 激活指定大纲
    const outline = this.getOutlineById(id);
    if (outline) {
      outline.active = true;
      this.saveToMetadata();
    }
  }

  updateOutline(id, updates) {
    const outline = this.getOutlineById(id);
    if (outline) {
      Object.assign(outline, updates);
      this.saveToMetadata();
    }
  }

  deleteOutline(id) {
    this.outlines = this.outlines.filter(o => o.id !== id);
    this.saveToMetadata();
  }
}
