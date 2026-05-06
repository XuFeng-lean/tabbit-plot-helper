import { chat, chat_metadata, saveMetadata, generateQuietPrompt } from "../../../../../script.js";
export class DrawerUI {
  constructor(modules) {
    this.modules = modules;
    this.isOpen = false;
    this.currentTab = 'outline';
    this.init();
  }

  init() {
    this.createDrawer();
    this.attachEventListeners();
  }

  createDrawer() {
    const drawer = $(`
      <div id="tabbit-drawer">
        <div class="tabbit-drawer-header">
          <div class="tabbit-drawer-title">
            <i class="fa-solid fa-masks-theater"></i>
            <span>Tabbit Plot</span>
          </div>
          <button class="tabbit-drawer-close">
            <i class="fa-solid fa-times"></i>
          </button>
        </div>
        
        <div class="tabbit-tabs">
          <button class="tabbit-tab active" data-tab="outline">
            <i class="fa-solid fa-list"></i>
            <span>大纲</span>
          </button>
          <button class="tabbit-tab" data-tab="options">
            <i class="fa-solid fa-code-branch"></i>
            <span>选项</span>
          </button>
          <button class="tabbit-tab" data-tab="variables">
            <i class="fa-solid fa-globe"></i>
            <span>变量</span>
          </button>
          <button class="tabbit-tab" data-tab="settings">
            <i class="fa-solid fa-gear"></i>
            <span>设置</span>
          </button>
        </div>
        
        <div class="tabbit-drawer-content">
          <div id="tabbit-tab-outline" class="tabbit-tab-content active"></div>
          <div id="tabbit-tab-options" class="tabbit-tab-content"></div>
          <div id="tabbit-tab-variables" class="tabbit-tab-content"></div>
          <div id="tabbit-tab-settings" class="tabbit-tab-content"></div>
        </div>
      </div>
    `);

    $('body').append(drawer);
    this.drawer = drawer;
  }

  attachEventListeners() {
    // 关闭按钮
    this.drawer.find('.tabbit-drawer-close').on('click', () => {
      this.toggle(false);
    });

    // 标签切换
    this.drawer.find('.tabbit-tab').on('click', (e) => {
      const tab = $(e.currentTarget).data('tab');
      this.switchTab(tab);
    });
  }

  toggle(open) {
    this.isOpen = open;
    this.drawer.toggleClass('open', open);
    
    if (open) {
      this.refresh();
    }
  }

  switchTab(tab) {
    this.currentTab = tab;
    
    // 更新标签样式
    this.drawer.find('.tabbit-tab').removeClass('active');
    this.drawer.find(`.tabbit-tab[data-tab="${tab}"]`).addClass('active');
    
    // 更新内容
    this.drawer.find('.tabbit-tab-content').removeClass('active');
    this.drawer.find(`#tabbit-tab-${tab}`).addClass('active');
    
    // 刷新当前标签内容
    this.refreshTab(tab);
  }

  refresh() {
    this.refreshTab(this.currentTab);
  }

  refreshTab(tab) {
    switch(tab) {
      case 'outline':
        this.renderOutlineTab();
        break;
      case 'options':
        this.renderOptionsTab();
        break;
      case 'variables':
        this.renderVariablesTab();
        break;
      case 'settings':
        this.renderSettingsTab();
        break;
    }
  }

  renderOutlineTab() {
    const container = this.drawer.find('#tabbit-tab-outline');
    const outlines = this.modules.outlineGenerator.getOutlines();
    
    container.html(`
      <div class="tabbit-action-bar">
        <button class="tabbit-btn tabbit-btn-primary" id="generate-outline">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          生成大纲
        </button>
      </div>
      
      <div id="outline-list"></div>
    `);

    // 渲染大纲列表
    const listContainer = container.find('#outline-list');
    
    if (outlines.length === 0) {
      listContainer.html(`
        <div class="tabbit-empty-state">
          <i class="fa-solid fa-list"></i>
          <p>还没有大纲，点击上方按钮生成</p>
        </div>
      `);
    } else {
      outlines.forEach(outline => {
        const item = $(`
          <div class="tabbit-outline-item ${outline.active ? 'active' : ''}" data-id="${outline.id}">
            <div class="tabbit-outline-header">
              <div class="tabbit-outline-title">${outline.title || '未命名大纲'}</div>
              <div class="tabbit-outline-actions">
                ${!outline.active ? '<button class="tabbit-btn-icon activate-outline" title="激活"><i class="fa-solid fa-check"></i></button>' : ''}
                <button class="tabbit-btn-icon edit-outline" title="编辑"><i class="fa-solid fa-edit"></i></button>
                <button class="tabbit-btn-icon delete-outline" title="删除"><i class="fa-solid fa-trash"></i></button>
              </div>
            </div>
            <div class="tabbit-outline-content">${outline.content}</div>
            <div class="tabbit-outline-meta">
              <span><i class="fa-solid fa-clock"></i> ${new Date(outline.timestamp).toLocaleString()}</span>
            </div>
          </div>
        `);
        
        listContainer.append(item);
      });
    }

    // 绑定事件
    container.find('#generate-outline').on('click', () => this.handleGenerateOutline());
    container.find('.activate-outline').on('click', (e) => {
      const id = $(e.currentTarget).closest('.tabbit-outline-item').data('id');
      this.handleActivateOutline(id);
    });
    container.find('.edit-outline').on('click', (e) => {
      const id = $(e.currentTarget).closest('.tabbit-outline-item').data('id');
      this.handleEditOutline(id);
    });
    container.find('.delete-outline').on('click', (e) => {
      const id = $(e.currentTarget).closest('.tabbit-outline-item').data('id');
      this.handleDeleteOutline(id);
    });
  }

