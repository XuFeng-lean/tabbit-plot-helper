export class OutlineGenerator {
  constructor() {
    this.outlines = [];
    this.loadFromMetadata();
  }

  loadFromMetadata() {
    // 强行从酒馆全局变量读取元数据
    if (window.chat_metadata && window.chat_metadata.tabbit_outlines) {
      this.outlines = window.chat_metadata.tabbit_outlines;
    }
  }

  saveToMetadata() {
    if (!window.chat_metadata) window.chat_metadata = {};
    window.chat_metadata.tabbit_outlines = this.outlines;
    // 调用酒馆全局保存方法
    if (typeof window.saveMetadata === 'function') {
      window.saveMetadata();
    }
  }

  async generate() {
    const chatHistory = this.getChatHistory();
    const prompt = this.buildPrompt(chatHistory);
    const response = await this.callAI(prompt);
    const outline = this.parseResponse(response);
    this.addOutline(outline);
    return outline;
  }

  getChatHistory() {
    // 使用 window.chat 获取最近对话
    const messages = (window.chat || []).slice(-20);
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
    // 兼容多种酒馆版本获取 AI 接口
    const generate = window.generateQuietPrompt || (window.getContext && window.getContext().generateQuietPrompt);
    if (typeof generate !== 'function') {
      throw new Error("找不到酒馆的AI生成接口，请确保已连接模型！");
    }
    return await generate(prompt, false, false);
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
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0 && trimmed.length < 50) {
        return trimmed.replace(/^#+\s*/, '');
      }
    }
    return '大纲 ' + new Date().toLocaleString();
  }

  addOutline(outline) {
    this.outlines.push(outline);
    this.saveToMetadata();
  }

  getOutlines() { return this.outlines; }
  getOutlineById(id) { return this.outlines.find(o => o.id === id); }
  getActiveOutline() { return this.outlines.find(o => o.active); }

  activateOutline(id) {
    this.outlines.forEach(o => o.active = false);
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

  deleteOutline(id) {
    this.outlines = this.outlines.filter(o => o.id !== id);
    this.saveToMetadata();
  }
}
