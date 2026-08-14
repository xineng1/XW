;(function (root) {
  const KCBAPP = root.KCBAPP || (root.KCBAPP = {});

  const MODULES = [
    { key: 'home', name: '首页总览' },
    { key: 'today', name: '今日计划' },
    { key: 'media', name: '自媒体' },
    { key: 'dev', name: '开发工作' },
    { key: 'schedule', name: '课程表' },
    { key: 'fitness', name: '健身计划' },
    { key: 'diet', name: '饮食计划' },
    { key: 'game', name: '游戏娱乐' },
    { key: 'settings', name: '数据与设置' }
  ];

  let current = null;

  function getModules() { return MODULES.slice(); }
  function getCurrent() { return current; }

  function renderSidebar() {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('sidebar');
    if (!el) return;
    el.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'sidebar-title';
    title.textContent = '栖梧 · 空间';
    el.appendChild(title);
    MODULES.forEach(function (m) {
      const item = document.createElement('div');
      item.className = 'nav-item' + (current === m.key ? ' active' : '');
      item.textContent = m.name;
      item.dataset.key = m.key;
      item.addEventListener('click', function () { navigate(m.key); });
      el.appendChild(item);
    });
  }

  function formatDate(d) {
    const weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + weeks[d.getDay()];
  }

  function renderTopbar() {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('topbar');
    if (!el) return;
    el.innerHTML =
      '<div class="topbar-date">' + formatDate(new Date()) + '</div>' +
      '<div class="topbar-right">' +
      '<button class="memo-btn" id="memoBtn">+ 快速备忘</button>' +
      '</div>';
    const btn = document.getElementById('memoBtn');
    if (btn) btn.addEventListener('click', quickMemo);
  }

  async function saveQuickMemo(data) {
    if (!data || !data.content || !data.content.trim()) return;
    const note = {
      id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      content: data.content.trim(),
      category: data.category || '',
      createdAt: new Date().toISOString(),
      pinned: false
    };
    if (KCBAPP.store) {
      await KCBAPP.store.add('notes', note);
    }
    if (current === 'home' && KCBAPP.home && KCBAPP.home.render) {
      KCBAPP.home.render();
    }
  }

  function quickMemo() {
    if (typeof document === 'undefined') return;
    KCBAPP.modal.open({
      title: '快速备忘',
      fields: [
        { name: 'content', label: '备忘内容', type: 'textarea', required: true },
        { name: 'category', label: '分类', type: 'select', options: ['待办', '想法', '提醒', '其他'] }
      ],
      onSave: saveQuickMemo
    });
  }

  function navigate(key) {
    current = key;
    if (typeof document === 'undefined') return;
    const items = document.querySelectorAll('.nav-item');
    items.forEach(function (it) {
      if (it.dataset.key === key) it.classList.add('active');
      else it.classList.remove('active');
    });
    const content = document.getElementById('content');
    if (!content) return;
    const mod = KCBAPP[key];
    if (mod && typeof mod.render === 'function') {
      try { mod.render(); } catch (e) { console.error('render error', e); }
    } else {
      const m = MODULES.find(function (x) { return x.key === key; });
      content.innerHTML = '<div class="placeholder">' + (m ? m.name : '') + '（开发中）</div>';
    }
  }

  KCBAPP.router = { getModules, getCurrent, renderSidebar, renderTopbar, navigate, quickMemo, saveQuickMemo, formatDate };

  if (typeof module !== 'undefined' && module.exports) module.exports = KCBAPP;
})(typeof window !== 'undefined' ? window : globalThis);
