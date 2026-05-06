export class WorldVariableExtractor {
  constructor() {
    this.variables = [];
    this.loadFromMetadata();
  }

  loadFromMetadata() {
    if (window.chat_metadata && window.chat_metadata.tabbit_variables) {
      this.variables = window.chat_metadata.tabbit_variables;
    }
  }

  saveToMetadata() {
    if (!window.chat_metadata) window.chat_metadata = {};
    window.chat_metadata.tabbit_variables = this.variables;
    if (typeof window.saveMetadata === 'function') window.saveMetadata();
  }

  async extract() {
    const chatHistory = this.getChatHistory();
    const prompt = this.buildPrompt(chatHistory);
    const response = await this.callAI(prompt);
    const newVariables = this.parseResponse(response);
    this.mergeVariables(newVariables);
    return this.variables;
  }

  getChatHistory() {
    const messages = (window.chat || []).slice(-30);
    return messages.map(msg => ({
      role: msg.is_user ? 'user' : 'assistant',
      content: msg.mes
    }));
  }

  buildPrompt(chatHistory) {
    const historyText = chatHistory
      .map(msg => `${msg.role === 'user' ? '用户' : '角色'}: ${msg.content}`)
      .join('\n\n');

    return `请从以下对话中提取重要的世界变量（角色背景、秘密、动机、设定规则、关键线索等）。
对话历史：
${historyText}

请按格式输出：[分类] 变量名: 变量值 (状态: revealed/hidden)`;
  }

  async callAI(prompt) {
    const generate = window.generateQuietPrompt || (window.getContext && window.getContext().generateQuietPrompt);
    if (typeof generate !== 'function') throw new Error("找不到AI生成接口！");
    return await generate(prompt, false, false);
  }

  parseResponse(response) {
    const vars = [];
    const lines = response.split('\n');
    for (const line of lines) {
      const match = line.trim().match(/^\[([^\]]+)\]\s*([^:]+):\s*([^(]+)\s*\(状态:\s*(revealed|hidden)\)/);
      if (match) {
        vars.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          category: match[1].trim(),
          name: match[2].trim(),
          value: match[3].trim(),
          revealed: match[4] === 'revealed',
          timestamp: Date.now()
        });
      }
    }
    return vars;
  }

  mergeVariables(newVariables) {
    newVariables.forEach(nv => {
      const existing = this.variables.find(v => v.name.toLowerCase() === nv.name.toLowerCase());
      if (existing) {
        existing.value = nv.value;
        existing.revealed = nv.revealed;
      } else {
        this.variables.push(nv);
      }
    });
    this.saveToMetadata();
  }

  addVariable(v) {
    this.variables.push({ id: Date.now().toString(), timestamp: Date.now(), ...v });
    this.saveToMetadata();
  }

  getVariables() { return this.variables; }
  getVariableById(id) { return this.variables.find(v => v.id === id); }
  toggleRevealed(id) {
    const v = this.getVariableById(id);
    if (v) { v.revealed = !v.revealed; this.saveToMetadata(); }
  }
  updateVariable(id, updates) {
    const v = this.getVariableById(id);
    if (v) { Object.assign(v, updates); this.saveToMetadata(); }
  }
  deleteVariable(id) {
    this.variables = this.variables.filter(v => v.id !== id);
    this.saveToMetadata();
  }
}
