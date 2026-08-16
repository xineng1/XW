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

  function currentUser() {
    if (!client) return null;
    const s = client.auth.getSession();
    const sess = s && s.data ? s.data.session : null;
    return sess ? sess.user : null;
  }

  async function signUp(email, password) {
    const c = ensureClient();
    const { data, error } = await c.auth.signUp({ email, password });
    if (error) throw error;
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

  function isSignedIn() { return !!currentUser(); }

  async function push(storeName, id, op, data) {
    const user = currentUser();
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
    const user = currentUser();
    if (!user) return;
    const c = ensureClient();
    const { data, error } = await c.from('records').select('*');
    if (error) { console.warn('[sync] pull failed', error); return; }
    for (const row of (data || [])) {
      try { await KCBAPP.store.update(row.store, row.data); } catch (e) {}
    }
  }

  async function syncNow() {
    const user = currentUser();
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
    getStatus: function () { return { signedIn: isSignedIn() }; }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = KCBAPP;
})(typeof window !== 'undefined' ? window : globalThis);
