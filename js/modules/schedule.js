;(function (root) {
  const KCBAPP = root.KCBAPP || (root.KCBAPP = {});

  function todayWeekday() { const d = new Date().getDay(); return d === 0 ? 7 : d; }

  const DEFAULT_COLORS = ['#4C6FFF', '#12B886', '#7048E8', '#F76707', '#E64980', '#1098AD', '#F59F00'];

  let _cid = 0;
  async function addCourse(data) {
    const c = {
      id: 'c_' + Date.now() + '_' + (_cid++) + '_' + Math.random().toString(36).slice(2, 8),
      name: data.name, weekday: parseInt(data.weekday) || 1, section: parseInt(data.section) || 1,
      startTime: data.startTime || '', endTime: data.endTime || '',
      location: data.location || '', teacher: data.teacher || '',
      color: data.color || '', semester: data.semester || '2026-2027-1',
      createdAt: new Date().toISOString()
    };
    await KCBAPP.store.add('courses', c);
    return c;
  }
  async function getCourses() { return await KCBAPP.store.getAll('courses'); }
  async function getCoursesByWeekday(w) { return await KCBAPP.store.queryByIndex('courses', 'weekday', w); }
  async function getTodayCourses() { return await getCoursesByWeekday(todayWeekday()); }
  async function deleteCourse(id) { await KCBAPP.store.remove('courses', id); }
  async function updateCourse(c) { await KCBAPP.store.update('courses', c); return c; }

  async function importCourses(text) {
    const lines = String(text || '').split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l; });
    const imported = [];
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(',').map(function (p) { return p.trim(); });
      if (parts.length < 3) continue;
      const c = await addCourse({
        name: parts[0], weekday: parts[1], section: parts[2],
        startTime: parts[3] || '', location: parts[4] || '', teacher: parts[5] || ''
      });
      imported.push(c);
    }
    return imported;
  }

  // ===== 节次时间设置（存 settings 仓库，key='sectionTimes'）=====
  const SECTION_TIMES_KEY = 'sectionTimes';
  const DEFAULT_SECTION_TIMES = ['08:00', '10:00', '14:00', '16:00', '19:00'];
  async function getSectionTimes() {
    const rec = await KCBAPP.store.get('settings', SECTION_TIMES_KEY);
    if (rec && rec.times && rec.times.length) return rec.times;
    return DEFAULT_SECTION_TIMES.slice();
  }
  async function setSectionTimes(times) {
    const arr = times.map(function (t) { return t || ''; });
    await KCBAPP.store.update('settings', { id: SECTION_TIMES_KEY, times: arr, updatedAt: new Date().toISOString() });
    return arr;
  }

  async function getSummary() {
    const today = await getTodayCourses();
    today.sort(function (a, b) { return (a.section || 0) - (b.section || 0); });
    if (today.length === 0) return null;
    const cur = today[0];
    const after = today[1];
    return {
      main: cur.name,
      sub: (cur.startTime || '') + (cur.startTime && cur.location ? ' ' : '') + (cur.location || ''),
      hint: after ? '下一节 ' + after.name : '今日最后一节'
    };
  }

  function escapeHtml(s) { if (s == null) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // 课程颜色：按 weekday 分配稳定色，避免同天课程颜色全一样
  function courseColor(c, weekdayIndex) {
    if (c.color) return c.color;
    const nameHash = Array.prototype.reduce.call(c.name, function (s, ch) { return s + ch.charCodeAt(0); }, 0);
    return DEFAULT_COLORS[(nameHash + weekdayIndex) % DEFAULT_COLORS.length];
  }
  function lighten(hex) {
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    r = Math.round(r + (255 - r) * 0.86); g = Math.round(g + (255 - g) * 0.86); b = Math.round(b + (255 - b) * 0.86);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  async function render() {
    if (typeof document === 'undefined') return;
    const content = document.getElementById('content'); if (!content) return;
    const courses = await getCourses();
    const times = await getSectionTimes();
    courses.sort(function (a, b) { return (a.weekday || 0) - (b.weekday || 0) || (a.section || 0) - (b.section || 0); });
    const td = todayWeekday();
    const names = ['一', '二', '三', '四', '五', '六', '日'];

    let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><div style="font-size:14px;font-weight:500;font-family:var(--font-kai)">课程表</div><div>';
    html += '<button class="btn-outline" style="margin-right:8px;" onclick="KCBAPP.schedule.openSectionTimes()">节次时间</button>';
    html += '<button class="btn-outline" style="margin-right:8px;" onclick="KCBAPP.schedule.openImport()">导入</button>';
    html += '<button class="btn-primary" onclick="KCBAPP.schedule.openAdd()">+ 添加课程</button></div></div>';
    html += '<div style="font-size:10px;color:var(--color-text-tertiary);margin-bottom:8px;">点击课程格可编辑或删除</div>';

    html += '<div style="background:var(--color-bg-primary);border:0.5px solid var(--color-border);border-radius:12px;overflow:hidden;font-size:11px;">';
    html += '<div style="display:grid;grid-template-columns:56px repeat(7,1fr);">';
    // 表头
    html += '<div style="padding:8px 4px;background:var(--color-bg-secondary);font-weight:500;color:var(--color-text-tertiary);text-align:center;">节次</div>';
    for (let d = 1; d <= 7; d++) {
      html += '<div style="padding:8px 4px;background:' + (d === td ? 'var(--purple-50)' : 'var(--color-bg-secondary)') + ';font-weight:500;color:' + (d === td ? 'var(--purple-700)' : 'var(--color-text-primary)') + ';text-align:center;">' + (d === td ? '今天<br>' : '') + '周' + names[d - 1] + '</div>';
    }
    // 各行
    for (let s = 1; s <= 6; s++) {
      html += '<div style="display:contents;">';
      html += '<div style="padding:6px 2px;text-align:center;border-top:0.5px solid var(--color-border);color:var(--color-text-primary);font-weight:500;">' + s + (times[s - 1] ? '<div style="font-size:9px;color:var(--color-text-tertiary);font-weight:400;">' + times[s - 1] + '</div>' : '') + '</div>';
      for (let d = 1; d <= 7; d++) {
        const c = courses.find(function (x) { return x.weekday === d && x.section === s; });
        html += '<div style="border-top:0.5px solid var(--color-border);border-left:0.5px solid var(--color-border);padding:4px;min-height:56px;background:' + (d === td ? 'var(--purple-50)' : 'transparent') + ';">';
        if (c) {
          const color = courseColor(c, d);
          html += '<div onclick="KCBAPP.schedule.openEdit(\'' + c.id + '\')" style="height:100%;border-radius:8px;background:' + lighten(color) + ';border-left:3px solid ' + color + ';padding:5px 6px;cursor:pointer;box-sizing:border-box;">';
          html += '<div style="font-weight:600;color:var(--color-text-primary);line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(c.name) + '</div>';
          if (c.location) html += '<div style="font-size:9px;color:var(--color-text-tertiary);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(c.location) + '</div>';
          if (c.teacher) html += '<div style="font-size:9px;color:var(--color-text-tertiary);">' + escapeHtml(c.teacher) + '</div>';
          html += '</div>';
        }
        html += '</div>';
      }
      html += '</div>';
    }
    html += '</div></div>';
    content.innerHTML = html;
  }

  function getFormFields() {
    return [
      { name: 'name', label: '课程名称', required: true },
      { name: 'weekday', label: '星期', type: 'select', required: true, options: ['1', '2', '3', '4', '5', '6', '7'] },
      { name: 'section', label: '节次', type: 'select', required: true, options: ['1', '2', '3', '4', '5'] },
      { name: 'startTime', label: '开始时间', type: 'time' },
      { name: 'location', label: '地点' },
      { name: 'teacher', label: '老师' }
    ];
  }

  function openAdd() {
    if (typeof document === 'undefined') return;
    KCBAPP.modal.open({
      title: '添加课程',
      fields: getFormFields(),
      onSave: async function (data) { await addCourse(data); render(); }
    });
  }

  async function openEdit(courseId) {
    if (typeof document === 'undefined') return;
    const c = await KCBAPP.store.get('courses', courseId);
    if (!c) return;
    KCBAPP.modal.open({
      title: '编辑课程',
      fields: getFormFields(),
      initialData: { name: c.name, weekday: String(c.weekday), section: String(c.section), startTime: c.startTime, location: c.location, teacher: c.teacher },
      onSave: async function (data) {
        c.name = data.name; c.weekday = parseInt(data.weekday) || 1; c.section = parseInt(data.section) || 1;
        c.startTime = data.startTime; c.location = data.location; c.teacher = data.teacher;
        await updateCourse(c); render();
      },
      onDelete: async function () {
        if (root.confirm && !root.confirm('删除该课程？')) return;
        await deleteCourse(courseId); render();
      }
    });
  }

  function openSectionTimes() {
    if (typeof document === 'undefined') return;
    getSectionTimes().then(function (times) {
      KCBAPP.modal.open({
        title: '设置节次时间',
        fields: [
          { name: 't1', label: '第 1 节开始', type: 'time', value: times[0] || '' },
          { name: 't2', label: '第 2 节开始', type: 'time', value: times[1] || '' },
          { name: 't3', label: '第 3 节开始', type: 'time', value: times[2] || '' },
          { name: 't4', label: '第 4 节开始', type: 'time', value: times[3] || '' },
          { name: 't5', label: '第 5 节开始', type: 'time', value: times[4] || '' },
          { name: 't6', label: '第 6 节开始', type: 'time', value: times[5] || '' }
        ],
        onSave: async function (data) {
          await setSectionTimes([data.t1 || '', data.t2 || '', data.t3 || '', data.t4 || '', data.t5 || '', data.t6 || '']);
          if (getCurrent() === 'schedule') render();
        }
      });
    });
  }

  function getCurrent() {
    return KCBAPP.router && KCBAPP.router.getCurrent ? KCBAPP.router.getCurrent() : '';
  }

  function openImport() {
    if (typeof document === 'undefined') return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const card = document.createElement('div');
    card.className = 'modal-card';
    card.style.width = '520px';
    const title = document.createElement('div');
    title.className = 'modal-title';
    title.textContent = '导入课程';
    card.appendChild(title);
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:10px;color:var(--color-text-tertiary);margin-bottom:8px;';
    hint.textContent = '每行一门课，格式：课名,星期(1-7),节次(1-5),开始时间,地点,老师';
    card.appendChild(hint);
    const ta = document.createElement('textarea');
    ta.style.cssText = 'width:100%;min-height:160px;border:0.5px solid var(--color-border);border-radius:8px;padding:10px;font-size:12px;font-family:inherit;resize:vertical;';
    ta.placeholder = '生物化学,1,1,08:00,实验楼301,王老师\n遗传学,1,2,10:00,A楼203,李老师';
    card.appendChild(ta);
    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-outline';
    cancelBtn.textContent = '取消';
    cancelBtn.onclick = KCBAPP.modal.close;
    const importBtn = document.createElement('button');
    importBtn.className = 'btn-primary';
    importBtn.textContent = '导入';
    importBtn.onclick = async function () {
      const n = (await importCourses(ta.value)).length;
      KCBAPP.modal.close();
      if (root.alert) root.alert('已导入 ' + n + ' 门课程');
      render();
    };
    actions.appendChild(cancelBtn);
    actions.appendChild(importBtn);
    card.appendChild(actions);
    overlay.appendChild(card);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) KCBAPP.modal.close(); });
    document.body.appendChild(overlay);
  }

  KCBAPP.schedule = { render, addCourse, getCourses, getCoursesByWeekday, getTodayCourses, deleteCourse, updateCourse, importCourses, getSectionTimes, setSectionTimes, getSummary, getFormFields, openAdd, openEdit, openImport, openSectionTimes, todayWeekday };
  if (typeof module !== 'undefined' && module.exports) module.exports = KCBAPP;
})(typeof window !== 'undefined' ? window : globalThis);