  renderOptionsTab() {
    const container = this.drawer.find('#tabbit-tab-options');
    const options = this.modules.optionGenerator.getOptions();
    const hasActiveOutline = this.modules.outlineGenerator.getActiveOutline() !== null;
    
    container.html(`
      <div class="tabbit-action-bar">
        <button class="tabbit-btn tabbit-btn-primary" id="generate-options" ${!hasActiveOutline ? 'disabled' : ''}>
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          生成选项
        </button>
      </div>
      
      ${!hasActiveOutline ? '<div class="tabbit-alert tabbit-alert-warning"><i class="fa-solid fa-exclamation-triangle"></i><div>请先在"大纲"标签中激活一个大纲</div></div>' : ''}
      
      <div id="options-list"></div>
    `);

    const listContainer = container.find('#options-list');
    
    if (options.length === 0) {
      listContainer.html(`
        <div class="tabbit-empty-state">
          <i class="fa-solid fa-code-branch"></i>
          <p>还没有选项，点击上方按钮生成</p>
        </div>
      `);
    } else {
      const categories = {
        push: { title: '推进主线', icon: 'fa-arrow-right', items: [] },
        turn: { title: '剧情转折', icon: 'fa-random', items: [] },
        deepen: { title: '深化关系', icon: 'fa-heart', items: [] },
        foreshadow: { title: '埋下伏笔', icon: 'fa-eye', items: [] }
      };

      options.forEach(opt => {
        if (categories[opt.type]) {
          categories[opt.type].items.push(opt);
        }
      });

      Object.entries(categories).forEach(([type, category]) => {
        if (category.items.length > 0) {
          const categoryDiv = $(`
            <div class="tabbit-option-category">
              <div class="tabbit-option-category-header">
                <i class="fa-solid ${category.icon}"></i>
                <span>${category.title}</span>
              </div>
              <div class="tabbit-option-list"></div>
            </div>
          `);

          const optionList = categoryDiv.find('.tabbit-option-list');
          
          category.items.forEach(opt => {
            const optionItem = $(`
              <div class="tabbit-option-item impact-${opt.impact}" data-id="${opt.id}">
                <div class="tabbit-option-content">${opt.content}</div>
                <div class="tabbit-option-meta">
                  <span class="tabbit-option-impact">
                    <i class="fa-solid fa-circle"></i>
                    影响: ${opt.impact === 'low' ? '轻微' : opt.impact === 'medium' ? '中等' : '重大'}
                  </span>
                </div>
                <div class="tabbit-option-actions">
                  <button class="tabbit-btn tabbit-btn-primary use-option">
                    <i class="fa-solid fa-paper-plane"></i>
                    使用
                  </button>
                </div>
              </div>
            `);
            
            optionList.append(optionItem);
          });

          listContainer.append(categoryDiv);
        }
      });
    }

    // 绑定事件
    container.find('#generate-options').on('click', () => this.handleGenerateOptions());
    container.find('.use-option').on('click', (e) => {
      const id = $(e.currentTarget).closest('.tabbit-option-item').data('id');
      this.handleUseOption(id);
    });
  }

