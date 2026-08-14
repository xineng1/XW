;(function (root) {
  const KCBAPP = root.KCBAPP || (root.KCBAPP = {});

  async function addProject(data) {
    const p = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      name: data.name, desc: data.desc || '', status: data.status || '进行中',
      targetDate: data.targetDate || '',
      localDir: data.localDir || '', repo: data.repo || '', docs: data.docs || '',
      createdAt: new Date().toISOString()
    };
    await KCBAPP.store.add('projects', p);
    return p;
  }
  async function getProjects() { return await KCBAPP.store.getAll('projects'); }

  async function removeProjectData(id) {
    await KCBAPP.store.remove('projects', id);
    const tasks = await getTasksByProject(id);
    for (let i = 0; i < tasks.length; i++) await KCBAPP.store.remove('dev_tasks', tasks[i].id);
    const snippets = await getSnippetsByProject(id);
    for (let i = 0; i < snippets.length; i++) await KCBAPP.store.remove('snippets', snippets[i].id);
    const issues = await getIssuesByProject(id);
    for (let i = 0; i < issues.length; i++) await KCBAPP.store.remove('issues', issues[i].id);
  }
  async function deleteProject(id) {
    if (typeof root.confirm !== 'undefined' && !root.confirm('删除项目及其所有任务/片段/问题？')) return;
    await removeProjectData(id);
    if (currentProjectId === id) currentProjectId = null;
    render();
  }

  async function addTask(data) {
    const t = { id: 'dt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), projectId: data.projectId, title: data.title, status: data.status || '待办', priority: data.priority || '普通', milestone: data.milestone || '', note: data.note || '', createdAt: new Date().toISOString() };
    await KCBAPP.store.add('dev_tasks', t);
    return t;
  }
  async function getTasksByProject(pid) { return await KCBAPP.store.queryByIndex('dev_tasks', 'projectId', pid); }
  async function toggleDevTask(id) {
    const t = await KCBAPP.store.get('dev_tasks', id);
    if (t) { t.status = t.status === '完成' ? '待办' : '完成'; await KCBAPP.store.update('dev_tasks', t); }
    return t;
  }
  async function deleteTask(id) { await KCBAPP.store.remove('dev_tasks', id); }

  async function addSnippet(data) {
    const s = { id: 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), projectId: data.projectId, title: data.title, content: data.content || '', tags: data.tags || [], createdAt: new Date().toISOString() };
    await KCBAPP.store.add('snippets', s);
    return s;
  }
  async function getSnippetsByProject(pid) { return await KCBAPP.store.queryByIndex('snippets', 'projectId', pid); }
  async function deleteSnippet(id) { await KCBAPP.store.remove('snippets', id); }

  async function addIssue(data) {
    const i = { id: 'is_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), projectId: data.projectId, title: data.title, desc: data.desc || '', status: data.status || '未解决', createdAt: new Date().toISOString() };
    await KCBAPP.store.add('issues', i);
    return i;
  }
  async function getIssuesByProject(pid) { return await KCBAPP.store.queryByIndex('issues', 'projectId', pid); }
  async function deleteIssue(id) { await KCBAPP.store.remove('issues', id); }

  let currentProjectId = null;
  function selectProject(id) { currentProjectId = id; render(); }
  function getCurrentProjectId() { return currentProjectId; }

  async function getActiveProjectSummary() {
    const projects = await getProjects();
    if (projects.length === 0) return null;
    const p = projects[0];
    const tasks = await getTasksByProject(p.id);
    const snippets = await getSnippetsByProject(p.id);
    const todo = tasks.filter(function (t) { return t.status !== '完成'; }).length;
    return {
      main: p.name + ' 进行中',
      sub: '待办 ' + todo + ' · 共 ' + tasks.length,
      hint: snippets.length + ' 个代码片段'
    };
  }

  function escapeHtml(s) { if (s == null) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function statusTag(status) {
    const map = { '进行中': 'tag-green', '暂停': 'tag-amber', '已完成': 'tag-blue', '归档': 'tag-gray', '待办': 'tag-gray', '进行中': 'tag-purple', '完成': 'tag-blue', '高': 'tag-red', '普通': 'tag-gray', '低': 'tag-green', '未解决': 'tag-red', '已解决': 'tag-blue' };
    return '<span class="tag ' + (map[status] || 'tag-gray') + '">' + escapeHtml(status) + '</span>';
  }

  async function render() {
    if (typeof document === 'undefined') return;
    const content = document.getElementById('content'); if (!content) return;
    const projects = await getProjects();
    if (!currentProjectId && projects.length) currentProjectId = projects[0].id;
    let html = '<div style="margin-bottom:20px;">';
    html += '<div style="font-size:22px;font-weight:600;margin-bottom:4px;font-family:var(--font-kai)">开发工作</div>';
    html += '<div style="font-size:12px;color:var(--color-text-tertiary);">项目、里程碑、功能、Bug 和开发日志各归其位。</div>';
    html += '</div>';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';
    html += '<div></div>';
    html += '<div style="display:flex;gap:8px;">';
    html += '<button class="btn-outline" onclick="KCBAPP.dev.openAddProject()">+ 新建项目</button>';
    html += '<button class="btn-primary" onclick="KCBAPP.dev.openAddTask(KCBAPP.dev.getCurrentProjectId())">+ 添加工作项</button>';
    html += '</div>';
    html += '</div>';

    html += '<div style="display:grid;grid-template-columns:240px 1fr;gap:20px;">';
    // left project list
    html += '<div>';
    html += '<div style="font-size:11px;color:var(--color-text-tertiary);margin-bottom:8px;">项目</div>';
    if (projects.length === 0) html += '<div style="color:var(--color-text-tertiary);font-size:11px;padding:8px;">暂无项目</div>';
    projects.forEach(function (p) {
      const active = p.id === currentProjectId;
      html += '<div onclick="KCBAPP.dev.selectProject(\'' + p.id + '\')" style="padding:12px;border-radius:8px;cursor:pointer;margin-bottom:8px;' + (active ? 'background:var(--color-bg-primary);border:1px solid var(--purple-300);box-shadow:0 1px 2px rgba(0,0,0,0.04);' : 'background:var(--color-bg-secondary);') + '">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">';
      html += '<div style="font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">' + escapeHtml(p.name) + '</div>';
      html += statusTag(p.status);
      html += '</div>';
      html += '<div style="font-size:10px;color:var(--color-text-tertiary);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + escapeHtml(p.desc || '暂无描述') + '</div>';
      html += '</div>';
    });
    html += '</div>';

    // right project detail
    html += '<div>';
    if (currentProjectId) {
      const p = projects.find(function (x) { return x.id === currentProjectId; });
      if (p) {
        const tasks = await getTasksByProject(p.id);
        const snippets = await getSnippetsByProject(p.id);
        const issues = await getIssuesByProject(p.id);
        const doneCount = tasks.filter(function (t) { return t.status === '完成'; }).length;
        const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

        html += '<div class="card" style="margin-bottom:16px;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">';
        html += '<div>';
        html += '<div style="font-size:16px;font-weight:600;margin-bottom:4px;">' + escapeHtml(p.name) + '</div>';
        html += '<div style="font-size:11px;color:var(--color-text-tertiary);">' + escapeHtml(p.desc || '') + '</div>';
        html += '</div>';
        html += '<div style="display:flex;gap:6px;">';
        html += '<button class="btn-outline" style="font-size:10px;padding:4px 10px;" onclick="KCBAPP.dev.deleteProject(\'' + p.id + '\')">删除</button>';
        html += '</div>';
        html += '</div>';
        if (p.targetDate || p.repo || p.docs || p.localDir) {
          html += '<div style="display:flex;gap:12px;flex-wrap:wrap;font-size:10px;color:var(--color-text-tertiary);margin-top:8px;">';
          if (p.targetDate) html += '<span>目标日期 ' + escapeHtml(p.targetDate) + '</span>';
          if (p.repo) html += '<span>仓库 ' + escapeHtml(p.repo) + '</span>';
          if (p.docs) html += '<span>文档 ' + escapeHtml(p.docs) + '</span>';
          if (p.localDir) html += '<span>目录 ' + escapeHtml(p.localDir) + '</span>';
          html += '</div>';
        }
        html += '</div>';

        html += '<div class="card" style="margin-bottom:16px;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
        html += '<div><div style="font-size:13px;font-weight:600;">里程碑</div><div style="font-size:10px;color:var(--color-text-tertiary);">用目标日期判断项目节奏</div></div>';
        html += '<button class="btn-outline" style="font-size:10px;padding:4px 10px;" onclick="KCBAPP.dev.openAddTask(\'' + p.id + '\')">+ 添加</button>';
        html += '</div>';
        if (p.targetDate) {
          html += '<div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--color-bg-secondary);border-radius:8px;margin-bottom:8px;">';
          html += '<div style="width:32px;height:32px;border-radius:8px;background:var(--purple-100);display:flex;align-items:center;justify-content:center;font-size:14px;">🏁</div>';
          html += '<div style="flex:1;"><div style="font-size:12px;font-weight:500;">项目目标</div><div style="font-size:10px;color:var(--color-text-tertiary);">' + escapeHtml(p.targetDate) + '</div></div>';
          html += statusTag(p.status);
          html += '</div>';
        } else {
          html += '<div style="color:var(--color-text-tertiary);font-size:11px;padding:4px 0;">暂无里程碑，请在项目卡片里设置目标日期</div>';
        }
        html += '</div>';

        html += '<div class="card" style="margin-bottom:16px;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
        html += '<div><div style="font-size:13px;font-weight:600;">工作项</div><div style="font-size:10px;color:var(--color-text-tertiary);">进度 ' + doneCount + '/' + tasks.length + ' · 完成度 ' + progress + '%</div></div>';
        html += '<button class="btn-outline" style="font-size:10px;padding:4px 10px;" onclick="KCBAPP.dev.openAddTask(\'' + p.id + '\')">+ 添加</button>';
        html += '</div>';
        if (tasks.length === 0) html += '<div style="color:var(--color-text-tertiary);font-size:11px;padding:4px 0;">暂无工作项</div>';
        tasks.forEach(function (t) {
          const done = t.status === '完成';
          html += '<div class="task-item' + (done ? ' done' : '') + '" style="padding:10px 0;">';
          html += '<div class="task-check' + (done ? ' done' : '') + '" onclick="KCBAPP.dev.toggleDevTask(\'' + t.id + '\').then(KCBAPP.dev.render)"></div>';
          html += '<div style="flex:1;">';
          html += '<div style="font-size:12px;' + (done ? 'text-decoration:line-through;color:var(--color-text-tertiary);' : '') + '">' + escapeHtml(t.title) + '</div>';
          html += '<div style="display:flex;gap:6px;margin-top:3px;">';
          if (t.milestone) html += '<span class="tag tag-purple">' + escapeHtml(t.milestone) + '</span>';
          html += statusTag(t.status);
          if (t.priority) html += statusTag(t.priority);
          html += '</div>';
          html += '</div>';
          html += '<button class="note-actions" style="color:var(--red-600);" onclick="KCBAPP.dev.deleteTask(\'' + t.id + '\').then(KCBAPP.dev.render)">删除</button>';
          html += '</div>';
        });
        html += '</div>';

        html += '<div class="card" style="margin-bottom:16px;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
        html += '<div style="font-size:13px;font-weight:600;">代码片段 · ' + snippets.length + '</div>';
        html += '<button class="btn-outline" style="font-size:10px;padding:4px 10px;" onclick="KCBAPP.dev.openAddSnippet(\'' + p.id + '\')">+ 添加</button>';
        html += '</div>';
        if (snippets.length === 0) html += '<div style="color:var(--color-text-tertiary);font-size:11px;padding:4px 0;">暂无片段</div>';
        snippets.forEach(function (s) {
          html += '<div class="task-item" style="padding:8px 0;"><div style="flex:1;"><div style="font-size:12px;">' + escapeHtml(s.title) + '</div><div style="font-size:9px;color:var(--color-text-tertiary);">' + escapeHtml((s.tags || []).join(',')) + '</div></div><button class="note-actions" style="color:var(--red-600);" onclick="KCBAPP.dev.deleteSnippet(\'' + s.id + '\').then(KCBAPP.dev.render)">删除</button></div>';
        });
        html += '</div>';

        html += '<div class="card">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
        html += '<div style="font-size:13px;font-weight:600;">问题记录 · ' + issues.length + '</div>';
        html += '<button class="btn-outline" style="font-size:10px;padding:4px 10px;" onclick="KCBAPP.dev.openAddIssue(\'' + p.id + '\')">+ 添加</button>';
        html += '</div>';
        if (issues.length === 0) html += '<div style="color:var(--color-text-tertiary);font-size:11px;padding:4px 0;">暂无问题</div>';
        issues.forEach(function (i) {
          html += '<div class="task-item" style="padding:8px 0;"><div style="flex:1;"><div style="font-size:12px;">' + escapeHtml(i.title) + '</div><div style="font-size:9px;color:var(--color-text-tertiary);">' + escapeHtml(i.desc || '') + '</div></div><div style="display:flex;gap:6px;align-items:center;">' + statusTag(i.status) + '<button class="note-actions" style="color:var(--red-600);" onclick="KCBAPP.dev.deleteIssue(\'' + i.id + '\').then(KCBAPP.dev.render)">删除</button></div></div>';
        });
        html += '</div>';
      }
    } else {
      html += '<div style="color:var(--color-text-tertiary);font-size:11px;padding:40px;text-align:center;">选择左侧项目或新建项目</div>';
    }
    html += '</div></div>';
    content.innerHTML = html;
  }

  function getFormFields() {
    return [
      { name: 'name', label: '项目名称', required: true },
      { name: 'desc', label: '项目说明', type: 'textarea' },
      { name: 'status', label: '状态', type: 'select', required: true, options: ['进行中', '暂停', '已完成', '归档'] },
      { name: 'targetDate', label: '目标日期', type: 'date' },
      { name: 'localDir', label: '本地目录' },
      { name: 'repo', label: '代码仓库' },
      { name: 'docs', label: '文档链接' }
    ];
  }
  function getTaskFormFields() {
    return [
      { name: 'title', label: '工作项标题', required: true },
      { name: 'status', label: '状态', type: 'select', options: ['待办', '进行中', '完成'] },
      { name: 'priority', label: '优先级', type: 'select', options: ['高', '普通', '低'] },
      { name: 'milestone', label: '所属里程碑' },
      { name: 'note', label: '备注', type: 'textarea' }
    ];
  }
  function getSnippetFormFields() {
    return [
      { name: 'title', label: '片段标题', required: true },
      { name: 'content', label: '代码内容', type: 'textarea' },
      { name: 'tags', label: '标签(逗号分隔)' }
    ];
  }
  function getIssueFormFields() {
    return [
      { name: 'title', label: '问题标题', required: true },
      { name: 'desc', label: '描述', type: 'textarea' },
      { name: 'status', label: '状态', type: 'select', options: ['未解决', '已解决'] }
    ];
  }

  function openAddProject() {
    if (typeof document === 'undefined') return;
    KCBAPP.modal.open({
      title: '新建项目', fields: getFormFields(), initialData: { status: '进行中' },
      onSave: async function (data) { const p = await addProject(data); currentProjectId = p.id; render(); }
    });
  }
  function openAddTask(pid) {
    if (typeof document === 'undefined') return;
    KCBAPP.modal.open({
      title: '添加任务', fields: getTaskFormFields(),
      onSave: async function (data) { await addTask(Object.assign({ projectId: pid }, data)); render(); }
    });
  }
  function openAddSnippet(pid) {
    if (typeof document === 'undefined') return;
    KCBAPP.modal.open({
      title: '添加片段', fields: getSnippetFormFields(),
      onSave: async function (data) { await addSnippet(Object.assign({ projectId: pid }, data)); render(); }
    });
  }
  function openAddIssue(pid) {
    if (typeof document === 'undefined') return;
    KCBAPP.modal.open({
      title: '添加问题', fields: getIssueFormFields(), initialData: { status: '未解决' },
      onSave: async function (data) { await addIssue(Object.assign({ projectId: pid }, data)); render(); }
    });
  }

  KCBAPP.dev = {
    render, addProject, getProjects, deleteProject, removeProjectData,
    addTask, getTasksByProject, toggleDevTask, deleteTask,
    addSnippet, getSnippetsByProject, deleteSnippet,
    addIssue, getIssuesByProject, deleteIssue,
    selectProject, getCurrentProjectId,
    getActiveProjectSummary, getSummary: getActiveProjectSummary,
    getFormFields, getTaskFormFields, getSnippetFormFields, getIssueFormFields,
    openAddProject, openAddTask, openAddSnippet, openAddIssue
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = KCBAPP;
})(typeof window !== 'undefined' ? window : globalThis);
