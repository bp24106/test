// データ保存・認証層。設定があればSupabase(REST/GoTrue)、なければlocalStorageを使う
(function () {
  const cfg = window.APP_CONFIG || {};
  const remote = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const FAV = "hitorigurashi_favs", KEY = "hitorigurashi_v4", SKEY = "hitorigurashi_session";
  const ME = { id: "local-me", email: "local" };

  // ---------- ローカルモード(ログイン不要・1人用) ----------
  const local = {
    data: load(KEY, {
      posts: [],
      answers: [],
      tags: ["新生活", "手続き", "自炊", "ゴミ出し", "入居前"]
    }),
    commit() { save(KEY, this.data); },
    auth: {
      async init() { return ME; },
      async signIn() { return ME; }, async signUp() { return { user: ME }; }, async signOut() {}
    },
    async listPosts() { return [...this.data.posts].sort((a, b) => b.createdAt - a.createdAt); },
    async listAnswers() { return this.data.answers; },
    async listTags() { return this.data.tags; },
    async addPost(p) { this.data.posts.push({ ...p, id: "l" + p.createdAt, userId: ME.id, solved: false }); this.commit(); },
    async addAnswer(a) { this.data.answers.push({ ...a, id: "la" + a.createdAt, userId: ME.id, isBest: false }); this.commit(); },
    async addTag(n) { if (!this.data.tags.includes(n)) { this.data.tags.push(n); this.commit(); } },
    async deletePost(id) {
      this.data.posts = this.data.posts.filter(p => p.id !== id);
      this.data.answers = this.data.answers.filter(a => a.postId !== id); this.commit();
    },
    async deleteAnswer(id) { this.data.answers = this.data.answers.filter(a => a.id !== id); this.commit(); },
    async listFavs() { return load(FAV, []); },
    async setFav(id, on) { const a = new Set(load(FAV, [])); on ? a.add(id) : a.delete(id); save(FAV, [...a]); },
    async setSolved(pid, v) {
      this.data.posts.find(p => p.id === pid).solved = v;
      if (!v) this.data.answers.filter(a => a.postId === pid).forEach(a => a.isBest = false);
      this.commit();
    },
    async setBest(pid, aid) {
      this.data.answers.filter(a => a.postId === pid).forEach(a => a.isBest = a.id === aid);
      this.data.posts.find(p => p.id === pid).solved = true; this.commit();
    }
  };

  // ---------- Supabase モード ----------
  let session = load(SKEY, null);
  const setSession = j => {
    session = { accessToken: j.access_token, refreshToken: j.refresh_token, expiresAt: Date.now() + (j.expires_in || 3600) * 1000, user: { id: j.user.id, email: j.user.email } };
    save(SKEY, session);
  };
  async function gotrue(path, body) {
    const r = await fetch(cfg.SUPABASE_URL + "/auth/v1/" + path, { method: "POST", headers: { apikey: cfg.SUPABASE_ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
    if (!r.ok) throw Object.assign(new Error((j && (j.msg || j.error_description || j.message)) || t), { status: r.status });
    return j;
  }
  async function token() {
    if (!session) return null;
    if (Date.now() > session.expiresAt - 60000) {
      try { setSession(await gotrue("token?grant_type=refresh_token", { refresh_token: session.refreshToken })); }
      catch (e) { session = null; save(SKEY, null); return null; }
    }
    return session.accessToken;
  }
  async function rest(path, opt = {}) {
    const tk = await token();
    if (!tk) throw Object.assign(new Error("not logged in"), { status: 401 });
    const r = await fetch(cfg.SUPABASE_URL + "/rest/v1/" + path, { ...opt, headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: "Bearer " + tk, "Content-Type": "application/json", ...(opt.headers || {}) } });
    if (!r.ok) throw Object.assign(new Error(await r.text()), { status: r.status });
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  }
  const MIN = { Prefer: "return=minimal" };
  const q = encodeURIComponent;
  const patch = (path, body) => rest(path, { method: "PATCH", headers: MIN, body: JSON.stringify(body) });
  const del = path => rest(path, { method: "DELETE", headers: MIN });
  const sb = {
    auth: {
      async init() { return (await token()) ? session.user : null; },
      async signIn(email, password) { setSession(await gotrue("token?grant_type=password", { email, password })); return session.user; },
      async signUp(email, password) {
        const j = await gotrue("signup", { email, password });
        if (j && j.access_token) { setSession(j); return { user: session.user }; }
        return { user: null };   // 確認メール送信済み
      },
      async signOut() {
        const tk = session && session.accessToken; session = null; save(SKEY, null);
        if (tk) try { await fetch(cfg.SUPABASE_URL + "/auth/v1/logout", { method: "POST", headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: "Bearer " + tk } }); } catch (e) {}
      }
    },
    async listPosts() {
      const rows = await rest("posts?select=*&order=created_at.desc&limit=300");
      return rows.map(r => ({ id: r.id, userId: r.user_id, name: r.name, year: r.year, cat: r.cat, text: r.body, tags: r.tags || [], solved: !!r.solved, createdAt: Date.parse(r.created_at) }));
    },
    async listAnswers() {
      const rows = await rest("answers?select=*&order=created_at.asc&limit=1000");
      return rows.map(r => ({ id: r.id, userId: r.user_id, postId: r.post_id, name: r.name, year: r.year, text: r.body, isBest: !!r.is_best, createdAt: Date.parse(r.created_at) }));
    },
    async listTags() { return (await rest("tags?select=name&limit=500")).map(r => r.name); },
    async addPost(p) { await rest("posts", { method: "POST", headers: MIN, body: JSON.stringify({ name: p.name, year: p.year, cat: p.cat, body: p.text, tags: p.tags }) }); },
    async addAnswer(a) { await rest("answers", { method: "POST", headers: MIN, body: JSON.stringify({ post_id: a.postId, name: a.name, year: a.year, body: a.text }) }); },
    async addTag(n) { await rest("tags?on_conflict=name", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify({ name: n }) }); },
    async deletePost(id) { await del("posts?id=eq." + q(id)); },
    async deleteAnswer(id) { await del("answers?id=eq." + q(id)); },
    async listFavs() { return (await rest("favs?select=post_id&limit=1000")).map(r => r.post_id); },
    async setFav(id, on) {
      if (on) await rest("favs?on_conflict=user_id,post_id", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify({ post_id: id }) });
      else await del("favs?post_id=eq." + q(id));
    },
    async setSolved(pid, v) {
      await patch("posts?id=eq." + q(pid), { solved: v });
      if (!v) await patch("answers?post_id=eq." + q(pid), { is_best: false });
    },
    async setBest(pid, aid) {
      await patch("answers?post_id=eq." + q(pid), { is_best: false });
      await patch("answers?id=eq." + q(aid), { is_best: true });
      await patch("posts?id=eq." + q(pid), { solved: true });
    }
  };

  window.Store = Object.assign(remote ? sb : local, { mode: remote ? "remote" : "local" });
})();
