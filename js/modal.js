;(function (root) {
  const KCBAPP = root.KCBAPP || (root.KCBAPP = {});

  function buildForm(fields) {
    return fields.map(function (f) {
      return {
        name: f.name,
        label: f.label,
        type: f.type || 'text',
        required: !!f.required,
        options: f.options || null,
        value: f.value != null ? f.value : ''
      };
    });
  }

  function validateForm(data, fields) {
    const errors = [];
    fields.forEach(function (f) {
      if (f.required) {
        const v = data[f.name];
        if (v == null || v === '' || (typeof v === 'string' && v.trim() === '')) {
          errors.push(f.label + ' 必填');
        }
      }
    });
    return errors;
  }

  function collectForm(formEl) {
    const data = {};
    formEl.querySelectorAll('[data-field]').forEach(function (el) {
      const name = el.dataset.field;
      const type = el.dataset.type;
      let v = el.value;
      if (type === 'number') v = v === '' ? 0 : parseFloat(v);
      data[name] = v;
    });
    return data;
  }

  function open(config) {
    if (typeof document === 'undefined') return;
    const fields = buildForm(config.fields);
    const initial = config.initialData || {};

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const card = document.createElement('div');
    card.className = 'modal-card';

    const title = document.createElement('div');
    title.className = 'modal-title';
    title.textContent = config.title || '编辑';
    card.appendChild(title);

    const form = document.createElement('div');
    form.className = 'modal-form';
    fields.forEach(function (f) {
      const wrap = document.createElement('div');
      wrap.className = 'modal-field';
      const label = document.createElement('label');
      label.className = 'modal-label';
      label.textContent = f.label + (f.required ? ' *' : '');
      wrap.appendChild(label);
      let input;
      if (f.type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = 3;
      } else if (f.type === 'select') {
        input = document.createElement('select');
        const emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = '请选择';
        input.appendChild(emptyOpt);
        (f.options || []).forEach(function (opt) {
          const o = document.createElement('option');
          o.value = opt; o.textContent = opt;
          input.appendChild(o);
        });
      } else {
        input = document.createElement('input');
        input.type = f.type;
      }
      input.dataset.field = f.name;
      input.dataset.type = f.type;
      input.value = initial[f.name] != null ? initial[f.name] : '';
      wrap.appendChild(input);
      form.appendChild(wrap);
    });
    card.appendChild(form);

    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-outline';
    cancelBtn.textContent = '取消';
    cancelBtn.onclick = function () { close(); };
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-primary';
    saveBtn.textContent = '保存';
    saveBtn.onclick = function () {
      const data = collectForm(form);
      const errors = validateForm(data, config.fields);
      if (errors.length) {
        root.alert(errors.join('\n'));
        return;
      }
      close();
      if (config.onSave) config.onSave(data);
    };
    actions.appendChild(cancelBtn);
    if (config.onDelete) {
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-outline';
      delBtn.style.cssText = 'color:var(--red-600);border-color:var(--red-600);';
      delBtn.textContent = '删除';
      delBtn.onclick = function () { close(); config.onDelete(); };
      actions.appendChild(delBtn);
    }
    actions.appendChild(saveBtn);
    card.appendChild(actions);

    overlay.appendChild(card);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
  }

  function close() {
    if (typeof document === 'undefined') return;
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) overlay.remove();
  }

  KCBAPP.modal = { buildForm, validateForm, collectForm, open, close };

  if (typeof module !== 'undefined' && module.exports) module.exports = KCBAPP;
})(typeof window !== 'undefined' ? window : globalThis);
