;(function (root) {
  const KCBAPP = root.KCBAPP || (root.KCBAPP = {});

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  async function getTodayProgress() {
    const tasks = await KCBAPP.store.queryByIndex('tasks', 'date', todayStr());
    const done = tasks.filter(function (t) { return t.status === '完成'; }).length;
    const plannedMinutes = tasks.reduce(function (s, t) { return s + (parseInt(t.minutes) || 0); }, 0);
    return { total: tasks.length, done: done, plannedMinutes: plannedMinutes };
  }

  function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return m + ' 分钟';
    if (m === 0) return h + ' 小时';
    return h + ' 小时 ' + m + ' 分钟';
  }

  async function getTodayTimeline() {
    const tasks = await KCBAPP.store.queryByIndex('tasks', 'date', todayStr());
    tasks.sort(function (a, b) { return (a.time || '').localeCompare(b.time || ''); });
    return tasks;
  }

  async function getNotes() {
    const notes = await KCBAPP.store.getAll('notes');
    return notes.sort(function (a, b) {
      const pa = a.pinned ? 1 : 0;
      const pb = b.pinned ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }

  async function pinNote(id) {
    const note = await KCBAPP.store.get('notes', id);
    if (note) {
      note.pinned = !note.pinned;
      await KCBAPP.store.update('notes', note);
    }
    return note;
  }

  async function deleteNote(id) {
    await KCBAPP.store.remove('notes', id);
  }

  const SUMMARY_SOURCES = [
    { key: 'schedule', label: '今日课程', fn: 'getSummary' },
    { key: 'fitness', label: '今日训练', fn: 'getSummary' },
    { key: 'diet', label: '今日饮食', fn: 'getSummary' },
    { key: 'media', label: '本周待发', fn: 'getSummary' },
    { key: 'dev', label: '开发工作', fn: 'getSummary' },
    { key: 'game', label: '游戏娱乐', fn: 'getSummary' }
  ];

  async function getSummaryCards() {
    const cards = {};
    for (let i = 0; i < SUMMARY_SOURCES.length; i++) {
      const s = SUMMARY_SOURCES[i];
      const mod = KCBAPP[s.key];
      if (mod && typeof mod[s.fn] === 'function') {
        try {
          cards[s.key] = { label: s.label, data: await mod[s.fn]() };
        } catch (e) {
          cards[s.key] = { label: s.label, data: null, error: true };
        }
      } else {
        cards[s.key] = { label: s.label, data: null };
      }
    }
    return cards;
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function render() {
    if (typeof document === 'undefined') return;
    const content = document.getElementById('content');
    if (!content) return;
    const progress = await getTodayProgress();
    const notes = await getNotes();
    const cards = await getSummaryCards();
    const timeline = await getTodayTimeline();
    const pct = progress.total > 0 ? Math.round(progress.done / progress.total * 100) : 0;
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const week = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];

    let html = '<div style="margin-bottom:20px;">';
    html += '<div style="font-size:26px;font-weight:600;margin-bottom:4px;font-family:var(--font-kai)">' + month + '月' + day + '日，从重点开始</div>';
    html += '<div style="font-size:12px;color:var(--color-text-tertiary);">今天的行动、提醒和工作生活状态都在这里。</div>';
    html += '</div>';

    html += '<div class="card" style="margin-bottom:20px;padding:16px;">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
    html += '<div><div style="font-size:11px;color:var(--color-text-tertiary);">今日进度</div><div style="font-size:24px;font-weight:600;">' + pct + '%</div></div>';
    html += '<div style="text-align:center;"><div style="font-size:11px;color:var(--color-text-tertiary);">已完成</div><div style="font-size:18px;font-weight:600;">' + progress.done + ' / ' + progress.total + '</div></div>';
    html += '<div style="text-align:right;"><div style="font-size:11px;color:var(--color-text-tertiary);">已安排</div><div style="font-size:18px;font-weight:600;">' + formatDuration(progress.plannedMinutes) + '</div></div>';
    html += '</div>';
    html += '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>';
    html += '</div>';

    html += '<div style="display:grid;grid-template-columns:1fr 280px;gap:16px;">';
    // left timeline
    html += '<div>';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
    html += '<div style="font-size:14px;font-weight:600;">今日时间线</div>';
    html += '<div style="font-size:11px;color:var(--color-text-tertiary);">有明确开始时间的事项</div>';
    html += '</div>';
    if (timeline.length === 0) {
      html += '<div style="color:var(--color-text-tertiary);font-size:11px;padding:12px 0;">暂无今日计划，去「今日计划」添加</div>';
    } else {
      html += '<div style="position:relative;padding-left:20px;">';
      html += '<div style="position:absolute;left:5px;top:6px;bottom:6px;width:2px;background:var(--color-border);"></div>';
      timeline.forEach(function (t) {
        const done = t.status === '完成';
        html += '<div style="position:relative;margin-bottom:14px;">';
        html += '<div style="position:absolute;left:-17px;top:4px;width:10px;height:10px;border-radius:50%;background:' + (done ? 'var(--green-500)' : 'var(--purple-500)') + ';border:2px solid var(--color-bg-primary);"></div>';
        html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;">';
        html += '<div style="flex:1;">';
        html += '<div style="font-size:12px;font-weight:500;' + (done ? 'text-decoration:line-through;color:var(--color-text-tertiary);' : '') + '">' + escapeHtml(t.title) + '</div>';
        html += '<div style="font-size:10px;color:var(--color-text-tertiary);margin-top:2px;">' + (t.note || t.source || '') + '</div>';
        html += '</div>';
        html += '<div style="text-align:right;margin-left:10px;">';
        html += '<div style="font-size:11px;color:var(--color-text-secondary);">' + (t.time || '—') + '</div>';
        if (t.minutes) html += '<div style="font-size:10px;color:var(--color-text-tertiary);">' + t.minutes + ' 分钟</div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';
    }
    html += '</div>';

    // right notes
    html += '<div>';
    html += '<div style="font-size:14px;font-weight:600;margin-bottom:12px;">快速备忘</div>';
    if (notes.length === 0) {
      html += '<div style="color:var(--color-text-tertiary);font-size:11px;padding:8px;">暂无备忘，点顶栏「+ 快速备忘」添加</div>';
    } else {
      notes.forEach(function (n, i) {
        const cls = i % 2 === 0 ? 'pink' : 'amber';
        html += '<div class="note-card ' + cls + '" style="margin-bottom:8px;">';
        html += '<div class="note-content">' + escapeHtml(n.content) + '</div>';
        html += '<div class="note-meta"><span>' + (n.pinned ? '置顶 · ' : '') + '备忘</span>';
        html += '<span class="note-actions">';
        html += '<button onclick="KCBAPP.home.pinNote(\'' + n.id + '\').then(KCBAPP.home.render)">' + (n.pinned ? '取消置顶' : '置顶') + '</button>';
        html += '<button onclick="KCBAPP.home.deleteNote(\'' + n.id + '\').then(KCBAPP.home.render)">删除</button>';
        html += '</span></div>';
        html += '</div>';
      });
    }
    html += '<div style="font-size:14px;font-weight:600;margin:16px 0 10px;">需要关注</div>';
    html += '<div style="font-size:11px;color:var(--color-text-tertiary);padding:8px;background:var(--color-bg-secondary);border-radius:6px;">到期、跟进与今日提醒</div>';
    html += '</div>';
    html += '</div>';

    html += '<div style="font-size:14px;font-weight:600;margin:20px 0 12px;">各模块动态</div>';
    html += '<div class="summary-grid">';
    SUMMARY_SOURCES.forEach(function (s) {
      const c = cards[s.key] || { label: s.label, data: null };
      html += '<div class="summary-card" onclick="KCBAPP.router.navigate(\'' + s.key + '\')">';
      html += '<div class="summary-label">' + c.label + '</div>';
      if (c.data) {
        html += '<div class="summary-main">' + escapeHtml(c.data.main || '—') + '</div>';
        html += '<div class="summary-sub">' + escapeHtml(c.data.sub || '') + '</div>';
        if (c.data.hint) html += '<div class="summary-hint">' + escapeHtml(c.data.hint || '') + '</div>';
      } else {
        html += '<div class="summary-main">—</div>';
        html += '<div class="summary-hint">点击进入</div>';
      }
      html += '</div>';
    });
    html += '</div>';

    content.innerHTML = html;
  }

  KCBAPP.home = { render, getTodayProgress, getTodayTimeline, formatDuration, getNotes, pinNote, deleteNote, getSummaryCards, todayStr };

  if (typeof module !== 'undefined' && module.exports) module.exports = KCBAPP;
})(typeof window !== 'undefined' ? window : globalThis);
