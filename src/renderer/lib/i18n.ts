import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';

export type Language = 'zh' | 'en';

export const LANGUAGE_KEY = 'agentflow.language';

export const translations = {
  zh: {
    'nav.dashboard': '仪表盘',
    'nav.providers': 'Provider 中心',
    'nav.tokens': 'Token 中心',
    'nav.health': '健康监控',
    'nav.router': '模型路由',
    'nav.gateway': '本地网关',
    'nav.runtime': '运行时切换',
    'nav.diagnostics': '诊断',
    'nav.projects': '项目',
    'nav.projectDetail': '项目详情',
    'nav.agents': 'Agent 工作台',
    'nav.workflows': '工作流',
    'nav.promptLab': 'Prompt Lab',
    'nav.logAnalyzer': '日志分析',
    'nav.security': '安全中心',
    'nav.safetyBox': '安全检查',
    'nav.sharedMemory': '共享记忆',
    'nav.skills': 'Skills 中心',
    'nav.ecosystem': '生态系统',
    'nav.adminUsers': '用户管理',
    'nav.adminAudit': '审计日志',
    'nav.gitTimeline': 'Git 时间线',
    'nav.settings': '设置',
    'nav.expand': '展开导航',
    'nav.collapse': '收起导航',

    'topbar.language': 'English',
    'topbar.switchToEnglish': '切换到 English',
    'topbar.switchToChinese': '切换到中文',
    'topbar.themeTitle': '主题：{theme}。点击切换。',
    'topbar.signOut': '退出登录',

    'common.refresh': '刷新',
    'common.retry': '重试',
    'common.cancel': '取消',
    'common.create': '创建',
    'common.save': '保存',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.search': '搜索',
    'common.export': '导出',
    'common.import': '导入',
    'common.open': '打开',
    'common.viewAll': '查看全部',
    'common.all': '全部',
    'common.current': '当前',
    'common.enabled': '启用',
    'common.disabled': '禁用',
    'common.system': '系统',

    'status.planning': '规划中',
    'status.active': '进行中',
    'status.paused': '已暂停',
    'status.done': '已完成',
    'status.success': '成功',
    'status.denied': '已拒绝',
    'status.warning': '警告',
    'status.info': '信息',

    'theme.light': '浅色',
    'theme.dark': '深色',
    'theme.system': '跟随系统',

    'dashboard.eyebrow': '本地优先 AI 编排中心',
    'dashboard.title': 'LocalAI Nexus',
    'dashboard.subtitle': '把项目、模型 Provider、任务 Prompt、安全检查、日志、Git 上下文和共享记忆放在一个本地桌面工作台里。',
    'dashboard.demoMode': 'LocalAI Nexus 正在显示演示数据，因为当前会话无法访问桌面数据桥。',
    'dashboard.firstRun': '首次运行检查清单',
    'dashboard.addProvider': '添加 Provider',
    'dashboard.addProviderBody': '连接 OpenAI 兼容、Anthropic 兼容、Gemini、Ollama 或自定义本地 Provider。',
    'dashboard.startGateway': '启动本地网关',
    'dashboard.startGatewayBody': '在 http://127.0.0.1:8317 暴露本地 OpenAI 兼容网关。',
    'dashboard.createWorkflow': '创建第一个工作流',
    'dashboard.createOrOpenProject': '创建或打开项目',
    'dashboard.saveRecovery': '保存恢复上下文',
    'dashboard.providerHub': 'Provider 中心',
    'dashboard.tokenCenter': 'Token 中心',
    'dashboard.healthMonitor': '健康监控',
    'dashboard.starting': '正在启动',
    'dashboard.chooseModel': '在 Provider 中心选择模型',
    'dashboard.projects': '项目',
    'dashboard.tasks': '任务',
    'dashboard.prompts': 'Prompt',
    'dashboard.safetyChecks': '安全检查',
    'dashboard.memories': '记忆',
    'dashboard.recentProjects': '最近项目',
    'dashboard.recentPrompts': '最近 Prompt',
    'dashboard.openLab': '打开 Lab',
    'dashboard.noProjects': '暂无项目',
    'dashboard.noProjectsBody': '创建一个项目，先定义目标，再配置 Agent 和工作流。',
    'dashboard.noPrompts': '暂无保存的 Prompt',
    'dashboard.noPromptsBody': '使用 Prompt Lab 把任务转成可复用 Prompt。',
    'dashboard.demoSuffix': '演示模式',

    'projects.title': '项目',
    'projects.summary': '筛选后的项目会在这里显示，可按状态和关键词快速定位。',
    'projects.new': '新建项目',
    'projects.searchPlaceholder': '搜索项目、目标或技术栈...',
    'projects.clearSearch': '清空搜索',
    'projects.name': '项目名称 *',
    'projects.goal': '目标 *',
    'projects.platform': '平台',
    'projects.difficulty': '难度',
    'projects.techStack': '技术栈',
    'projects.uiDirection': 'UI 方向',
    'projects.nameRequired': '项目名称必填。',
    'projects.goalRequired': '项目目标必填。',
    'projects.bridgeUnavailable': '项目数据桥不可用。',
    'projects.namePlaceholder': '例如：Provider switchboard',
    'projects.goalPlaceholder': '描述项目目标、约束和预期结果。',
    'projects.stackPlaceholder': 'React, Node.js, Python',
    'projects.uiPlaceholder': '紧凑桌面工具',
    'projects.noMatches': '没有匹配的项目',
    'projects.noProjects': '暂无项目',
    'projects.noMatchesBody': '调整搜索或状态筛选后再试。',
    'projects.noProjectsBody': '创建项目以定义目标，然后再配置 Agent 和工作流。',
    'projects.edit': '编辑项目',
    'projects.delete': '删除项目',
    'projects.deleteConfirm': '删除 "{name}"？',
    'projects.saveChanges': '保存修改',
    'projects.createProject': '创建项目',

    'workflows.title': '工作流',
    'workflows.subtitle': '从模板创建、编辑并运行 Agent 工作流。',
    'workflows.createFromTemplate': '从模板创建',
    'workflows.existingWorkflows': '已有工作流',
    'workflows.recentRuns': '最近运行',
    'workflows.timelineTrace': 'Timeline / Trace',
    'workflows.saveVersion': '保存版本',
    'workflows.runWorkflow': '运行 Workflow',
    'workflows.pause': '暂停',
    'workflows.cancel': '取消',
    'workflows.retrySafeNode': '重试安全节点',
    'workflows.promptPlaceholder': '填写 Prompt 或模型说明',

    'promptLab.title': 'Prompt Lab',
    'promptLab.subtitle': '把项目上下文、记忆和模板组合成可复用 Prompt。',
    'promptLab.searchPlaceholder': '搜索模板...',
    'promptLab.savedSearchPlaceholder': '搜索已保存...',
    'promptLab.templateGallery': '模板库',
    'promptLab.workflowTemplates': '工作流模板',
    'promptLab.templateVariables': '模板变量',
    'promptLab.injectMemory': '注入记忆',
    'promptLab.generatedPrompt': '生成的 Prompt',
    'promptLab.savedPrompts': '已保存 Prompt',
    'promptLab.generatePrompt': '生成 Prompt',
    'promptLab.copy': '复制',
    'promptLab.exportMarkdown': '导出 Markdown',
    'promptLab.savePrompt': '保存 Prompt',
    'promptLab.saveNamePlaceholder': '给这个 Prompt 起个名字',

    'memory.title': '共享记忆',
    'memory.subtitle': '管理本地记忆、上下文包和跨模型恢复材料。',
    'memory.new': '新建记忆',
    'memory.exportJson': '导出 JSON',
    'memory.importJson': '导入 JSON',
    'memory.generateRecovery': '生成恢复 Prompt',
    'memory.searchPlaceholder': '搜索记忆标题、内容、标签...',
    'memory.noMemories': '暂无记忆',
    'memory.noMemoriesBody': '创建第一条记忆，用于保存决策、修复和上下文。',
    'memory.createFirst': '创建第一条记忆',
    'memory.titleField': '记忆标题',
    'memory.contentField': '记忆内容 - 包括决策理由、代码片段、经验教训等',
    'memory.tagsField': '标签',
    'memory.projectField': '项目',
    'memory.providerScope': 'Provider 范围',
    'memory.modelScope': '模型范围',

    'safety.title': '安全检查',
    'safety.subtitle': '在执行命令前检查破坏性操作、密钥泄露和更安全替代方案。',
    'safety.inputCommand': '输入命令',
    'safety.commandPlaceholder': '在此输入要检查的命令...',
    'safety.check': '检查安全性',
    'safety.clear': '清空',
    'safety.history': '检查历史',
    'safety.noResult': '暂无检查结果',
    'safety.riskLevel': '风险等级',
    'safety.matchedRules': '匹配规则',
    'safety.saferAlternative': '更安全替代方案',

    'git.title': 'Git 时间线',
    'git.subtitle': '读取仓库提交、生成上下文摘要，并把关键历史保存到共享记忆。',
    'git.repoPath': '仓库路径',
    'git.readLog': '读取日志',
    'git.generateMemory': '生成记忆',
    'git.selectRepo': '选择仓库',
    'git.noCommits': '暂无提交',
    'git.totalCommits': '总提交',
    'git.currentBranch': '当前分支',
    'git.filesChanged': '变更文件',

    'adminUsers.title': '用户管理',
    'adminUsers.subtitle': '管理本地用户、角色、状态和密码重置。',
    'adminUsers.email': '邮箱',
    'adminUsers.displayName': '显示名称',
    'adminUsers.role': '角色',
    'adminUsers.tempPassword': '临时密码',
    'adminUsers.create': '创建',
    'adminUsers.makeUser': '设为用户',
    'adminUsers.makeAdmin': '设为管理员',
    'adminUsers.disable': '禁用',
    'adminUsers.enable': '启用',
    'adminUsers.reset': '重置',
    'adminUsers.mustChangePassword': '必须修改密码',
    'adminUsers.temporaryPassword': '{email} 的临时密码：',

    'adminAudit.title': '审计日志',
    'adminAudit.subtitle': '搜索认证、权限、管理和安全事件。',
    'adminAudit.events': '事件',
    'adminAudit.securityEvents': '安全事件',
    'adminAudit.denied': '已拒绝',
    'adminAudit.system': '系统',
    'adminAudit.event': '事件',

    'settings.title': '设置',
    'settings.subtitle': '管理语言、主题、Provider、当前模型、MCP allowlist、Skills registry 和安全导入导出。',
    'settings.general': '通用设置',
    'settings.language': '语言',
    'settings.theme': '主题',
    'settings.defaultProjectPath': '默认项目路径',
    'settings.dataPath': '数据目录',
    'settings.version': '版本',
    'settings.saveSettings': '保存设置',
    'settings.saved': '设置已保存。',
    'settings.currentModel': '当前模型配置',
    'settings.current': '当前：{value}',
    'settings.noProvider': '尚未选择 Provider',
    'settings.addProvider': '配置真实模型',
    'settings.providerPresetCenter': 'Provider 预设中心',
    'settings.mcpSkills': 'MCP & Skills 管理',
    'settings.importExport': '配置导入 / 导出',
    'settings.exportSafeConfig': '导出安全配置',
    'settings.previewImport': '预览导入风险',
    'settings.applyImport': '应用导入',
    'settings.providerCurrent': '当前',
    'settings.providerTestFailed': '测试失败',
    'settings.providerTestPassed': '测试通过',
    'settings.providerSaveFailed': 'Provider 保存失败：{error}',
    'settings.providerSecretMissing': '请先为该 Provider 配置 API Key。',
    'settings.providerSwitchFailed': '切换失败：{error}',
    'settings.providerSwitched': '当前模型已切换到 {provider} / {model}',
    'settings.missingKey': '缺少密钥',
    'settings.switchProvider': '一键切换',
    'settings.testConnection': '测试连接',
    'settings.noProviders': '暂无 Provider',
    'settings.noProvidersBody': '先选择一个 Provider 预设，粘贴 API Key，测试连接，再切换为当前模型；不想配 Key 时可先运行内置示例。',
    'settings.localNoKey': '本地无密钥',
    'settings.addProviderTitle': '添加 Provider',
    'settings.editProviderTitle': '编辑 Provider',
    'settings.providerPreset': 'Provider preset',
    'settings.name': '名称',
    'settings.model': '模型',
    'settings.baseUrl': 'Base URL',
    'settings.apiKey': 'API Key',
    'settings.apiKeyPlaceholder': '保存后只显示末四位，日志和导出不会包含明文。',
    'settings.enabled': '启用',
    'settings.memoryInjection': '记忆注入',
    'settings.saveProvider': '保存 Provider',
    'settings.importPlaceholder': '粘贴 LocalAI Nexus 配置 JSON，导入前会校验 schema、大小、字段白名单和风险。',
    'settings.exportFailed': '导出失败：{error}',
    'settings.mcpAllowlist': 'MCP allowlist',
    'settings.mcpAllowlistBody': '当前只管理 allow/deny 规则和沙箱元数据，不直接执行外部工具。',
    'settings.mcpEmpty': '暂无规则。MCP 调用默认由网关拒绝。',
    'settings.skillsRegistry': 'Skills registry',
    'settings.skillsRegistryBody': '本轮是本地管理骨架，不自动执行外部 skill。',
    'settings.importExportBody': '导出包含 provider metadata、项目默认 provider 引用、Agent metadata、模板、MCP allowlist 和 skills registry；API Key 只会省略或脱敏。',

    'error.title': '页面加载失败',
    'error.body': '当前页面遇到渲染错误，其他功能仍可继续使用。',
    'error.retry': '重试',
    'error.backDashboard': '返回仪表盘',
    'page.loading': '正在加载 LocalAI Nexus...',
    'auth.accessDenied': '访问被拒绝',
    'auth.routeRequires': '该路由需要 {permission} 权限。',
  },
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.providers': 'Provider Hub',
    'nav.tokens': 'Token Center',
    'nav.health': 'Health Monitor',
    'nav.router': 'Model Router',
    'nav.gateway': 'Local Gateway',
    'nav.runtime': 'Runtime Switcher',
    'nav.diagnostics': 'Diagnostics',
    'nav.projects': 'Projects',
    'nav.projectDetail': 'Project Detail',
    'nav.agents': 'Agent Studio',
    'nav.workflows': 'Workflows',
    'nav.promptLab': 'Prompt Lab',
    'nav.logAnalyzer': 'Log Analyzer',
    'nav.security': 'Security Center',
    'nav.safetyBox': 'Safety',
    'nav.sharedMemory': 'Shared Memory',
    'nav.skills': 'Skills',
    'nav.ecosystem': 'Ecosystem',
    'nav.adminUsers': 'User Admin',
    'nav.adminAudit': 'Audit Logs',
    'nav.gitTimeline': 'Git Timeline',
    'nav.settings': 'Settings',
    'nav.expand': 'Expand navigation',
    'nav.collapse': 'Collapse navigation',

    'topbar.language': '中文',
    'topbar.switchToEnglish': 'Switch to English',
    'topbar.switchToChinese': 'Switch to Chinese',
    'topbar.themeTitle': 'Theme: {theme}. Click to switch.',
    'topbar.signOut': 'Sign out',

    'common.refresh': 'Refresh',
    'common.retry': 'Retry',
    'common.cancel': 'Cancel',
    'common.create': 'Create',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.search': 'Search',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.open': 'Open',
    'common.viewAll': 'View all',
    'common.all': 'All',
    'common.current': 'Current',
    'common.enabled': 'Enabled',
    'common.disabled': 'Disabled',
    'common.system': 'System',

    'status.planning': 'Planning',
    'status.active': 'Active',
    'status.paused': 'Paused',
    'status.done': 'Done',
    'status.success': 'Success',
    'status.denied': 'Denied',
    'status.warning': 'Warning',
    'status.info': 'Info',

    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.system': 'System',

    'dashboard.eyebrow': 'Local-first AI orchestration hub',
    'dashboard.title': 'LocalAI Nexus',
    'dashboard.subtitle': 'Bring projects, model providers, task prompts, safety checks, logs, git context, and shared memory into one local desktop cockpit.',
    'dashboard.demoMode': 'LocalAI Nexus is showing demo data because the desktop data bridge is not available in this session.',
    'dashboard.firstRun': 'First-run checklist',
    'dashboard.addProvider': 'Add a provider',
    'dashboard.addProviderBody': 'Connect OpenAI-compatible, Anthropic-compatible, Gemini, Ollama, or custom local providers.',
    'dashboard.startGateway': 'Start the local gateway',
    'dashboard.startGatewayBody': 'Expose the local OpenAI-compatible gateway at http://127.0.0.1:8317.',
    'dashboard.createWorkflow': 'Create the first workflow',
    'dashboard.createOrOpenProject': 'Create or open a project',
    'dashboard.saveRecovery': 'Save recovery context',
    'dashboard.providerHub': 'Provider Hub',
    'dashboard.tokenCenter': 'Token Center',
    'dashboard.healthMonitor': 'Health Monitor',
    'dashboard.starting': 'Starting',
    'dashboard.chooseModel': 'Choose a model in Provider Hub',
    'dashboard.projects': 'Projects',
    'dashboard.tasks': 'Tasks',
    'dashboard.prompts': 'Prompts',
    'dashboard.safetyChecks': 'Safety checks',
    'dashboard.memories': 'Memories',
    'dashboard.recentProjects': 'Recent projects',
    'dashboard.recentPrompts': 'Recent prompts',
    'dashboard.openLab': 'Open Lab',
    'dashboard.noProjects': 'No projects yet',
    'dashboard.noProjectsBody': 'Create a project to start defining goals before configuring agents and workflows.',
    'dashboard.noPrompts': 'No saved prompts yet',
    'dashboard.noPromptsBody': 'Use Prompt Lab to turn tasks into reusable prompts.',
    'dashboard.demoSuffix': 'demo mode',

    'projects.title': 'Projects',
    'projects.summary': 'Filtered projects are shown here so you can quickly locate work by status and keyword.',
    'projects.new': 'New project',
    'projects.searchPlaceholder': 'Search projects, goals, or stack...',
    'projects.clearSearch': 'Clear search',
    'projects.name': 'Project name *',
    'projects.goal': 'Goal *',
    'projects.platform': 'Platform',
    'projects.difficulty': 'Difficulty',
    'projects.techStack': 'Tech stack',
    'projects.uiDirection': 'UI direction',
    'projects.nameRequired': 'Project name is required.',
    'projects.goalRequired': 'Project goal is required.',
    'projects.bridgeUnavailable': 'Project data bridge is unavailable.',
    'projects.namePlaceholder': 'e.g. Provider switchboard',
    'projects.goalPlaceholder': 'Describe the project goal, constraints, and expected outcome.',
    'projects.stackPlaceholder': 'React, Node.js, Python',
    'projects.uiPlaceholder': 'Compact desktop tool',
    'projects.noMatches': 'No matching projects',
    'projects.noProjects': 'No projects yet',
    'projects.noMatchesBody': 'Adjust the search or status filter and try again.',
    'projects.noProjectsBody': 'Create a project to define the goal before configuring agents and workflows.',
    'projects.edit': 'Edit project',
    'projects.delete': 'Delete project',
    'projects.deleteConfirm': 'Delete "{name}"?',
    'projects.saveChanges': 'Save changes',
    'projects.createProject': 'Create project',

    'workflows.title': 'Workflows',
    'workflows.subtitle': 'Create, edit, and run Agent workflows from templates.',
    'workflows.createFromTemplate': 'Create from template',
    'workflows.existingWorkflows': 'Existing workflows',
    'workflows.recentRuns': 'Recent runs',
    'workflows.timelineTrace': 'Timeline / Trace',
    'workflows.saveVersion': 'Save version',
    'workflows.runWorkflow': 'Run Workflow',
    'workflows.pause': 'Pause',
    'workflows.cancel': 'Cancel',
    'workflows.retrySafeNode': 'Retry safe node',
    'workflows.promptPlaceholder': 'Fill in a prompt or model note',

    'promptLab.title': 'Prompt Lab',
    'promptLab.subtitle': 'Combine project context, memory, and templates into reusable prompts.',
    'promptLab.searchPlaceholder': 'Search templates...',
    'promptLab.savedSearchPlaceholder': 'Search saved prompts...',
    'promptLab.templateGallery': 'Template Gallery',
    'promptLab.workflowTemplates': 'Workflow Templates',
    'promptLab.templateVariables': 'Template Variables',
    'promptLab.injectMemory': 'Inject Memory',
    'promptLab.generatedPrompt': 'Generated Prompt',
    'promptLab.savedPrompts': 'Saved Prompts',
    'promptLab.generatePrompt': 'Generate Prompt',
    'promptLab.copy': 'Copy',
    'promptLab.exportMarkdown': 'Export Markdown',
    'promptLab.savePrompt': 'Save Prompt',
    'promptLab.saveNamePlaceholder': 'Name this prompt',

    'memory.title': 'Shared Memory',
    'memory.subtitle': 'Manage local memories, context packs, and cross-model recovery material.',
    'memory.new': 'New Memory',
    'memory.exportJson': 'Export JSON',
    'memory.importJson': 'Import JSON',
    'memory.generateRecovery': 'Generate Recovery Prompt',
    'memory.searchPlaceholder': 'Search memory title, content, or tags...',
    'memory.noMemories': 'No memories yet',
    'memory.noMemoriesBody': 'Create the first memory to save decisions, fixes, and context.',
    'memory.createFirst': 'Create first memory',
    'memory.titleField': 'Memory title',
    'memory.contentField': 'Memory content - include decisions, snippets, and lessons learned',
    'memory.tagsField': 'Tags',
    'memory.projectField': 'Project',
    'memory.providerScope': 'Provider scope',
    'memory.modelScope': 'Model scope',

    'safety.title': 'Safety',
    'safety.subtitle': 'Check destructive operations, secret exposure, and safer alternatives before executing commands.',
    'safety.inputCommand': 'Input command',
    'safety.commandPlaceholder': 'Enter a command to check...',
    'safety.check': 'Check safety',
    'safety.clear': 'Clear',
    'safety.history': 'Check history',
    'safety.noResult': 'No check result yet',
    'safety.riskLevel': 'Risk level',
    'safety.matchedRules': 'Matched rules',
    'safety.saferAlternative': 'Safer alternative',

    'git.title': 'Git Timeline',
    'git.subtitle': 'Read repository commits, generate context summaries, and save key history to Shared Memory.',
    'git.repoPath': 'Repository path',
    'git.readLog': 'Read log',
    'git.generateMemory': 'Generate memory',
    'git.selectRepo': 'Select repo',
    'git.noCommits': 'No commits yet',
    'git.totalCommits': 'Total commits',
    'git.currentBranch': 'Current branch',
    'git.filesChanged': 'Files changed',

    'adminUsers.title': 'Admin Users',
    'adminUsers.subtitle': 'Manage local users, roles, status, and password resets.',
    'adminUsers.email': 'Email',
    'adminUsers.displayName': 'Display name',
    'adminUsers.role': 'Role',
    'adminUsers.tempPassword': 'Temp password',
    'adminUsers.create': 'Create',
    'adminUsers.makeUser': 'Make User',
    'adminUsers.makeAdmin': 'Make Admin',
    'adminUsers.disable': 'Disable',
    'adminUsers.enable': 'Enable',
    'adminUsers.reset': 'Reset',
    'adminUsers.mustChangePassword': 'must change password',
    'adminUsers.temporaryPassword': 'Temporary password for {email}:',

    'adminAudit.title': 'Audit Logs',
    'adminAudit.subtitle': 'Search auth, permission, admin, and security events.',
    'adminAudit.events': 'Events',
    'adminAudit.securityEvents': 'Security events',
    'adminAudit.denied': 'Denied',
    'adminAudit.system': 'system',
    'adminAudit.event': 'event',

    'settings.title': 'Settings',
    'settings.subtitle': 'Manage language, theme, providers, current model, MCP allowlist, Skills registry, and safe import/export.',
    'settings.general': 'General Settings',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.defaultProjectPath': 'Default project path',
    'settings.dataPath': 'Data path',
    'settings.version': 'Version',
    'settings.saveSettings': 'Save settings',
    'settings.saved': 'Settings saved.',
    'settings.currentModel': 'Current model config',
    'settings.current': 'Current: {value}',
    'settings.noProvider': 'No provider selected',
    'settings.addProvider': 'Configure real model',
    'settings.providerPresetCenter': 'Provider Preset Center',
    'settings.mcpSkills': 'MCP & Skills Management',
    'settings.importExport': 'Config Import / Export',
    'settings.exportSafeConfig': 'Export safe config',
    'settings.previewImport': 'Preview import risk',
    'settings.applyImport': 'Apply import',
    'settings.providerCurrent': 'Current',
    'settings.providerTestFailed': 'Test failed',
    'settings.providerTestPassed': 'Test passed',
    'settings.providerSaveFailed': 'Provider save failed: {error}',
    'settings.providerSecretMissing': 'Configure an API key for this provider first.',
    'settings.providerSwitchFailed': 'Switch failed: {error}',
    'settings.providerSwitched': 'Current model switched to {provider} / {model}',
    'settings.missingKey': 'Missing key',
    'settings.switchProvider': 'Switch',
    'settings.testConnection': 'Test connection',
    'settings.noProviders': 'No providers',
    'settings.noProvidersBody': 'Choose a provider preset, paste your API key, test the connection, then switch to it. You can run the built-in demo before adding a key.',
    'settings.localNoKey': 'Local no-key',
    'settings.addProviderTitle': 'Add Provider',
    'settings.editProviderTitle': 'Edit Provider',
    'settings.providerPreset': 'Provider preset',
    'settings.name': 'Name',
    'settings.model': 'Model',
    'settings.baseUrl': 'Base URL',
    'settings.apiKey': 'API Key',
    'settings.apiKeyPlaceholder': 'Only the last four characters are shown after saving. Logs and exports never include plaintext.',
    'settings.enabled': 'Enabled',
    'settings.memoryInjection': 'Memory injection',
    'settings.saveProvider': 'Save Provider',
    'settings.importPlaceholder': 'Paste LocalAI Nexus config JSON. Schema, size, allowlisted fields, and risk are checked before import.',
    'settings.exportFailed': 'Export failed: {error}',
    'settings.mcpAllowlist': 'MCP allowlist',
    'settings.mcpAllowlistBody': 'Only allow/deny rules and sandbox metadata are managed here. External tools are not executed directly.',
    'settings.mcpEmpty': 'No rules yet. MCP calls are denied by the gateway by default.',
    'settings.skillsRegistry': 'Skills registry',
    'settings.skillsRegistryBody': 'This is a local management shell. External skills are not executed automatically.',
    'settings.importExportBody': 'Exports include provider metadata, default project provider references, Agent metadata, templates, MCP allowlist, and skills registry. API keys are omitted or redacted.',

    'error.title': 'This page failed to load',
    'error.body': 'This route hit a render error. The rest of the app is still available.',
    'error.retry': 'Retry',
    'error.backDashboard': 'Back to Dashboard',
    'page.loading': 'Loading LocalAI Nexus...',
    'auth.accessDenied': 'Access denied',
    'auth.routeRequires': 'This route requires {permission}.',
  },
} as const;

