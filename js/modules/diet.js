;(function (root) {
  const KCBAPP = root.KCBAPP || (root.KCBAPP = {});

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
  // 兼容旧接口：null 回到今天
  function setViewDate(d) { viewDate = d || todayStr(); render(); }
  function shiftDay(delta) {
    const base = viewDate || todayStr();
    const parts = base.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]) + delta);
    viewDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    viewYear = d.getFullYear(); viewMonth = d.getMonth();
    render();
  }

  async function addMeal(data) {
    const m = { id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), date: data.date || todayStr(), mealType: data.mealType, planType: data.planType || '实际', food: data.food || '', calories: data.calories || 0, note: data.note || '', createdAt: new Date().toISOString() };
    await KCBAPP.store.add('meals', m);
    return m;
  }
  async function getMealsByDate(date) { return await KCBAPP.store.queryByIndex('meals', 'date', date || todayStr()); }
  async function getTodayMeals() { return await getMealsByDate(todayStr()); }
  async function deleteMeal(id) { await KCBAPP.store.remove('meals', id); }
  async function getAllMeals() { return await KCBAPP.store.getAll('meals'); }

  async function getWater(date) { return await KCBAPP.store.get('water', date || todayStr()); }
  async function setWater(date, cups) { await KCBAPP.store.update('water', { date: date || todayStr(), cups: cups, updatedAt: new Date().toISOString() }); }
  async function addWaterCup() {
    const date = viewDate || todayStr();
    const w = await getWater(date);
    const cups = (w && w.cups || 0) + 1;
    await setWater(date, cups);
    return cups;
  }

  async function addRestriction(content) {
    const r = { id: 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), content: content, createdAt: new Date().toISOString() };
    await KCBAPP.store.add('restrictions', r);
    return r;
  }
  async function getRestrictions() { return await KCBAPP.store.getAll('restrictions'); }

  async function getDatesWithMealsRecords() {
    const all = await KCBAPP.store.getAll('meals');
    const set = {};
    all.forEach(function (m) { if (m.date) set[m.date] = true; });
    return Object.keys(set);
  }

  async function getSummary() {
    const meals = await getTodayMeals();
    const water = await getWater();
    const types = ['早', '午', '晚', '加餐'];
    const have = meals.map(function (m) { return m.mealType; });
    const missing = types.filter(function (t) { return have.indexOf(t) < 0; });
    return {
      main: meals.length + ' / 4 餐',
      sub: '饮水 ' + (water ? water.cups : 0) + ' 杯',
      hint: missing.length ? '缺 ' + missing.join('/') : '今日已记录全'
    };
  }

  function escapeHtml(s) { if (s == null) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function mealPill(m) {
    const isPlan = m.planType === '计划';
    const bg = isPlan ? 'var(--amber-50)' : 'var(--green-50)';
    const border = isPlan ? 'var(--amber-200)' : 'var(--green-200)';
    const color = isPlan ? 'var(--amber-800)' : 'var(--green-800)';
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 5px;border-radius:4px;background:' + bg + ';border:0.5px solid ' + border + ';margin-bottom:2px;font-size:9px;color:' + color + ';">' +
      '<span>' + escapeHtml(m.planType || '实际') + ' · ' + escapeHtml(m.mealType) + '</span>' +
      '<span>' + (m.calories || 0) + 'kcal</span></div>';
  }

  async function render() {
    if (typeof document === 'undefined') return;
    const content = document.getElementById('content'); if (!content) return;
    const all = await getAllMeals();
    const selD = viewDate || todayStr();
    let html = '<div style="margin-bottom:20px;">';
    html += '<div style="font-size:22px;font-weight:600;margin-bottom:4px;font-family:var(--font-kai)">饮食日历</div>';
    html += '<div style="font-size:12px;color:var(--color-text-tertiary);">按天查看计划餐食、实际摄入和已记录热量。</div>';
    html += '</div>';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><div style="display:flex;align-items:center;gap:8px;"><button class="btn-outline" onclick="KCBAPP.diet.addMonth(-1)">‹</button><span style="font-size:14px;font-weight:500;">' + viewYear + '年' + (viewMonth + 1) + '月</span><button class="btn-outline" onclick="KCBAPP.diet.addMonth(1)">›</button><button class="btn-outline" onclick="KCBAPP.diet.goToday()">回到今天</button></div><button class="btn-primary" onclick="KCBAPP.diet.openAddMeal()">+ 记录饮食</button></div>';
    html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:16px;">';
    ['日', '一', '二', '三', '四', '五', '六'].forEach(function (w) {
      html += '<div style="text-align:center;font-size:10px;color:var(--color-text-tertiary);padding:4px;">周' + w + '</div>';
    });
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) html += '<div></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = viewYear + '-' + String(viewMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const dayMeals = all.filter(function (m) { return m.date === ds; });
      const isSel = ds === selD;
      const isToday = ds === todayStr();
      const totalCal = dayMeals.reduce(function (s, m) { return s + (m.calories || 0); }, 0);
      html += '<div onclick="KCBAPP.diet.selectDate(\'' + ds + '\')" style="min-height:90px;padding:6px;border-radius:8px;cursor:pointer;border:0.5px solid ' + (isSel ? 'var(--purple-600)' : 'var(--color-border)') + ';background:' + (isSel ? 'var(--purple-50)' : 'var(--color-bg-primary)') + ';">';
      html += '<div style="font-size:11px;font-weight:500;color:' + (isToday ? 'var(--purple-600)' : 'var(--color-text-primary)') + ';margin-bottom:4px;">' + d + (isToday ? ' · 今天' : '') + '</div>';
      dayMeals.slice(0, 3).forEach(function (m) { html += mealPill(m); });
      if (dayMeals.length > 3) html += '<div style="font-size:9px;color:var(--color-text-tertiary);">+' + (dayMeals.length - 3) + ' 项</div>';
      if (totalCal) html += '<div style="font-size:9px;color:var(--teal-600);margin-top:2px;font-weight:500;">合计 ' + totalCal + 'kcal</div>';
      html += '</div>';
    }
    html += '</div>';
    const selMeals = all.filter(function (m) { return m.date === selD; });
    const water = await getWater(selD);
    const cups = water ? water.cups : 0;
    const totalCal = selMeals.reduce(function (s, m) { return s + (m.calories || 0); }, 0);
    html += '<div class="section-title">' + selD + (selD === todayStr() ? ' (今天)' : '') + ' · 合计 ' + totalCal + ' kcal</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px;">';
    ['早', '午', '晚', '加餐'].forEach(function (mt) {
      const m = selMeals.find(function (x) { return x.mealType === mt; });
      html += '<div class="card" style="min-height:90px;">';
      if (m) {
        html += '<div style="display:flex;justify-content:space-between;"><div style="font-size:10px;">' + mealPill(m) + '</div><button class="note-actions" style="color:var(--red-600);" onclick="KCBAPP.diet.deleteMeal(\'' + m.id + '\').then(KCBAPP.diet.render)">×</button></div>';
        html += '<div style="font-size:13px;margin-top:6px;font-weight:500;">' + escapeHtml(m.food) + '</div>';
        html += '<div style="font-size:10px;color:var(--color-text-secondary);margin-top:2px;">' + (m.calories || 0) + ' kcal</div>';
        if (m.note) html += '<div style="font-size:9px;color:var(--color-text-tertiary);margin-top:4px;">' + escapeHtml(m.note) + '</div>';
      } else {
        html += '<div style="font-size:11px;color:var(--color-text-tertiary);">' + mt + '</div><div style="font-size:12px;margin-top:8px;color:var(--color-text-tertiary);">—</div>';
      }
      html += '</div>';
    });
    html += '</div>';
    html += '<div class="section-title">饮水 · ' + cups + ' 杯</div>';
    html += '<div style="display:flex;gap:6px;align-items:center;"><div style="display:flex;gap:6px;">';
    for (let i = 0; i < 8; i++) {
      html += '<div onclick="KCBAPP.diet.addWaterCup().then(KCBAPP.diet.render)" style="width:18px;height:18px;border-radius:50%;cursor:pointer;' + (i < cups ? 'background:var(--blue-400);' : 'border:1px solid var(--color-border);') + '"></div>';
    }
    html += '</div></div>';
    content.innerHTML = html;
  }

  function getFormFields() {
    return [
      { name: 'mealType', label: '餐次', type: 'select', required: true, options: ['早', '午', '晚', '加餐'] },
      { name: 'planType', label: '类型', type: 'select', required: true, options: ['计划', '实际'] },
      { name: 'food', label: '食物', required: true },
      { name: 'calories', label: '热量', type: 'number' },
      { name: 'date', label: '日期', type: 'date' },
      { name: 'note', label: '备注', type: 'textarea' }
    ];
  }

  function openAddMeal() {
    if (typeof document === 'undefined') return;
    KCBAPP.modal.open({
      title: '记录饮食',
      fields: getFormFields(),
      initialData: { date: viewDate || todayStr(), mealType: '早' },
      onSave: async function (data) { await addMeal(data); render(); }
    });
  }

  KCBAPP.diet = {
    render, addMeal, getMealsByDate, getTodayMeals, getAllMeals, deleteMeal,
    getWater, setWater, addWaterCup, addRestriction, getRestrictions,
    getDatesWithMealsRecords,
    selectDate, addMonth, goToday, setViewDate, shiftDay,
    getViewYear: function () { return viewYear; },
    getViewMonth: function () { return viewMonth; },
    getCurrentViewDate: function () { return viewDate || todayStr(); },
    get viewYear() { return viewYear; },
    get viewMonth() { return viewMonth; },
    get viewDate() { return viewDate; },
    getSummary, getFormFields, openAddMeal, todayStr
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = KCBAPP;
})(typeof window !== 'undefined' ? window : globalThis);
