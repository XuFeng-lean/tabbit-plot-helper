import { chat_metadata, saveMetadata, chat, generateQuietPrompt } from "../../../../../script.js";
export class WorldVariableExtractor {
  constructor() {
    this.variables = [];
    this.loadFromMetadata();
  }

  loadFromMetadata() {
    if (chat_metadata.tabbit_variables) {
      this.variables = chat_metadata.tabbit_variables;
    }
  }

  saveToMetadata() {
    chat_metadata.tabbit_variables = this.variables;
    saveMetadata();
  }

  async extract() {
    // 获取聊天历史
    const chatHistory = this.getChatHistory();
    
    // 构建提示词
    const prompt = this.buildPrompt(chatHistory);
    
    // 调用 AI 提取
    const response = await this.callAI(prompt);
    
    // 解析响应
    const newVariables = this.parseResponse(response);
    
    // 合并变量（避免重复）
    this.mergeVariables(newVariables);
    
    return this.variables;
  }

  getChatHistory() {
    const messages = chat.slice(-30); // 获取最近30条消息
    return messages.map(msg => ({
      role: msg.is_user ? 'user' : 'assistant',
      content: msg.mes
    }));
  }

  buildPrompt(chatHistory) {
    const historyText = chatHistory
      .map(msg => `${msg.role === 'user' ? '用户' : '角色'}: ${msg.content}`)
      .join('\n\n');

    return `请从以下对话中提取重要的世界变量。世界变量是指：
- 角色的背景信息、秘密、动机
- 世界观设定、规则
- 重要物品、地点
- 关键事件、线索
- 角色关系状态

对话历史：
${historyText}

请按以下格式输出每个变量：
[分类] 变量名: 变量值 (状态: revealed/hidden)

分类可以是: 角色、世界观、物品、地点、事件、关系等

示例：
[角色] 艾莉娅的真实身份: 她是失踪公主的女儿 (状态: hidden)
[物品] 神秘信件: 包含关于宝藏位置的线索 (状态: revealed)
[关系] 主角与艾莉娅: 逐渐建立信任 (状态: revealed)`;
  }

  async callAI(prompt) {
    const response = await generateQuietPrompt(prompt, false, false);
    return response;
  }

  parseResponse(response) {
    const variables = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // 匹配格式: [分类] 变量名: 变量值 (状态: revealed/hidden)
      const match = trimmed.match(/^\[([^\]]+)\]\s*([^:]+):\s*([^(]+)\s*\(状态:\s*(revealed|hidden)\)/);
      
      if (match) {
        variables.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          category: match[1].trim(),
          name: match[2].trim(),
          value: match[3].trim(),
          revealed: match[4] === 'revealed',
          timestamp: Date.now()
        });
      }
    }
    
    return variables;
  }

  mergeVariables(newVariables) {
    newVariables.forEach(newVar => {
      // 检查是否已存在相同名称的变量
      const existing = this.variables.find(v => 
        v.name.toLowerCase() === newVar.name.toLowerCase()
      );
      
      if (existing) {
        // 更新现有变量
        existing.value = newVar.value;
        existing.revealed = newVar.revealed;
        existing.timestamp = newVar.timestamp;
      } else {
        // 添加新变量
        this.variables.push(newVar);
      }
    });
    
    this.saveToMetadata();
  }

  addVariable(variable) {
    this.variables.push({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      revealed: false,
      ...variable
    });
    this.saveToMetadata();
  }

  getVariables() {
    return this.variables;
  }

  getVariableById(id) {
    return this.variables.find(v => v.id === id);
  }

  toggleRevealed(id) {
    const variable = this.getVariableById(id);
    if (variable) {
      variable.revealed = !variable.revealed;
      this.saveToMetadata();
    }
  }

  updateVariable(id, updates) {
    const variable = this.getVariableById(id);
    if (variable) {
      Object.assign(variable, updates);
      this.saveToMetadata();
    }
  }

  deleteVariable(id) {
    this.variables = this.variables.filter(v => v.id !== id);
    this.saveToMetadata();
  }
}
