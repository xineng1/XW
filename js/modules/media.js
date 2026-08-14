;(function (root) {
  const KCBAPP = root.KCBAPP || (root.KCBAPP = {});

  function todayStr() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  async function addTopic(data) {
    const t = {
      id: 'tp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title: data.title, desc: data.desc || '',
      status: data.status || '灵感', platform: data.platform || '',
      planDate: data.planDate || '', publishDate: data.publishDate || '',
      views: data.views || 0, likes: data.likes || 0, saves: data.saves || 0, comments: data.comments || 0,
      createdAt: new Date().toISOString()
    };
    await KCBAPP.store.add('topics', t);
    return t;
  }
  async function getTopics() { return await KCBAPP.store.getAll('topics'); }
  async function getTopicsByStatus(s) { return await KCBAPP.store.queryByIndex('topics', 'status', s); }
  async function updateTopicStatus(id, status) {
    const t = await KCBAPP.store.get('topics', id);
    if (t) { t.status = status; if (status === '已发布' && !t.publishDate) t.publishDate = todayStr(); await KCBAPP.store.update('topics', t); }
    return t;
  }
  async function deleteTopic(id) { await KCBAPP.store.remove('topics', id); }

  function isThisWeek(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr); const now = new Date();
    const start = new Date(now); start.setDate(now.getDate() - now.getDay() + 1);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return d >= start && d <= end;
  }

  async function getWeekSchedule() {
    const all = await getTopics();
    return all.filter(function (t) { return t.planDate && isThisWeek(t.planDate) && t.status !== '已发布'; });
  }

  async function getStats() {
    const all = await getTopics();
    const now = new Date();
    const ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    return {
      producing: all.filter(function (t) { return t.status === '待策划' || t.status === '制作中'; }).length,
      waiting: all.filter(function (t) { return t.status === '待发布'; }).length,
      published: all.filter(function (t) { return t.status === '已发布' && (t.publishDate || '').indexOf(ym) === 0; }).length
    };
  }

  async function getBoardData() {
    const all = await getTopics();
    const board = { '灵感': [], '待策划': [], '制作中': [], '待发布': [], '已发布': [] };
    all.forEach(function (t) { if (board[t.status]) board[t.status].push(t); });
    return board;
  }

  async function getSummary() {
    const all = await getTopics();
    if (all.length === 0) return null;
    const stats = await getStats();
    return {
      main: (stats.producing + stats.waiting) + ' 条进行中',
      sub: stats.waiting + ' 条待发布',
      hint: all.length + ' 条内容'
    };
  }

  async function getPublishedStats(limit) {
    const published = await getTopicsByStatus('已发布');
    const items = published.map(function (t) { return { id: t.id, title: t.title, views: t.views || 0, likes: t.likes || 0, comments: t.comments || 0, publishDate: t.publishDate || '' }; });
    items.sort(function (a, b) { return (a.publishDate || '').localeCompare(b.publishDate || ''); });
    const recent = limit ? items.slice(-limit) : items;
    const totalViews = items.reduce(function (s, i) { return s + i.views; }, 0);
    const totalLikes = items.reduce(function (s, i) { return s + i.likes; }, 0);
    const totalComments = items.reduce(function (s, i) { return s + i.comments; }, 0);
    const avgEngagement = totalViews > 0 ? (((totalLikes + totalComments) / totalViews) * 100).toFixed(1) : '0.0';
    const best = items.length ? items.reduce(function (best, it) { return (it.views > best.views ? it : best); }, items[0]) : null;
    return {
      totalViews: totalViews,
      totalLikes: totalLikes,
      totalComments: totalComments,
      avgEngagement: avgEngagement,
      best: best,
      items: items,
      recent: recent
    };
  }

  function renderChartSVG(items) {
    if (!items.length) return '<div style="color:var(--color-text-tertiary);font-size:11px;">暂无已发布内容</div>';
    const recent = items.slice(-12);
    const maxV = Math.max.apply(null, recent.map(function (i) { return i.views || 0; })) || 1;
    const maxL = Math.max.apply(null, recent.map(function (i) { return Math.max(i.likes || 0, i.comments || 0); })) || 1;
    const w = 100 / recent.length;
    const chartH = 50;
    const baseY = 55;
    let svg = '<svg viewBox="0 0 100 64" preserveAspectRatio="none" style="width:100%;height:140px;background:var(--color-bg-secondary);border-radius:8px;">';
    // grid lines
    [0.25, 0.5, 0.75].forEach(function (r) {
      const gy = baseY - chartH * r;
      svg += '<line x1="0" y1="' + gy + '" x2="100" y2="' + gy + '" stroke="var(--color-border)" stroke-width="0.2" />';
    });
    // bars (views)
    recent.forEach(function (it, i) {
      const h = ((it.views || 0) / maxV) * chartH;
      const x = i * w + w * 0.25;
      const bw = w * 0.5;
      const y = baseY - h;
      svg += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + h + '" rx="1" style="fill:var(--gold-400)" />';
      svg += '<text x="' + (x + bw / 2) + '" y="' + (y - 1) + '" text-anchor="middle" font-size="2.2" style="fill:var(--gold-800)">' + formatNumber(it.views || 0) + '</text>';
      svg += '<text x="' + (x + bw / 2) + '" y="62" text-anchor="middle" font-size="1.8" style="fill:var(--color-text-tertiary)">' + (it.publishDate || '').slice(5) + '</text>';
    });
    // line (likes)
    let pathL = '';
    recent.forEach(function (it, i) {
      const x = i * w + w * 0.5;
      const y = baseY - ((it.likes || 0) / maxL) * chartH;
      pathL += (i === 0 ? 'M' : 'L') + x + ' ' + y;
    });
    svg += '<path d="' + pathL + '" style="stroke:var(--cinnabar-500)" stroke-width="0.6" fill="none" />';
    // line (comments)
    let pathC = '';
    recent.forEach(function (it, i) {
      const x = i * w + w * 0.5;
      const y = baseY - ((it.comments || 0) / maxL) * chartH;
      pathC += (i === 0 ? 'M' : 'L') + x + ' ' + y;
    });
    svg += '<path d="' + pathC + '" style="stroke:var(--teal-400)" stroke-width="0.6" fill="none" />';
    // legend
    svg += '<rect x="76" y="4" width="2" height="2" style="fill:var(--gold-400)" /><text x="79" y="6" font-size="2" style="fill:var(--color-text-secondary)">播放</text>';
    svg += '<rect x="76" y="8" width="2" height="0.5" style="fill:var(--cinnabar-500)" /><text x="79" y="9.5" font-size="2" style="fill:var(--color-text-secondary)">点赞</text>';
    svg += '<rect x="76" y="12" width="2" height="0.5" style="fill:var(--teal-400)" /><text x="79" y="13.5" font-size="2" style="fill:var(--color-text-secondary)">评论</text>';
    svg += '</svg>';
    return svg;
  }

  function formatNumber(n) {
    if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  function escapeHtml(s) { if (s == null) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&lt;').replace(/>/g, '&gt;'); }

  async function render() {
    if (typeof document === 'undefined') return;
    const content = document.getElementById('content'); if (!content) return;
    const stats = await getStats();
    const board = await getBoardData();
    let html = '<div style="margin-bottom:20px;">';
    html += '<div style="font-size:22px;font-weight:600;margin-bottom:4px;font-family:var(--font-kai)">自媒体</div>';
    html += '<div style="font-size:12px;color:var(--color-text-tertiary);">从灵感、制作到发布，把内容放在真正的创作流程里。</div>';
    html += '</div>';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';
    html += '<div style="display:flex;gap:24px;">';
    html += '<div><span style="font-size:12px;color:var(--color-text-tertiary);">正在制作 </span><span style="font-size:18px;font-weight:600;">' + stats.producing + '</span></div>';
    html += '<div><span style="font-size:12px;color:var(--color-text-tertiary);">等待发布 </span><span style="font-size:18px;font-weight:600;">' + stats.waiting + '</span></div>';
    html += '<div><span style="font-size:12px;color:var(--color-text-tertiary);">本月已发布 </span><span style="font-size:18px;font-weight:600;">' + stats.published + '</span></div>';
    html += '</div>';
    html += '<button class="btn-primary" onclick="KCBAPP.media.openAdd()">+ 记录内容</button>';
    html += '</div>';

    const pubStats = await getPublishedStats(12);
    html += '<div class="card" style="margin-bottom:16px;">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
    html += '<div><div style="font-size:14px;font-weight:600;">发布后数据</div><div style="font-size:10px;color:var(--color-text-tertiary);">对比最近 12 条已发布内容的播放、点赞和评论</div></div>';
    html += '<div style="font-size:10px;color:var(--color-text-tertiary);">' + pubStats.items.length + ' 条有数据</div>';
    html += '</div>';
    html += '<div style="display:grid;grid-template-columns:260px 1fr;gap:20px;">';
    // left stats
    html += '<div style="display:flex;flex-direction:column;gap:12px;">';
    html += '<div style="background:var(--color-bg-secondary);border-radius:8px;padding:12px;">';
    html += '<div style="font-size:10px;color:var(--color-text-tertiary);">总播放 / 阅读</div>';
    html += '<div style="font-size:24px;font-weight:600;">' + formatNumber(pubStats.totalViews) + '</div>';
    html += '<div style="font-size:10px;color:var(--color-text-tertiary);">当前已记录内容合计</div>';
    html += '</div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">';
    html += '<div style="background:var(--color-bg-secondary);border-radius:8px;padding:10px;">';
    html += '<div style="font-size:10px;color:var(--color-text-tertiary);">平均互动率</div>';
    html += '<div style="font-size:18px;font-weight:600;">' + pubStats.avgEngagement + '%</div>';
    html += '<div style="font-size:9px;color:var(--color-text-tertiary);">(点赞+评论) ÷ 播放</div>';
    html += '</div>';
    html += '<div style="background:var(--color-bg-secondary);border-radius:8px;padding:10px;">';
    html += '<div style="font-size:10px;color:var(--color-text-tertiary);">最佳表现</div>';
    html += '<div style="font-size:11px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (pubStats.best ? escapeHtml(pubStats.best.title) : '-') + '</div>';
    html += '<div style="font-size:9px;color:var(--color-text-tertiary);">' + (pubStats.best ? formatNumber(pubStats.best.views) + ' 次播放' : '') + '</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    // right chart
    html += '<div>' + renderChartSVG(pubStats.items) + '</div>';
    html += '</div>';
    html += '</div>';

    html += '<div style="font-size:11px;color:var(--color-text-tertiary);margin-bottom:8px;">拖拽卡片到任意栏可改变制作阶段</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;">';
    Object.keys(board).forEach(function (status) {
      html += '<div style="background:var(--color-bg-secondary);border-radius:8px;padding:10px;min-height:220px;" ondragover="event.preventDefault()" ondrop="KCBAPP.media.dropCard(event,\'' + status + '\')">';
      html += '<div style="font-size:11px;font-weight:500;color:var(--color-text-secondary);margin-bottom:8px;">' + status + ' · ' + board[status].length + '</div>';
      board[status].forEach(function (t) {
        html += '<div draggable="true" ondragstart="KCBAPP.media.dragCard(event,\'' + t.id + '\')" style="background:var(--color-bg-primary);border:0.5px solid var(--color-border);border-radius:6px;padding:8px;margin-bottom:6px;cursor:move;">';
        html += '<div style="font-size:11px;font-weight:500;">' + escapeHtml(t.title) + '</div>';
        if (t.platform) html += '<div style="font-size:9px;color:var(--color-text-tertiary);">' + escapeHtml(t.platform) + '</div>';
        if (t.desc) html += '<div style="font-size:9px;color:var(--color-text-tertiary);margin-top:2px;">' + escapeHtml(t.desc) + '</div>';
        html += '</div>';
      });
      html += '</div>';
    });
    html += '</div>';
    content.innerHTML = html;
  }

  function dragCard(e, id) { if (e && e.dataTransfer) e.dataTransfer.setData('text', id); }
  function dropCard(e, status) {
    if (!e) return Promise.resolve();
    if (e.preventDefault) e.preventDefault();
    const id = e.dataTransfer ? e.dataTransfer.getData('text') : null;
    if (id) return updateTopicStatus(id, status).then(function () { return render(); });
    return Promise.resolve();
  }

  function getFormFields() {
    return [
      { name: 'title', label: '内容标题', required: true },
      { name: 'platform', label: '平台' },
      { name: 'format', label: '内容形式' },
      { name: 'status', label: '制作阶段', type: 'select', required: true, options: ['灵感', '待策划', '制作中', '待发布', '已发布'] },
      { name: 'planDate', label: '计划发布日期', type: 'date' },
      { name: 'publishDate', label: '实际发布日期', type: 'date' },
      { name: 'desc', label: '文案与内容笔记', type: 'textarea' },
      { name: 'assets', label: '素材位置' },
      { name: 'link', label: '发布链接' },
      { name: 'views', label: '播放/阅读', type: 'number' },
      { name: 'likes', label: '点赞', type: 'number' },
      { name: 'comments', label: '评论', type: 'number' }
    ];
  }

  function openAdd() {
    if (typeof document === 'undefined') return;
    KCBAPP.modal.open({
      title: '记录内容',
      fields: getFormFields(),
      initialData: { status: '灵感' },
      onSave: async function (data) { await addTopic(data); render(); }
    });
  }

  KCBAPP.media = { render, addTopic, getTopics, getTopicsByStatus, updateTopicStatus, deleteTopic, getWeekSchedule, getStats, getBoardData, getPublishedStats, renderChartSVG, formatNumber, getSummary, getFormFields, openAdd, dragCard, dropCard, isThisWeek };
  if (typeof module !== 'undefined' && module.exports) module.exports = KCBAPP;
})(typeof window !== 'undefined' ? window : globalThis);