  renderVariablesTab() {
    const container = this.drawer.find('#tabbit-tab-variables');
    const variables = this.modules.worldVariableExtractor.getVariables();
    
    container.html(`
      <div class="tabbit-action-bar">
        <button class="tabbit-btn tabbit-btn-primary" id="extract-variables">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          自动提取
        </button>
        <button class="tabbit-btn tabbit-btn-secondary" id="add-variable">
          <i class="fa-solid fa-plus"></i>
          手动添加
        </button>
      </div>
      
      <div id="variables-list"></div>
    `);

    const listContainer = container.find('#variables-list');
    
    if (variables.length === 0) {
      listContainer.html(`
        <div class="tabbit-empty-state">
          <i class="fa-solid fa-globe"></i>
          <p>还没有世界变量，点击上方按钮添加</p>
        </div>
      `);
    } else {
      variables.forEach(variable => {
        const item = $(`
          <div class="tabbit-variable-item ${variable.revealed ? 'revealed' : ''}" data-id="${variable.id}">
            <div class="tabbit-variable-header">
              <div class="tabbit-variable-name">${variable.name}</div>
              <div class="tabbit-variable-actions">
                <button class="tabbit-btn-icon toggle-revealed" title="${variable.revealed ? '标记为未揭示' : '标记为已揭示'}">
                  <i class="fa-solid ${variable.revealed ? 'fa-eye' : 'fa-eye-slash'}"></i>
                </button>
                <button class="tabbit-btn-icon edit-variable" title="编辑">
                  <i class="fa-solid fa-edit"></i>
                </button>
                <button class="tabbit-btn-icon delete-variable" title="删除">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
            <div class="tabbit-variable-content">${variable.value}</div>
            <div class="tabbit-variable-meta">
              <span class="tabbit-variable-category">
                <i class="fa-solid fa-tag"></i>
                ${variable.category || '未分类'}
              </span>
              <span class="tabbit-variable-status">
                ${variable.revealed ? '<i class="fa-solid fa-check"></i> 已揭示' : '<i class="fa-solid fa-lock"></i> 未揭示'}
              </span>
            </div>
          </div>
        `);
        
        listContainer.append(item);
      });
    }

    // 绑定事件
    container.find('#extract-variables').on('click', () => this.handleExtractVariables());
    container.find('#add-variable').on('click', () => this.handleAddVariable());
    container.find('.toggle-revealed').on('click', (e) => {
      const id = $(e.currentTarget).closest('.tabbit-variable-item').data('id');
      this.handleToggleRevealed(id);
    });
    container.find('.edit-variable').on('click', (e) => {
      const id = $(e.currentTarget).closest('.tabbit-variable-item').data('id');
      this.handleEditVariable(id);
    });
    container.find('.delete-variable').on('click', (e) => {
      const id = $(e.currentTarget).closest('.tabbit-variable-item').data('id');
      this.handleDeleteVariable(id);
    });
  }

  renderSettingsTab() {
    const container = this.drawer.find('#tabbit-tab-settings');
    const settings = this.modules.presetManager.getSettings();
    
    container.html(`
      <div class="tabbit-settings">
        <div class="tabbit-setting-group">
          <h3>生成设置</h3>
          
          <div class="tabbit-setting-item">
            <label>
              <input type="checkbox" id="auto-extract" ${settings.autoExtract ? 'checked' : ''}>
              <span>生成选项时自动提取世界变量</span>
            </label>
          </div>
          
          <div class="tabbit-setting-item">
            <label>
              <input type="checkbox" id="show-impact" ${settings.showImpact ? 'checked' : ''}>
              <span>显示选项影响等级</span>
            </label>
          </div>
          
          <div class="tabbit-setting-item">
            <label>
              <input type="checkbox" id="cache-options" ${settings.cacheOptions ? 'checked' : ''}>
              <span>缓存生成的选项（10分钟）</span>
            </label>
          </div>
        </div>
        
        <div class="tabbit-setting-group">
          <h3>统计信息</h3>
          <div class="tabbit-stats">
            <div class="tabbit-stat-item">
              <div class="tabbit-stat-value">${this.modules.outlineGenerator.getOutlines().length}</div>
              <div class="tabbit-stat-label">大纲数量</div>
            </div>
            <div class="tabbit-stat-item">
              <div class="tabbit-stat-value">${this.modules.worldVariableExtractor.getVariables().length}</div>
              <div class="tabbit-stat-label">世界变量</div>
            </div>
            <div class="tabbit-stat-item">
              <div class="tabbit-stat-value">${this.modules.optionGenerator.getOptions().length}</div>
              <div class="tabbit-stat-label">当前选项</div>
            </div>
          </div>
        </div>
        
        <div class="tabbit-setting-group">
          <h3>关于</h3>
          <div class="tabbit-about">
            <p><strong>Tabbit Plot</strong> v1.0.0</p>
            <p>一个强大的剧情管理工具</p>
            <p><a href="https://github.com/yourusername/tabbit-plot" target="_blank">GitHub</a></p>
          </div>
        </div>
      </div>
    `);

    // 绑定设置变更事件
    container.find('#auto-extract').on('change', (e) => {
      this.modules.presetManager.updateSetting('autoExtract', e.target.checked);
    });
    container.find('#show-impact').on('change', (e) => {
      this.modules.presetManager.updateSetting('showImpact', e.target.checked);
    });
    container.find('#cache-options').on('change', (e) => {
      this.modules.presetManager.updateSetting('cacheOptions', e.target.checked);
    });
  }

