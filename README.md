# 剧情辅助器 (Tabbit Plot Helper)

<p align="center">
  <img src="icon.png" width="200" alt="剧情辅助器">
</p>

> 一个为 SillyTavern 打造的智能剧情管理插件
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![SillyTavern](https://img.shields.io/badge/SillyTavern-1.12.0+-purple.svg)
## ✨ 功能特性
- 📝 **智能大纲生成** - 基于对话历史自动生成剧情大纲
- 🎯 **四维选项系统** - push（推进）/ turn（转折）/ deepen（深化）/ foreshadow（伏笔）
- 🌍 **世界变量提取** - 自动追踪角色秘密、世界设定、关键线索
- 🎨 **影响等级标注** - 直观显示每个选项的剧情影响力（low/medium/high）
- 💾 **聊天级持久化** - 数据保存在聊天元数据中，跟随对话迁移
- ⚡ **智能缓存** - 10分钟选项缓存，减少 API 消耗
## 📦 安装方法
### 方法一：通过 SillyTavern 扩展安装器（推荐）
1. 复制本仓库地址：`https://github.com/XuFeng-lean/tabbit-plot-helper`
2. 打开 SillyTavern → 扩展菜单 → Install extension
3. 粘贴链接，点击安装
4. 在扩展菜单顶部找到「剧情辅助器」按钮

## 🚀 使用方法

### 快速开始
1. 安装插件后，聊天输入框旁会出现 **🎭 Tabbit** 按钮
2. 点击按钮打开侧边抽屉
3. 进行至少 5-10 轮对话后，再开始使用功能
### 工作流程
聊天对话 → 生成大纲 → 激活大纲 → 生成选项 → 选择使用
↓
提取世界变量（自动/手动）

#### 标签页说明

| 标签页 | 功能 |
|--------|------|
| 📋 大纲 | 生成、编辑、激活剧情大纲 |
| 🎯 选项 | 基于激活大纲生成 4 类剧情选项 |
| 🌍 变量 | 管理世界观变量与角色秘密 |
| ⚙️ 设置 | 自定义插件行为 |

### 🎯 选项类型详解

| 类型 | 图标 | 说明 | 适用场景 |
|------|------|------|----------|
| **push** | ➡️ | 推进主线 | 直接推动剧情向前 |
| **turn** | 🔄 | 剧情转折 | 引入意外或反转 |
| **deepen** | 💜 | 深化关系 | 加深角色羁绊 |
| **foreshadow** | 🔮 | 埋下伏笔 | 为未来剧情铺垫 |

### ⚙️ 设置说明

- **自动提取变量** - 生成选项时同步提取世界变量
- **显示影响等级** - 在选项卡片上显示影响力指示器
- **缓存选项** - 启用 10 分钟选项缓存

### 🔧 兼容性

- ✅ SillyTavern 1.12.0 及以上版本
- ✅ 所有支持 `generateQuietPrompt` 的后端（OpenAI / Claude / Gemini / 本地模型等）
- ✅ Chrome / Firefox / Edge / Safari 现代浏览器

### 🐛 常见问题

**Q: 点击生成大纲没反应？**
A: 请确认聊天中至少有 5 条消息，且当前 API 后端连接正常。

**Q: 数据会丢失吗？**
A: 不会。所有数据保存在 `chat_metadata` 中，跟随聊天文件持久化。

**Q: 切换聊天后数据消失？**
A: 这是正常行为。每个聊天有独立的大纲与变量数据。

### 📝 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)

### 📄 许可证

[MIT License](./LICENSE)

### 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 🙏 致谢

感谢 SillyTavern 社区的支持。


