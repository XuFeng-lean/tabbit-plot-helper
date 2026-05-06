import { chat_metadata, saveMetadata, chat, generateQuietPrompt } from "../../../../../script.js";
export class OptionGenerator {
  constructor() {
    this.options = [];
    this.cache = null;
    this.cacheTime = null;
    this.CACHE_DURATION = 10 * 60 * 1000; // 10分钟
  }

  async generate() {
    // 检查缓存
    if (this.isCacheValid()) {
      return this.options;
    }

    // 获取激活的大纲
    const activeOutline = this.getActiveOutline();
    if (!activeOutline) {
      throw new Error('没有激活的大纲');
    }

    // 获取聊天历史
    const chatHistory = this.getChatHistory();
    
    // 获取世界变量
    const variables = this.getWorldVariables();
    
    // 构建提示词
    const prompt = this.buildPrompt(activeOutline, chatHistory, variables);
    
    // 调用 AI 生成
    const response = await this.callAI(prompt);
    
    // 解析响应
    this.options = this.parseResponse(response);
    
    // 更新缓存
    this.cacheTime = Date.now();
    
    return this.options;
  }

  isCacheValid() {
    if (!this.cacheTime || !this.options.length) return false;
    return (Date.now() - this.cacheTime) < this.CACHE_DURATION;
  }

  getActiveOutline() {
    if (chat_metadata.tabbit_outlines) {
      return chat_metadata.tabbit_outlines.find(o => o.active);
    }
    return null;
  }

  getChatHistory() {
    const messages = chat.slice(-10); // 获取最近10条消息
    return messages.map(msg => ({
      role: msg.is_user ? 'user' : 'assistant',
      content: msg.mes
    }));
  }

  getWorldVariables() {
    if (chat_metadata.tabbit_variables) {
      return chat_metadata.tabbit_variables;
    }
    return [];
  }

  buildPrompt(outline, chatHistory, variables) {
    const historyText = chatHistory
      .map(msg => `${msg.role === 'user' ? '用户' : '角色'}: ${msg.content}`)
      .join('\n\n');

    const variablesText = variables
      .map(v => `- ${v.name}: ${v.value} ${v.revealed ? '(已揭示)' : '(未揭示)'}`)
      .join('\n');

    return `根据以下信息，生成4个不同类型的剧情选项：

【大纲】
${outline.content}

【最近对话】
${historyText}

【世界变量】
${variablesText}

请生成以下4种类型的选项，每种1个：
1. push（推进主线）- 直接推动剧情向前发展
2. turn（剧情转折）- 引入意外或转折
3. deepen（深化关系）- 加深角色关系或情感
4. foreshadow（埋下伏笔）- 为未来剧情埋下线索

每个选项请按以下格式输出：
[类型] (影响等级: low/medium/high)
选项内容

示例：
[push] (影响等级: medium)
你决定直接询问她关于那封神秘信件的事情。`;
  }

  async callAI(prompt) {
    const response = await generateQuietPrompt(prompt, false, false);
    return response;
  }

  parseResponse(response) {
    const options = [];
    const lines = response.split('\n');
    
    let currentOption = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // 匹配选项头部: [type] (影响等级: level)
      const headerMatch = trimmed.match(/^\[(\w+)\]\s*\(影响等级:\s*(\w+)\)/);
      
      if (headerMatch) {
        // 保存上一个选项
        if (currentOption && currentOption.content) {
          options.push(currentOption);
        }
        
        // 开始新选项
        currentOption = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type: headerMatch[1],
          impact: headerMatch[2],
          content: ''
        };
      } else if (currentOption && trimmed.length > 0) {
        // 添加内容到当前选项
        if (currentOption.content) {
          currentOption.content += '\n' + trimmed;
        } else {
          currentOption.content = trimmed;
        }
      }
    }
    
    // 保存最后一个选项
    if (currentOption && currentOption.content) {
      options.push(currentOption);
    }
    
    // 如果解析失败，尝试简单分割
    if (options.length === 0) {
      const parts = response.split(/\[(?:push|turn|deepen|foreshadow)\]/i);
      parts.forEach((part, index) => {
        if (index === 0) return; // 跳过第一个空部分
        
        const content = part.trim();
        if (content) {
          options.push({
            id: Date.now().toString() + index,
            type: this.guessType(content),
            impact: 'medium',
            content: content.replace(/\(影响等级:.*?\)/g, '').trim()
          });
        }
      });
    }
    
    return options;
  }

  guessType(content) {
    const lower = content.toLowerCase();
    if (lower.includes('询问') || lower.includes('调查') || lower.includes('前往')) {
      return 'push';
    } else if (lower.includes('突然') || lower.includes('意外') || lower.includes('转折')) {
      return 'turn';
    } else if (lower.includes('关系') || lower.includes('情感') || lower.includes('信任')) {
      return 'deepen';
    } else {
      return 'foreshadow';
    }
  }

  getOptions() {
    return this.options;
  }

  getOptionById(id) {
    return this.options.find(o => o.id === id);
  }

  clearCache() {
    this.cache = null;
    this.cacheTime = null;
  }
}
