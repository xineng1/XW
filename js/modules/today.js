;(function (root) {
  const KCBAPP = root.KCBAPP || (root.KCBAPP = {});

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  async function getTodayTasks() {
    const tasks = await KCBAPP.store.queryByIndex('tasks', 'date', todayStr());
    const grouped = { '早': [], '午': [], '晚': [] };
    tasks.forEach(function (t) {
      if (grouped[t.period]) grouped[t.period].push(t);
    });
    Object.keys(grouped).forEach(function (k) {
      grouped[k].sort(function (a, b) { return (a.time || '').localeCompare(b.time || ''); });
    });
    return grouped;
  }

  async function getTodayAllTasks() {
    const tasks = await KCBAPP.store.queryByIndex('tasks', 'date', todayStr());
    return tasks;
  }

  async function getTasksByDate(date) {
    return await KCBAPP.store.queryByIndex('tasks', 'date', date);
  }

  async function getTasksByDateGrouped(date) {
    const tasks = await getTasksByDate(date);
    const grouped = { '早': [], '午': [], '晚': [] };
    tasks.forEach(function (t) {
      if (grouped[t.period]) grouped[t.period].push(t);
    });
    Object.keys(grouped).forEach(function (k) {
      grouped[k].sort(function (a, b) { return (a.time || '').localeCompare(b.time || ''); });
    });
    return grouped;
  }

  async function getDatesWithRecords() {
    const all = await KCBAPP.store.getAll('tasks');
    const set = {};
    all.forEach(function (t) { if (t.date) set[t.date] = true; });
    return Object.keys(set);
  }

  let viewDate = null;
  function setViewDate(date) { viewDate = date; }
  function getCurrentViewDate() { return viewDate || todayStr(); }
  function shiftDay(delta) {
    const cur = viewDate ? new Date(viewDate) : new Date();
    cur.setDate(cur.getDate() + delta);
    viewDate = cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0') + '-' + String(cur.getDate()).padStart(2, '0');
    render();
  }

  async function openCalendar() {
    if (typeof document === 'undefined') return;
    const dates = await getDatesWithRecords();
    const dateSet = {};
    dates.forEach(function (d) { dateSet[d] = true; });
    const now = viewDate ? new Date(viewDate) : new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const card = document.createElement('div');
    card.className = 'modal-card';
    card.style.width = '360px';
    const title = document.createElement('div');
    title.className = 'modal-title';
    title.textContent = y + '年' + (m + 1) + '月 · 点有记录日期查看';
    card.appendChild(title);
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center;';
    ['日', '一', '二', '三', '四', '五', '六'].forEach(function (w) {
      const h = document.createElement('div');
      h.textContent = w;
      h.style.cssText = 'font-size:10px;color:var(--color-text-tertiary);padding:4px;';
      grid.appendChild(h);
    });
    for (let i = 0; i < firstDay; i++) { grid.appendChild(document.createElement('div')); }
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const has = dateSet[ds];
      const btn = document.createElement('div');
      btn.textContent = d;
      btn.style.cssText = 'padding:6px;font-size:11px;border-radius:4px;cursor:' + (has ? 'pointer' : 'not-allowed') + ';' + (has ? 'background:var(--purple-50);color:var(--purple-800);font-weight:500;' : 'color:var(--color-text-tertiary);opacity:0.35;') + (ds === getCurrentViewDate() ? 'outline:2px solid var(--purple-600);' : '');
      if (has) btn.onclick = function () { viewDate = ds; KCBAPP.modal.close(); render(); };
      grid.appendChild(btn);
    }
    card.appendChild(grid);
    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-outline';
    closeBtn.textContent = '关闭';
    closeBtn.onclick = KCBAPP.modal.close;
    actions.appendChild(closeBtn);
    card.appendChild(actions);
    overlay.appendChild(card);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) KCBAPP.modal.close(); });
    document.body.appendChild(overlay);
  }

  function inferPeriod(startTime) {
    if (!startTime) return '早';
    const h = parseInt(String(startTime).split(':')[0]);
    if (isNaN(h)) return '早';
    if (h < 12) return '早';
    if (h < 18) return '午';
    return '晚';
  }

  async function addTask(data) {
    const startTime = data.startTime || data.time || '';
    const task = {
      id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title: data.title,
      date: data.date || todayStr(),
      period: data.period || inferPeriod(startTime),
      time: startTime,
      minutes: data.minutes || 0,
      priority: data.priority || '中',
      status: data.status || '待办',
      note: data.note || '',
      source: data.source || '',
      createdAt: new Date().toISOString()
    };
    await KCBAPP.store.add('tasks', task);
    return task;
  }

  async function addImportedTask(data) {
    const existing = await KCBAPP.store.get('tasks', data.id);
    if (existing) return existing;
    const task = {
      id: data.id,
      title: data.title,
      period: data.period || '早',
      time: data.time || '',
      status: '待办',
      note: data.note || '',
      source: data.source || '',
      date: todayStr(),
      createdAt: new Date().toISOString()
    };
    await KCBAPP.store.add('tasks', task);
    return task;
  }

  async function syncImportedTasks() {
    if (!KCBAPP.schedule || !KCBAPP.fitness) return;
    const courses = await KCBAPP.schedule.getTodayCourses();
    for (let i = 0; i < courses.length; i++) {
      const c = courses[i];
      await addImportedTask({
        id: 'imp_course_' + c.id,
        title: c.name + (c.location ? ' ' + c.location : ''),
        period: c.section <= 2 ? '早' : (c.section <= 3 ? '午' : '晚'),
        time: c.startTime || '',
        source: '来自课程表'
      });
    }
    const tpls = await KCBAPP.fitness.getTodayTemplate();
    for (let i = 0; i < tpls.length; i++) {
      const t = tpls[i];
      await addImportedTask({
        id: 'imp_fitness_' + t.id,
        title: '健身 · ' + (t.part || '训练'),
        period: '晚',
        time: '19:00',
        source: '来自健身'
      });
    }
  }

  async function toggleTask(id) {
    const t = await KCBAPP.store.get('tasks', id);
    if (t) {
      t.status = t.status === '完成' ? '待办' : '完成';
      await KCBAPP.store.update('tasks', t);
    }
    return t;
  }

  async function deleteTask(id) {
    await KCBAPP.store.remove('tasks', id);
  }

  async function getReview(date) {
    return await KCBAPP.store.get('review', date || todayStr());
  }

  async function saveReview(content, date) {
    const d = date || todayStr();
    await KCBAPP.store.update('review', { date: d, content: content, updatedAt: new Date().toISOString() });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function render() {
    if (typeof document === 'undefined') return;
    const content = document.getElementById('content');
    if (!content) return;
    await syncImportedTasks();
    const viewD = getCurrentViewDate();
    const grouped = await getTasksByDateGrouped(viewD);
    const review = await getReview(viewD);
    const periods = ['早', '午', '晚'];

    let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
    html += '<div style="display:flex;align-items:center;gap:8px;">';
    html += '<button class="btn-outline" onclick="KCBAPP.today.shiftDay(-1)">‹</button>';
    html += '<span style="font-size:14px;font-weight:500;">' + viewD + (viewD === todayStr() ? ' (今天)' : '') + '</span>';
    html += '<button class="btn-outline" onclick="KCBAPP.today.shiftDay(1)">›</button>';
    html += '<button class="btn-outline" onclick="KCBAPP.today.openCalendar()">日历</button>';
    html += '</div>';
    html += '<button class="btn-primary" onclick="KCBAPP.today.openAddDialog()">+ 添加任务</button>';
    html += '</div>';

    periods.forEach(function (p) {
      html += '<div style="font-size:12px;font-weight:500;color:var(--purple-600);margin:12px 0 6px;">' + p + '</div>';
      const list = grouped[p];
      if (list.length === 0) {
        html += '<div style="color:var(--color-text-tertiary);font-size:11px;padding:8px;">暂无</div>';
      } else {
        list.forEach(function (t) {
          const done = t.status === '完成';
          html += '<div class="task-item' + (done ? ' done' : '') + '">';
          html += '<div class="task-check' + (done ? ' done' : '') + '" onclick="KCBAPP.today.toggleTask(\'' + t.id + '\').then(KCBAPP.today.render)"></div>';
          html += '<div class="task-title">' + escapeHtml(t.title);
          if (t.time) html += ' <span style="color:var(--color-text-tertiary);font-size:10px;">' + escapeHtml(t.time) + '</span>';
          if (t.source) html += ' <span class="tag tag-blue">' + escapeHtml(t.source) + '</span>';
          html += '</div>';
          html += '<button class="note-actions" style="font-size:10px;color:var(--color-text-tertiary);" onclick="KCBAPP.today.deleteTask(\'' + t.id + '\').then(KCBAPP.today.render)">删除</button>';
          html += '</div>';
        });
      }
    });

    html += '<div class="section-title">今日复盘</div>';
    html += '<textarea id="reviewBox" style="width:100%;min-height:60px;padding:10px;border:0.5px solid var(--color-border);border-radius:8px;font-size:12px;" placeholder="睡前填写今日复盘...">' + escapeHtml(review ? review.content : '') + '</textarea>';
    html += '<button class="btn-outline" style="margin-top:8px;" onclick="KCBAPP.today.saveReview(document.getElementById(\'reviewBox\').value).then(()=>alert(\'已保存\'))">保存复盘</button>';

    content.innerHTML = html;
  }

  function getFormFields() {
    return [
      { name: 'title', label: '事项名称', required: true },
      { name: 'date', label: '日期', type: 'date', required: true },
      { name: 'startTime', label: '开始时间', type: 'time' },
      { name: 'minutes', label: '预计分钟', type: 'number' },
      { name: 'priority', label: '优先级', type: 'select', required: true, options: ['高', '中', '低'] },
      { name: 'note', label: '备注', type: 'textarea' }
    ];
  }

  function openAddDialog() {
    if (typeof document === 'undefined') return;
    KCBAPP.modal.open({
      title: '添加计划事项',
      fields: getFormFields(),
      initialData: { date: todayStr(), priority: '中' },
      onSave: async function (data) {
        await addTask(data);
        if (KCBAPP.home && KCBAPP.home.render && KCBAPP.router.getCurrent() === 'home') KCBAPP.home.render();
        render();
      }
    });
  }

  KCBAPP.today = {
    render, getTodayTasks, getTodayAllTasks, getTasksByDate, getTasksByDateGrouped, getDatesWithRecords, addTask, addImportedTask,
    toggleTask, syncImportedTasks, deleteTask, getReview, saveReview, openAddDialog, getFormFields, inferPeriod, setViewDate, getCurrentViewDate, shiftDay, openCalendar, todayStr
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = KCBAPP;
})(typeof window !== 'undefined' ? window : globalThis);
