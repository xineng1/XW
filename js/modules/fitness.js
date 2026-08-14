;(function (root) {
  const KCBAPP = root.KCBAPP || (root.KCBAPP = {});

  function todayWeekday() { const d = new Date().getDay(); return d === 0 ? 7 : d; }
  function todayStr() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  let viewYear = new Date().getFullYear();
  let viewMonth = new Date().getMonth();
  let viewDate = null;
  function selectDate(ds) { viewDate = ds; render(); }
  function addMonth(delta) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    viewYear = d.getFullYear(); viewMonth = d.getMonth();
    render();
  }
  function goToday() { const t = new Date(); viewYear = t.getFullYear(); viewMonth = t.getMonth(); viewDate = todayStr(); render(); }
  function setViewDate(d) { viewDate = d || todayStr(); render(); }

  async function addTemplate(data) {
    const t = { id: 'wt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), weekday: data.weekday, part: data.part || '', exercises: data.exercises || [], createdAt: new Date().toISOString() };
    await KCBAPP.store.add('workout_templates', t); return t;
  }
  async function getTemplates() { return await KCBAPP.store.getAll('workout_templates'); }
  async function getTodayTemplate() { return await KCBAPP.store.queryByIndex('workout_templates', 'weekday', todayWeekday()); }

  let _wlid = 0;
  async function addWorkoutLog(data) {
    const l = { id: 'wl_' + Date.now() + '_' + (_wlid++) + '_' + Math.random().toString(36).slice(2, 8), date: data.date || todayStr(), part: data.part || '', exerciseName: data.exerciseName || '', sets: data.sets || 0, targetWeight: data.targetWeight || '', actualWeight: data.actualWeight || '', duration: data.duration || 0, note: data.note || '', createdAt: new Date().toISOString() };
    await KCBAPP.store.add('workout_logs', l); return l;
  }
  async function getWorkoutLogsByDate(date) { return await KCBAPP.store.queryByIndex('workout_logs', 'date', date || todayStr()); }
  async function getAllWorkoutLogs() { return await KCBAPP.store.getAll('workout_logs'); }
  async function deleteWorkoutLog(id) { await KCBAPP.store.remove('workout_logs', id); }

  async function addBodyMetric(data) {
    const m = { id: 'bm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), date: data.date || todayStr(), weight: data.weight, note: data.note || '', createdAt: new Date().toISOString() };
    await KCBAPP.store.add('body_metrics', m); return m;
  }
  async function getBodyMetrics() { return await KCBAPP.store.getAll('body_metrics'); }
  async function getLastBodyMetric() {
    const all = await getBodyMetrics();
    all.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    return all[0] || null;
  }
  async function deleteBodyMetric(id) { await KCBAPP.store.remove('body_metrics', id); }

  async function getSummary() {
    const tpl = await getTodayTemplate();
    const todayLogs = await getWorkoutLogsByDate(todayStr());
    if (tpl.length === 0 && todayLogs.length === 0) return null;
    const last = await getLastBodyMetric();
    const part = tpl.length ? tpl[0].part : (todayLogs[0] && todayLogs[0].part) || '训练';
    return {
      main: part,
      sub: tpl.length ? (tpl[0].exercises || []).length + ' 个动作' : todayLogs.length + ' 条训练记录',
      hint: last ? '上次体重 ' + last.weight + 'kg' : '暂无体测'
    };
  }

  function escapeHtml(s) { if (s == null) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function workoutPill(l) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 5px;border-radius:4px;background:var(--purple-50);border:0.5px solid var(--purple-200);margin-bottom:2px;font-size:9px;color:var(--purple-800);">' +
      '<span>' + escapeHtml(l.part) + ' · ' + escapeHtml(l.exerciseName) + '</span>' +
      '<span>' + (l.duration || 0) + 'min</span></div>';
  }

  async function render() {
    if (typeof document === 'undefined') return;
    const content = document.getElementById('content'); if (!content) return;
    const allLogs = await getAllWorkoutLogs();
    const metrics = await getBodyMetrics();
    metrics.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    const selD = viewDate || todayStr();
    let html = '<div style="margin-bottom:20px;">';
    html += '<div style="font-size:22px;font-weight:600;margin-bottom:4px;font-family:var(--font-kai)">健身日历</div>';
    html += '<div style="font-size:12px;color:var(--color-text-tertiary);">按天查看训练部位、动作、时长和体重变化。</div>';
    html += '</div>';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><div style="display:flex;align-items:center;gap:8px;"><button class="btn-outline" onclick="KCBAPP.fitness.addMonth(-1)">‹</button><span style="font-size:14px;font-weight:500;">' + viewYear + '年' + (viewMonth + 1) + '月</span><button class="btn-outline" onclick="KCBAPP.fitness.addMonth(1)">›</button><button class="btn-outline" onclick="KCBAPP.fitness.goToday()">回到今天</button></div><div><button class="btn-outline" style="margin-right:8px;" onclick="KCBAPP.fitness.openAddMetric()">+ 体重</button><button class="btn-primary" onclick="KCBAPP.fitness.openAddWorkout()">+ 训练</button></div></div>';
    html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:16px;">';
    ['日', '一', '二', '三', '四', '五', '六'].forEach(function (w) {
      html += '<div style="text-align:center;font-size:10px;color:var(--color-text-tertiary);padding:4px;">周' + w + '</div>';
    });
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) html += '<div></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = viewYear + '-' + String(viewMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const dayLogs = allLogs.filter(function (l) { return l.date === ds; });
      const dayMetric = metrics.find(function (m) { return m.date === ds; });
      const isSel = ds === selD;
      const isToday = ds === todayStr();
      html += '<div onclick="KCBAPP.fitness.selectDate(\'' + ds + '\')" style="min-height:90px;padding:6px;border-radius:8px;cursor:pointer;border:0.5px solid ' + (isSel ? 'var(--purple-600)' : 'var(--color-border)') + ';background:' + (isSel ? 'var(--purple-50)' : 'var(--color-bg-primary)') + ';">';
      html += '<div style="font-size:11px;font-weight:500;color:' + (isToday ? 'var(--purple-600)' : 'var(--color-text-primary)') + ';margin-bottom:4px;">' + d + (isToday ? ' · 今天' : '') + '</div>';
      if (dayMetric) html += '<div style="font-size:9px;color:var(--teal-600);margin-bottom:2px;font-weight:500;">体重 ' + dayMetric.weight + 'kg</div>';
      dayLogs.slice(0, 3).forEach(function (l) { html += workoutPill(l); });
      if (dayLogs.length > 3) html += '<div style="font-size:9px;color:var(--color-text-tertiary);">+' + (dayLogs.length - 3) + ' 项</div>';
      html += '</div>';
    }
    html += '</div>';
    const selLogs = allLogs.filter(function (l) { return l.date === selD; });
    const selMetric = metrics.find(function (m) { return m.date === selD; });
    html += '<div class="section-title">' + selD + (selD === todayStr() ? ' (今天)' : '') + ' · 训练 ' + selLogs.length + ' 条</div>';
    if (selLogs.length === 0) html += '<div style="color:var(--color-text-tertiary);font-size:11px;padding:4px 0;">暂无训练</div>';
    selLogs.forEach(function (l) {
      html += '<div class="card" style="margin-bottom:8px;"><div style="display:flex;justify-content:space-between;align-items:center;"><div><div style="font-size:13px;font-weight:500;">' + escapeHtml(l.part) + ' · ' + escapeHtml(l.exerciseName) + '</div><div style="font-size:10px;color:var(--color-text-tertiary);margin-top:2px;">' + (l.sets || 0) + '组 · 目标 ' + escapeHtml(l.targetWeight) + ' · 实际 ' + escapeHtml(l.actualWeight) + (l.duration ? ' · ' + l.duration + '分钟' : '') + '</div></div><button class="note-actions" style="color:var(--red-600);" onclick="KCBAPP.fitness.deleteWorkoutLog(\'' + l.id + '\').then(KCBAPP.fitness.render)">删除</button></div></div>';
    });
    if (selMetric) html += '<div class="card" style="background:var(--green-50);"><div style="font-size:13px;font-weight:500;">体重 ' + selMetric.weight + 'kg</div><div style="font-size:10px;color:var(--color-text-tertiary);">' + selMetric.date + '</div><button class="note-actions" style="color:var(--red-600);font-size:10px;" onclick="KCBAPP.fitness.deleteBodyMetric(\'' + selMetric.id + '\').then(KCBAPP.fitness.render)">删除</button></div>';
    content.innerHTML = html;
  }

  function getFormFields() {
    return [
      { name: 'weight', label: '体重(kg)', type: 'number', required: true },
      { name: 'date', label: '日期', type: 'date' },
      { name: 'note', label: '备注', type: 'textarea' }
    ];
  }
  function getWorkoutFormFields() {
    return [
      { name: 'part', label: '锻炼部位', type: 'select', required: true, options: ['胸', '背', '腿', '肩', '臂', '腹', '有氧'] },
      { name: 'exerciseName', label: '动作名称', required: true },
      { name: 'sets', label: '组数', type: 'number' },
      { name: 'targetWeight', label: '目标重量' },
      { name: 'actualWeight', label: '实际重量' },
      { name: 'duration', label: '运动时长(分钟)', type: 'number' },
      { name: 'date', label: '日期', type: 'date' },
      { name: 'note', label: '备注', type: 'textarea' }
    ];
  }

  function openAddMetric() {
    if (typeof document === 'undefined') return;
    KCBAPP.modal.open({
      title: '记录体重', fields: getFormFields(), initialData: { date: viewDate || todayStr() },
      onSave: async function (data) { await addBodyMetric(data); render(); }
    });
  }
  function openAddWorkout() {
    if (typeof document === 'undefined') return;
    KCBAPP.modal.open({
      title: '训练记录', fields: getWorkoutFormFields(), initialData: { date: viewDate || todayStr() },
      onSave: async function (data) { await addWorkoutLog(data); render(); }
    });
  }

  KCBAPP.fitness = {
    render, addTemplate, getTemplates, getTodayTemplate,
    addWorkoutLog, getWorkoutLogsByDate, getAllWorkoutLogs, deleteWorkoutLog,
    addBodyMetric, getBodyMetrics, getLastBodyMetric, deleteBodyMetric,
    getSummary, getFormFields, getWorkoutFormFields, openAddMetric, openAddWorkout,
    selectDate, addMonth, goToday, setViewDate,
    getViewYear: function () { return viewYear; },
    getViewMonth: function () { return viewMonth; },
    getCurrentViewDate: function () { return viewDate || todayStr(); },
    get viewYear() { return viewYear; },
    get viewMonth() { return viewMonth; },
    get viewDate() { return viewDate; },
    todayWeekday, todayStr
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = KCBAPP;
})(typeof window !== 'undefined' ? window : globalThis);