  // 事件处理函数
  async handleGenerateOutline() {
    const button = this.drawer.find('#generate-outline');
    button.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> 生成中...');
    
    try {
      await this.modules.outlineGenerator.generate();
      this.renderOutlineTab();
      toastr.success('大纲生成成功');
    } catch (error) {
      console.error('生成大纲失败:', error);
      toastr.error('生成大纲失败: ' + error.message);
    } finally {
      button.prop('disabled', false).html('<i class="fa-solid fa-wand-magic-sparkles"></i> 生成大纲');
    }
  }

  handleActivateOutline(id) {
    this.modules.outlineGenerator.activateOutline(id);
    this.renderOutlineTab();
    toastr.success('大纲已激活');
  }

  handleEditOutline(id) {
    const outline = this.modules.outlineGenerator.getOutlineById(id);
    if (!outline) return;
    
    const newContent = prompt('编辑大纲内容:', outline.content);
    if (newContent !== null && newContent.trim() !== '') {
      this.modules.outlineGenerator.updateOutline(id, { content: newContent.trim() });
      this.renderOutlineTab();
      toastr.success('大纲已更新');
    }
  }

  handleDeleteOutline(id) {
    if (confirm('确定要删除这个大纲吗？')) {
      this.modules.outlineGenerator.deleteOutline(id);
      this.renderOutlineTab();
      toastr.success('大纲已删除');
    }
  }

  async handleGenerateOptions() {
    const button = this.drawer.find('#generate-options');
    button.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> 生成中...');
    
    try {
      await this.modules.optionGenerator.generate();
      this.renderOptionsTab();
      toastr.success('选项生成成功');
    } catch (error) {
      console.error('生成选项失败:', error);
      toastr.error('生成选项失败: ' + error.message);
    } finally {
      button.prop('disabled', false).html('<i class="fa-solid fa-wand-magic-sparkles"></i> 生成选项');
    }
  }

  handleUseOption(id) {
    const option = this.modules.optionGenerator.getOptionById(id);
    if (!option) return;
    
    // 将选项内容插入到输入框
    const textarea = $('#send_textarea');
    textarea.val(option.content);
    textarea.trigger('input');
    
    toastr.success('选项已插入到输入框');
  }

  async handleExtractVariables() {
    const button = this.drawer.find('#extract-variables');
    button.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> 提取中...');
    
    try {
      await this.modules.worldVariableExtractor.extract();
      this.renderVariablesTab();
      toastr.success('变量提取成功');
    } catch (error) {
      console.error('提取变量失败:', error);
      toastr.error('提取变量失败: ' + error.message);
    } finally {
      button.prop('disabled', false).html('<i class="fa-solid fa-wand-magic-sparkles"></i> 自动提取');
    }
  }

  handleAddVariable() {
    const name = prompt('变量名称:');
    if (!name || name.trim() === '') return;
    
    const value = prompt('变量值:');
    if (value === null) return;
    
    const category = prompt('分类 (可选):') || '未分类';
    
    this.modules.worldVariableExtractor.addVariable({
      name: name.trim(),
      value: value.trim(),
      category: category.trim(),
      revealed: false
    });
    
    this.renderVariablesTab();
    toastr.success('变量已添加');
  }

  handleToggleRevealed(id) {
    this.modules.worldVariableExtractor.toggleRevealed(id);
    this.renderVariablesTab();
  }

  handleEditVariable(id) {
    const variable = this.modules.worldVariableExtractor.getVariableById(id);
    if (!variable) return;
    
    const newValue = prompt('编辑变量值:', variable.value);
    if (newValue !== null && newValue.trim() !== '') {
      this.modules.worldVariableExtractor.updateVariable(id, { value: newValue.trim() });
      this.renderVariablesTab();
      toastr.success('变量已更新');
    }
  }

  handleDeleteVariable(id) {
    if (confirm('确定要删除这个变量吗？')) {
      this.modules.worldVariableExtractor.deleteVariable(id);
      this.renderVariablesTab();
      toastr.success('变量已删除');
    }
  }
}
