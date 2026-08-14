;(function (root) {
  const KCBAPP = root.KCBAPP || (root.KCBAPP = {});

  function storeNames() { return KCBAPP.db.STORES.map(function (s) { return s.name; }); }

  async function getDataOverview() {
    const result = {};
    const names = storeNames();
    for (let i = 0; i < names.length; i++) {
      result[names[i]] = await KCBAPP.store.count(names[i]);
    }
    return result;
  }

  async function exportData() {
    const data = {};
    const names = storeNames();
    for (let i = 0; i < names.length; i++) {
      data[names[i]] = await KCBAPP.store.getAll(names[i]);
    }
    return JSON.stringify({
      app: 'kcbapp',
      exportDate: new Date().toISOString(),
      version: KCBAPP.db.DB_VERSION,
      data: data
    }, null, 2);
  }

  async function importData(jsonStr) {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || !parsed.data) throw new Error('无效的备份文件：缺少 data 字段');
    const names = storeNames();
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      if (parsed.data[name]) {
        await KCBAPP.store.clear(name);
        for (let j = 0; j < parsed.data[name].length; j++) {
          await KCBAPP.store.add(name, parsed.data[name][j]);
        }
      }
    }
    return true;
  }

  async function clearStore(storeName) {
    await KCBAPP.store.clear(storeName);
  }

  async function clearAll() {
    const names = storeNames();
    for (let i = 0; i < names.length; i++) {
      await KCBAPP.store.clear(names[i]);
    }
  }

  async function downloadBackup() {
    if (typeof document === 'undefined') return;
    const json = await exportData();
    const d = new Date();
    const fname = 'kcbapp-backup-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '.json';
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fname; a.click();
    URL.revokeObjectURL(url);
  }

  function pickFile() {
    if (typeof document === 'undefined') return Promise.resolve(null);
    return new Promise(function (resolve) {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.json';
      input.onchange = function () {
        const file = input.files[0];
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = function () { resolve(reader.result); };
        reader.readAsText(file);
      };
      input.click();
    });
  }

  function escapeHtml(s) { if (s == null) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  async function render() {
    if (typeof document === 'undefined') return;
    const content = document.getElementById('content'); if (!content) return;
    const overview = await getDataOverview();
    let html = '<div style="font-size:14px;font-weight:500;margin-bottom:12px;">数据与设置</div>';
    html += '<div class="section-title">数据总览</div>';
    html += '<div class="card" style="margin-bottom:16px;">';
    Object.keys(overview).forEach(function (k) {
      html += '<div style="font-size:11px;color:var(--color-text-secondary);padding:2px 0;">' + k + ' · ' + overview[k] + ' 条</div>';
    });
    html += '</div>';
    html += '<div class="section-title">备份与迁移</div>';
    html += '<div class="card" style="margin-bottom:16px;">';
    html += '<button class="btn-primary" onclick="KCBAPP.settings.downloadBackup()">导出 JSON</button> ';
    html += '<button class="btn-outline" onclick="KCBAPP.settings.importFromPicker()">导入 JSON</button>';
    html += '<div style="font-size:10px;color:var(--color-text-tertiary);margin-top:8px;">换机或防丢，一键备份全部数据</div>';
    html += '</div>';
    html += '<div class="section-title">清空数据</div>';
    html += '<div class="card" style="border-color:var(--red-400);">';
    html += '<div style="font-size:12px;color:var(--red-600);font-weight:500;margin-bottom:8px;">危险操作</div>';
    html += '<button class="btn-outline" style="color:var(--red-600);border-color:var(--red-600);" onclick="KCBAPP.settings.confirmClearAll()">全部清空</button>';
    html += '<div style="font-size:10px;color:var(--color-text-tertiary);margin-top:8px;">操作前需二次确认，不可恢复。建议先导出。</div>';
    html += '</div>';
    content.innerHTML = html;
  }

  async function importFromPicker() {
    const text = await pickFile();
    if (!text) return;
    try {
      await importData(text);
      alert('导入成功');
      render();
    } catch (e) {
      alert('导入失败：' + e.message);
    }
  }

  async function confirmClearAll() {
    if (typeof root.confirm === 'undefined') return;
    if (!root.confirm('确定清空全部数据？此操作不可恢复！建议先导出。')) return;
    if (!root.confirm('再次确认：真的要清空全部数据吗？')) return;
    await clearAll();
    alert('已清空');
    render();
  }

  KCBAPP.settings = { render, getDataOverview, exportData, importData, clearStore, clearAll, downloadBackup, pickFile, importFromPicker, confirmClearAll, storeNames };

  if (typeof module !== 'undefined' && module.exports) module.exports = KCBAPP;
})(typeof window !== 'undefined' ? window : globalThis);
