;(function (root) {
  const KCBAPP = root.KCBAPP || (root.KCBAPP = {});

  const SUPABASE_URL = 'https://dnauyfxwnbgaapkfpezu.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuYXV5Znh3bmJnYWFwa2ZwZXp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4ODY4NzQsImV4cCI6MjEwMjQ2Mjg3NH0.2gBzDrA6Aao7IqeqqYLAccUdRklF0QbZqs-jl4mlbNI';

  let client = null;

  function ensureClient() {
    if (!root.supabase) throw new Error('Supabase 客户端未加载，请检查网络');
    if (!client) client = root.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return client;
  }

  // 页面加载即创建 client，Supabase 会自动从 localStorage 恢复会话
  try { ensureClient(); } catch (e) { console.warn('[sync] client init deferred:', e.message); }

  async function currentUser() {
    if (!client) return null;
    try {
      // getSession 读取本地存储，无网络请求，速度快，适合每次写操作判断
      const { data, error } = await client.auth.getSession();
      if (error) return null;
      return data && data.session ? data.session.user : null;
    } catch (e) { return null; }
  }

  async function signUp(email, password) {
    const c = ensureClient();
    const { data, error } = await c.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.session) throw new Error('注册成功但未建立会话：请确认 Supabase 的 Confirm email 已关闭，或去邮箱点确认链接后再登录');
    return data;
  }

  async function signIn(email, password) {
    const c = ensureClient();
    const { data, error } = await c.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    if (client) { await client.auth.signOut(); }
  }

  async function isSignedIn() { return !!(await currentUser()); }

  async function push(storeName, id, op, data) {
    const user = await currentUser();
    if (!user) return;
    const c = ensureClient();
    try {
      if (op === 'remove') {
        await c.from('records').delete().eq('store', storeName).eq('id', String(id));
      } else {
        await c.from('records').upsert(
          { id: String(id), store: storeName, data: data, user_id: user.id, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,store,id' }
        );
      }
    } catch (e) { console.warn('[sync] push failed', e); }
  }

  async function pullAll() {
    const user = await currentUser();
    if (!user) return;
    const c = ensureClient();
    const { data, error } = await c.from('records').select('*');
    if (error) { console.warn('[sync] pull failed', error); return; }
    for (const row of (data || [])) {
      try { await KCBAPP.store.update(row.store, row.data); } catch (e) {}
    }
  }

  async function syncNow() {
    const user = await currentUser();
    if (!user) throw new Error('请先在设置页登录');
    await pullAll();
    const names = KCBAPP.db.STORES.map(function (s) { return s.name; });
    for (let i = 0; i < names.length; i++) {
      const rows = await KCBAPP.store.getAll(names[i]);
      for (let j = 0; j < rows.length; j++) {
        const r = rows[j];
        if (r && r.id != null) await push(names[i], r.id, 'upsert', r);
      }
    }
  }

  KCBAPP.sync = {
    ensureClient: ensureClient,
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    isSignedIn: isSignedIn,
    currentUser: currentUser,
    push: push,
    pullAll: pullAll,
    syncNow: syncNow,
    getStatus: async function () { return { signedIn: await isSignedIn() }; }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = KCBAPP;
})(typeof window !== 'undefined' ? window : globalThis);
