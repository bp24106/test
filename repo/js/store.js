// データ保存層。設定があればSupabase(REST)、なければlocalStorageを使う
(function () {
  const cfg = window.APP_CONFIG || {};
  const remote = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const FAV = "hitorigurashi_favs";

  const local = {
    data: load("hitorigurashi_v1", {
      posts: [
        { id: "s1", name: "はるき", year: "1年", cat: "ひとりごと", text: "一人暮らし3日目。冷蔵庫の中がマヨネーズと卵とプリンしかない。明日牛乳を買いに行く。", tags: ["自炊", "新生活"], createdAt: 1 },
        { id: "s2", name: "かずし", year: "3年", cat: "情報共有", text: "3月はガスの元栓の予約がすごく混みます。入居日が決まったら、その日のうちに予約しておくのがおすすめです。僕は2週間前でギリギリでした。", tags: ["手続き", "入居前"], createdAt: 2 }
      ],
      tags: ["新生活", "手続き", "自炊", "ゴミ出し", "入居前"]
    }),
    async listPosts() { return [...this.data.posts].sort((a, b) => b.createdAt - a.createdAt); },
    async listTags() { return this.data.tags; },
    async addPost(p) { this.data.posts.push({ ...p, id: "l" + p.createdAt }); save("hitorigurashi_v1", this.data); },
    async addTag(n) { if (!this.data.tags.includes(n)) { this.data.tags.push(n); save("hitorigurashi_v1", this.data); } }
  };

  const H = { apikey: cfg.SUPABASE_ANON_KEY, Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY, "Content-Type": "application/json" };
  async function rest(path, opt = {}) {
    const r = await fetch(cfg.SUPABASE_URL + "/rest/v1/" + path, { ...opt, headers: { ...H, ...(opt.headers || {}) } });
    if (!r.ok) throw new Error(await r.text());
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  }
  const sb = {
    async listPosts() {
      const rows = await rest("posts?select=*&order=created_at.desc&limit=300");
      return rows.map(r => ({ id: r.id, name: r.name, year: r.year, cat: r.cat, text: r.body, tags: r.tags || [], createdAt: Date.parse(r.created_at) }));
    },
    async listTags() { return (await rest("tags?select=name&limit=500")).map(r => r.name); },
    async addPost(p) {
      await rest("posts", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ name: p.name, year: p.year, cat: p.cat, body: p.text, tags: p.tags }) });
    },
    async addTag(n) {
      await rest("tags?on_conflict=name", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify({ name: n }) });
    }
  };

  window.Store = Object.assign(remote ? sb : local, {
    mode: remote ? "remote" : "local",
    getFavs: () => load(FAV, []),
    setFavs: a => save(FAV, a)   // お気に入りは端末ごとに保存
  });
})();
