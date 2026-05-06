export class OptionGenerator {
  constructor() {
    this.options = [];
    this.cacheTime = null;
    this.CACHE_DURATION = 10 * 60 * 1000; 
  }

  async generate(force = false) {
    // 如果用户点击重新生成，清除缓存
    if (force) this.clearCache();

    if (!force && this.isCacheValid()) {
      return this.options;
    }

    const activeOutline = this.getActiveOutline();
    const chatHistory = this.getChatHistory();
    const variables = this.getWorldVariables();
    
    const prompt = this.buildPrompt(activeOutline, chatHistory, variables);
    const response = await this.callAI(prompt);
    
    this.options = this.parseResponse(response);
    this.cacheTime = Date.now();
    
    return this.options;
  }

  isCacheValid() {
    if (!this.cacheTime || !this.options.length) return false;
    return (Date.now() - this.cacheTime) < this.CACHE_DURATION;
  }

  getActiveOutline() {
    if (window.chat_metadata && window.chat_metadata.tabbit_outlines) {
      return window.chat_metadata.tabbit_outlines.find(o => o.active);
    }
    return null;
  }

  getChatHistory() {
    const messages = (window.chat || []).slice(-15);
    return messages.map(msg => ({
      role: msg.is_user ? 'user' : 'assistant',
      content: msg.mes
    }));
  }

  getWorldVariables() {
    if (window.chat_metadata && window.chat_metadata.tabbit_variables) {
      return window.chat_metadata.tabbit_variables;
    }
    return [];
  }

  buildPrompt(outline, chatHistory, variables) {
    const historyText = chatHistory
      .map(msg => `${msg.role === 'user' ? '用户' : '角色'}: ${msg.content}`)
      .join('\n\n');

    const variablesText = variables.length > 0 
      ? variables.map(v => `- ${v.name}: ${v.value} ${v.revealed ? '(已揭示)' : '(未揭示)'}`).join('\n')
      : "暂无";

    // 动态调整提示词：有大纲则结合大纲，无大纲则仅基于聊天
    let outlineSection = outline 
      ? `【当前激活大纲】\n${outline.content}\n（请确保选项符合大纲的发展方向）` 
      : "【当前大纲】\n无（请完全基于当前聊天内容和角色性格提供后续方向）";

    return `根据以下信息，生成5个不同类型的剧情选项：

${outlineSection}

【最近对话】
${historyText}

【世界变量】
${variablesText}

请生成以下5种类型的选项，每种1个：
1. 主线推进 - 直接推动剧情向前发展
2. 关系演变 - 改变或加深角色间的关系、情感、信任或矛盾
3. 机会意外 - 引入突发事件、新信息、新危机或外部干预
4. 暗流涌动 - 涉及后台秘密、埋下伏笔、或推进已存在的暗线
5. 内在冲突 - 涉及角色的心理挣扎、信念挑战、价值观冲突或两难选择

每个选项请按以下格式输出：
[类型] (影响等级: low/medium/high)
内容

示例：
[主线推进] (影响等级: medium)
你决定不再等待，直接推开那扇尘封已久的密室大门。`;
  }

  async callAI(prompt) {
    const generate = window.generateQuietPrompt || (window.getContext && window.getContext().generateQuietPrompt);
    if (typeof generate !== 'function') throw new Error("找不到AI生成接口！");
    return await generate(prompt, false, false);
  }

  parseResponse(response) {
    const options = [];
    const lines = response.split('\n');
    let currentOption = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      const headerMatch = trimmed.match(/^\[([^\]]+)\]\s*\(影响等级:\s*(\w+)\)/);
      
      if (headerMatch) {
        if (currentOption && currentOption.content) options.push(currentOption);
        currentOption = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type: this.mapType(headerMatch[1]),
          impact: headerMatch[2].toLowerCase(),
          content: ''
        };
      } else if (currentOption && trimmed.length > 0) {
        currentOption.content += (currentOption.content ? '\n' : '') + trimmed;
      }
    }
    if (currentOption && currentOption.content) options.push(currentOption);
    return options;
  }

  mapType(typeName) {
    const map = {
      '主线推进': 'push',
      '关系演变': 'deepen',
      '机会意外': 'turn',
      '暗流涌动': 'foreshadow',
      '内在冲突': 'conflict'
    };
    return map[typeName] || 'push';
  }

  getOptions() { return this.options; }
  getOptionById(id) { return this.options.find(o => o.id === id); }
  clearCache() { this.options = []; this.cacheTime = null; }
}