type TranslationKey = keyof typeof translations.zh;

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey | string, params?: Record<string, string | number>) => string;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

const ATTRIBUTE_NAMES = ['title', 'aria-label', 'placeholder'];

function isLanguage(value: unknown): value is Language {
  return value === 'zh' || value === 'en';
}

function format(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return Object.entries(params).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function buildTextMap(language: Language): Map<string, string> {
  const target = translations[language] as Record<string, string>;
  const map = new Map<string, string>();
  (Object.keys(translations.zh) as TranslationKey[]).forEach((key) => {
    const targetValue = target[key];
    if (!targetValue || targetValue.includes('{')) return;
    map.set(translations.zh[key], targetValue);
    map.set(translations.en[key], targetValue);
  });
  return map;
}

function shouldSkipTextNode(node: Text): boolean {
  const parent = node.parentElement;
  if (!parent) return true;
  return Boolean(parent.closest('code, pre, script, style, textarea, input'));
}

export function getLanguage(): Language {
  if (typeof window === 'undefined') return 'zh';
  const stored = window.localStorage.getItem(LANGUAGE_KEY);
  return isLanguage(stored) ? stored : 'zh';
}

export function setLanguage(language: Language): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LANGUAGE_KEY, language);
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
}

export function t(
  key: TranslationKey | string,
  language: Language = getLanguage(),
  params?: Record<string, string | number>,
): string {
  const table = translations[language] as Record<string, string>;
  const fallback = translations.zh as Record<string, string>;
  return format(table[key] ?? fallback[key] ?? key, params);
}

