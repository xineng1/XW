;(function (root) {
  const KCBAPP = root.KCBAPP || (root.KCBAPP = {});

  function todayStr() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  async function addGame(data) {
    const g = {
      id: 'g_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      name: data.name, status: data.status || '想玩',
      platform: data.platform || '',
      progress: data.progress || '',
      nextGoal: data.nextGoal || '',
      weekHours: data.weekHours || 0, totalHours: data.totalHours || 0,
      rating: data.rating || 0, note: data.note || '',
      createdAt: new Date().toISOString()
    };
    await KCBAPP.store.add('games', g);
    return g;
  }
  async function getGames() { return await KCBAPP.store.getAll('games'); }
  async function getGamesByStatus(s) { return await KCBAPP.store.queryByIndex('games', 'status', s); }
  async function updateGameStatus(id, status) {
    const g = await KCBAPP.store.get('games', id);
    if (g) { g.status = status; await KCBAPP.store.update('games', g); }
    return g;
  }
  async function deleteGame(id) { await KCBAPP.store.remove('games', id); }
  async function addHours(gameId, hours) {
    const g = await KCBAPP.store.get('games', gameId);
    if (!g) return null;
    g.weekHours = (g.weekHours || 0) + hours;
    g.totalHours = (g.totalHours || 0) + hours;
    await KCBAPP.store.update('games', g);
    return g;
  }

  async function addEntertainment(data) {
    const e = {
      id: 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      date: data.date || todayStr(), type: data.type, content: data.content,
      duration: data.duration || 0, note: data.note || '',
      createdAt: new Date().toISOString()
    };
    await KCBAPP.store.add('entertainment', e);
    return e;
  }
  async function getEntertainment() { return await KCBAPP.store.getAll('entertainment'); }
  async function deleteEntertainment(id) { await KCBAPP.store.remove('entertainment', id); }

  async function getPlayingSummary() {
    const playing = await getGamesByStatus('正在进行');
    const want = await getGamesByStatus('想玩');
    if (playing.length === 0 && want.length === 0) return null;
    const g = playing[0];
    return {
      main: g ? g.name + ' · 正在进行' : '无正在进行',
      sub: g ? '本周 ' + g.weekHours + 'h · 总 ' + g.totalHours + 'h' : '',
      hint: want.length + ' 款想玩'
    };
  }

  let currentFilter = '全部';
  function setFilter(f) { currentFilter = f; render(); }

  function escapeHtml(s) { if (s == null) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function statusTag(status) {
    const map = { '正在进行': 'tag-purple', '想玩': 'tag-amber', '暂停': 'tag-gray', '已完成': 'tag-teal' };
    return '<span class="tag ' + (map[status] || 'tag-gray') + '">' + escapeHtml(status) + '</span>';
  }

  async function render() {
    if (typeof document === 'undefined') return;
    const content = document.getElementById('content'); if (!content) return;
    const games = await getGames();
    const ents = await getEntertainment();
    ents.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    const filtered = currentFilter === '全部' ? games : games.filter(function (g) { return g.status === currentFilter; });

    let html = '<div style="margin-bottom:20px;">';
    html += '<div style="font-size:22px;font-weight:600;margin-bottom:4px;font-family:var(--font-kai)">游戏娱乐</div>';
    html += '<div style="font-size:12px;color:var(--color-text-tertiary);">记录游戏进度、时长和最近的娱乐活动。</div>';
    html += '</div>';

    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';
    html += '<div style="display:flex;gap:8px;">';
    ['全部', '正在进行', '想玩', '暂停', '已完成'].forEach(function (f) {
      const active = f === currentFilter;
      html += '<button onclick="KCBAPP.game.setFilter(\'' + f + '\')" style="padding:5px 12px;border-radius:20px;border:1px solid ' + (active ? 'var(--purple-600)' : 'var(--color-border)') + ';background:' + (active ? 'var(--purple-600)' : 'var(--color-bg-primary)') + ';color:' + (active ? '#fff' : 'var(--color-text-secondary)') + ';font-size:11px;cursor:pointer;">' + f + '</button>';
    });
    html += '</div>';
    html += '<div><button class="btn-outline" style="margin-right:8px;" onclick="KCBAPP.game.openAddEntertainment()">+ 娱乐打卡</button><button class="btn-primary" onclick="KCBAPP.game.openAdd()">+ 添加游戏</button></div>';
    html += '</div>';

    html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:20px;">';
    if (filtered.length === 0) html += '<div style="grid-column:1/-1;color:var(--color-text-tertiary);font-size:11px;padding:12px;">该分类下暂无游戏</div>';
    filtered.forEach(function (g) {
      html += '<div class="card" style="display:flex;gap:14px;padding:14px;">';
      // cover placeholder
      html += '<div style="width:72px;height:72px;border-radius:10px;background:var(--color-bg-secondary);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:28px;">🎮</div>';
      html += '<div style="flex:1;min-width:0;">';
      html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">';
      html += '<div style="font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + escapeHtml(g.name) + '">' + escapeHtml(g.name) + '</div>';
      html += statusTag(g.status);
      html += '</div>';
      if (g.platform) html += '<div style="font-size:10px;color:var(--color-text-tertiary);margin-top:2px;">' + escapeHtml(g.platform) + '</div>';
      if (g.progress) html += '<div style="font-size:11px;color:var(--color-text-secondary);margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(g.progress) + '</div>';
      if (g.nextGoal) html += '<div style="font-size:10px;color:var(--color-text-tertiary);margin-top:4px;">下次目标：' + escapeHtml(g.nextGoal) + '</div>';
      html += '<div style="display:flex;align-items:center;gap:10px;margin-top:8px;font-size:10px;color:var(--color-text-secondary);">';
      html += '<span>本周 ' + (g.weekHours || 0) + 'h</span>';
      html += '<span>总 ' + (g.totalHours || 0) + 'h</span>';
      if (g.rating) html += '<span>' + '★'.repeat(parseInt(g.rating)) + '</span>';
      html += '</div>';
      html += '<div style="display:flex;gap:8px;margin-top:10px;">';
      html += '<button class="btn-primary" style="font-size:10px;padding:4px 10px;" onclick="KCBAPP.game.openAddHours(\'' + g.id + '\')">▶ 开始游玩</button>';
      html += '<button class="btn-outline" style="font-size:10px;padding:4px 10px;" onclick="KCBAPP.game.deleteGame(\'' + g.id + '\').then(KCBAPP.game.render)">删除</button>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';

    html += '<div class="card" style="padding:14px;">';
    html += '<div style="font-size:13px;font-weight:600;margin-bottom:10px;">最近游玩记录</div>';
    html += '<div style="font-size:10px;color:var(--color-text-tertiary);margin-bottom:10px;">只记录进度和时间，不评价是否高效</div>';
    if (ents.length === 0) html += '<div style="color:var(--color-text-tertiary);font-size:11px;padding:4px 0;">暂无打卡</div>';
    ents.slice(0, 10).forEach(function (e) {
      html += '<div class="task-item" style="padding:8px 0;border-bottom:0.5px solid var(--color-border);"><div style="flex:1;"><div style="font-size:12px;font-weight:500;">' + escapeHtml(e.type) + ' · ' + escapeHtml(e.content) + '</div><div style="font-size:10px;color:var(--color-text-tertiary);margin-top:2px;">' + escapeHtml(e.date) + (e.duration ? ' · ' + e.duration + '分钟' : '') + (e.note ? ' · ' + escapeHtml(e.note) : '') + '</div></div><button class="note-actions" style="color:var(--red-600);" onclick="KCBAPP.game.deleteEntertainment(\'' + e.id + '\').then(KCBAPP.game.render)">删除</button></div>';
    });
    html += '</div>';
    content.innerHTML = html;
  }

  function getFormFields() {
    return [
      { name: 'name', label: '游戏名', required: true },
      { name: 'platform', label: '平台' },
      { name: 'status', label: '状态', type: 'select', required: true, options: ['正在进行', '想玩', '暂停', '已完成'] },
      { name: 'progress', label: '当前进度', type: 'textarea' },
      { name: 'nextGoal', label: '下一次目标', type: 'textarea' },
      { name: 'weekHours', label: '本周时长(h)', type: 'number' },
      { name: 'totalHours', label: '总时长(h)', type: 'number' },
      { name: 'rating', label: '评分', type: 'select', options: ['', '1', '2', '3', '4', '5'] },
      { name: 'note', label: '备注', type: 'textarea' }
    ];
  }
  function getEntertainmentFormFields() {
    return [
      { name: 'type', label: '类型', type: 'select', required: true, options: ['看剧', '看电影', '看小说', '追番', '听音乐', '其他'] },
      { name: 'content', label: '内容', required: true },
      { name: 'duration', label: '时长(分钟)', type: 'number' },
      { name: 'date', label: '日期', type: 'date' },
      { name: 'note', label: '备注', type: 'textarea' }
    ];
  }

  function openAdd() {
    if (typeof document === 'undefined') return;
    KCBAPP.modal.open({
      title: '添加游戏', fields: getFormFields(), initialData: { status: '想玩' },
      onSave: async function (data) { await addGame(data); render(); }
    });
  }
  function openAddHours(gameId) {
    if (typeof document === 'undefined') return;
    KCBAPP.modal.open({
      title: '增加游戏时长',
      fields: [{ name: 'hours', label: '时长(小时)', type: 'number', required: true }],
      onSave: async function (data) { await addHours(gameId, parseFloat(data.hours) || 0); render(); }
    });
  }
  function openAddEntertainment() {
    if (typeof document === 'undefined') return;
    KCBAPP.modal.open({
      title: '娱乐打卡', fields: getEntertainmentFormFields(), initialData: { date: todayStr(), type: '看剧' },
      onSave: async function (data) { await addEntertainment(data); render(); }
    });
  }

  KCBAPP.game = {
    render, addGame, getGames, getGamesByStatus, updateGameStatus, deleteGame, addHours,
    addEntertainment, getEntertainment, deleteEntertainment,
    getPlayingSummary, getSummary: getPlayingSummary,
    setFilter,
    getFormFields, getEntertainmentFormFields, openAdd, openAddHours, openAddEntertainment, todayStr
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = KCBAPP;
})(typeof window !== 'undefined' ? window : globalThis);