export function localizeDom(language: Language): void {
  if (typeof document === 'undefined') return;
  const map = buildTextMap(language);
  const root = document.getElementById('root') ?? document.body;
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  nodes.forEach((node) => {
    if (shouldSkipTextNode(node)) return;
    const value = node.nodeValue ?? '';
    const trimmed = value.trim();
    const next = map.get(trimmed);
    if (!next) return;
    node.nodeValue = value.replace(trimmed, next);
  });

  ATTRIBUTE_NAMES.forEach((attr) => {
    root.querySelectorAll<HTMLElement>(`[${attr}]`).forEach((element) => {
      const value = element.getAttribute(attr);
      if (!value) return;
      const next = map.get(value.trim());
      if (next) element.setAttribute(attr, next);
    });
  });
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const userChangedRef = useRef(false);
  const [language, setLanguageState] = useState<Language>(() => getLanguage());
  const [readyToPersist, setReadyToPersist] = useState(() => (
    typeof window === 'undefined' || isLanguage(window.localStorage.getItem(LANGUAGE_KEY))
  ));

  useEffect(() => {
    let cancelled = false;
    if (typeof window === 'undefined' || isLanguage(window.localStorage.getItem(LANGUAGE_KEY))) {
      setReadyToPersist(true);
      return undefined;
    }
    void api.settings.get('language')
      .then((stored) => {
        if (!cancelled && !userChangedRef.current && isLanguage(stored)) setLanguageState(stored);
      })
      .finally(() => {
        if (!cancelled && !userChangedRef.current) setReadyToPersist(true);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (readyToPersist) setLanguage(language);
    else if (typeof document !== 'undefined') document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    localizeDom(language);
    const observer = new MutationObserver(() => localizeDom(language));
    const root = document.getElementById('root');
    if (root) observer.observe(root, { childList: true, subtree: true });
    if (readyToPersist) void api.settings.set('language', language).catch(() => undefined);
    return () => observer.disconnect();
  }, [language, readyToPersist]);

  const changeLanguage = useCallback((nextLanguage: Language) => {
    userChangedRef.current = true;
    setReadyToPersist(true);
    setLanguageState(nextLanguage);
  }, []);

  const translate = useCallback(
    (key: TranslationKey | string, params?: Record<string, string | number>) => t(key, language, params),
    [language],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ language, setLanguage: changeLanguage, t: translate }),
    [changeLanguage, language, translate],
  );

  return React.createElement(I18nContext.Provider, { value }, children);
}

export function useI18n(): I18nContextValue {
  const value = React.useContext(I18nContext);
  if (value) return value;
  const language = getLanguage();
  return {
    language,
    setLanguage,
    t: (key, params) => t(key, language, params),
  };
}
