const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let me = null, posts = [], answers = [], tagNames = [], favs = new Set();
let tab = "tl", filter = "all", qaFilter = "all", cat = "ひとりごと", tagFilter = "", query = "";
const openQ = new Set(), drafts = {};
const status = m => { $("#status").textContent = m || ""; };
const authMsg = m => { $("#authMsg").textContent = m || ""; };
try { $("#nick").value = localStorage.getItem("bbs_nick") || ""; $("#year").value = localStorage.getItem("bbs_year") || "1年"; } catch (e) {}

const who = x => `<div class="av">${esc((x.name || "?")[0])}</div><span>${esc(x.name || "名無し")}</span><span class="meta">${esc(x.year || "")}</span>`;
const tagsHtml = p => (p.tags || []).map(t => `<span class="tag" data-t="${esc(t)}">#${esc(t)}</span>`).join("");
const star = p => `<button class="star ${favs.has(p.id) ? "on" : ""}" data-id="${esc(p.id)}" aria-label="お気に入り">★</button>`;
const isMine = x => !!(me && x.userId && x.userId === me.id);
const delBtn = (attr, id) => `<button class="link danger" data-${attr}="${esc(id)}">削除</button>`;

function allTags() {
  const c = {};
  tagNames.forEach(t => { if (!(t in c)) c[t] = 0; });
  posts.forEach(p => (p.tags || []).forEach(t => c[t] = (c[t] || 0) + 1));
  return Object.entries(c).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"));
}
function postCard(p) {
  return `<div class="card post"><div class="ph">${who(p)}
    <span class="badge ${p.cat === "情報共有" ? "info" : p.cat === "質問" ? "q" : ""}">${esc(p.cat || "")}</span>
    <span class="acts">${isMine(p) ? delBtn("delp", p.id) : ""}${star(p)}</span></div>
    <p>${esc(p.text || "")}</p><div>${tagsHtml(p)}</div></div>`;
}
function qCard(p) {
  const id = esc(p.id), open = openQ.has(p.id), owner = isMine(p);
  const as = answers.filter(a => a.postId === p.id).sort((a, b) => (b.isBest - a.isBest) || a.createdAt - b.createdAt);
  const list = as.map(a => `<div class="ans ${a.isBest ? "best" : ""}"><div class="ph">${who(a)}
      ${a.isBest ? '<span class="badge info">ベストアンサー</span>' : ""}
      <span class="acts">${owner && !a.isBest ? `<button class="link" data-best="${esc(a.id)}" data-p="${id}">ベストアンサーに選ぶ</button>` : ""}${isMine(a) ? delBtn("dela", a.id) : ""}</span></div>
      <p>${esc(a.text)}</p></div>`).join("");
  return `<div class="card post"><div class="ph">${who(p)}
    <span class="badge ${p.solved ? "info" : "q"}">${p.solved ? "解決済み" : "回答募集中"}</span>
    <span class="acts">${owner ? delBtn("delp", p.id) : ""}${star(p)}</span></div>
    <p>${esc(p.text || "")}</p><div>${tagsHtml(p)}</div>
    <div class="qa-actions"><button class="chip" data-open="${id}">回答 ${as.length}件 ${open ? "▲" : "▼"}</button>
      ${owner ? `<button class="chip" data-solve="${id}">${p.solved ? "未解決に戻す" : "解決済みにする"}</button>` : ""}</div>
    ${open ? `<div class="answers">${list || '<div class="meta" style="padding-bottom:10px">まだ回答がありません</div>'}
      <textarea data-draft="${id}" maxlength="300" placeholder="回答を書く(個人が特定できる情報は書かない)">${esc(drafts[p.id] || "")}</textarea>
      <div class="row"><button class="post-btn" data-answer="${id}">回答する</button></div></div>` : ""}</div>`;
}
function render() {
  let v = posts;
  if (tab === "qa") {
    v = v.filter(p => p.cat === "質問");
    if (qaFilter === "open") v = v.filter(p => !p.solved);
    if (qaFilter === "solved") v = v.filter(p => p.solved);
  } else if (filter === "fav") v = v.filter(p => favs.has(p.id));
  else if (filter !== "all") v = v.filter(p => p.cat === filter);
  if (tagFilter) v = v.filter(p => (p.tags || []).includes(tagFilter));
  if (query) v = v.filter(p => ((p.text || "") + (p.tags || []).join(" ")).toLowerCase().includes(query.toLowerCase()));
  $("#list").innerHTML = v.length ? v.map(tab === "qa" ? qCard : postCard).join("")
    : `<div class="empty">${tab === "qa" ? "該当する質問がありません" : "該当する投稿がありません"}</div>`;
  const tl = allTags();
  $("#tagList").innerHTML = tl.length ? tl.map(([t, n]) => `<li><button class="${t === tagFilter ? "on" : ""}" data-t="${esc(t)}"><span>#${esc(t)}</span><span class="n">${n}</span></button></li>`).join("") : '<li class="meta" style="padding:8px 10px">タグはまだありません</li>';
  $("#clr").hidden = !tagFilter;
}
function applyTab() {
  const qa = tab === "qa";
  document.querySelectorAll("#cats [data-cat]").forEach(b => b.hidden = qa);
  $("#filters").hidden = qa; $("#qaFilters").hidden = !qa;
  $("#body").placeholder = qa ? "困っていることを質問する(例：ゴミの分別はどこで確認できますか?)" : "ひとりごとや、知ったことなどを投稿する";
  $("#submit").textContent = qa ? "質問する" : "投稿する";
  render();
}
async function refresh() {
  if (!me) return;
  const ae = document.activeElement, typing = ae && ae.tagName === "TEXTAREA" && $("#list").contains(ae);
  try {
    posts = await Store.listPosts(); answers = await Store.listAnswers(); tagNames = await Store.listTags(); favs = new Set(await Store.listFavs());
    if (!typing) render();
  } catch (e) {
    if (e.status === 401) return logout("ログインの有効期限が切れました。もう一度ログインしてください。");
    status("データの読み込みに失敗しました"); console.error(e);
  }
}
async function run(fn, msg) {
  try { await fn(); await refresh(); }
  catch (e) { if (e.status === 401) return logout("ログインの有効期限が切れました。もう一度ログインしてください。"); status(msg); console.error(e); }
}
async function ensureTag(name) { if (!allTags().some(([t]) => t === name)) await Store.addTag(name); }
function addNewTag() {
  const n = $("#newTag").value.replace(/^[#＃\s]+/, "").trim(); if (!n) return;
  run(async () => { await ensureTag(n); $("#newTag").value = ""; tagFilter = n; }, "タグの作成に失敗しました");
}

// ---------- 認証 ----------
function jpErr(e) {
  const m = String(e.message || "");
  if (/Invalid login/i.test(m)) return "メールアドレスまたはパスワードが違います";
  if (/not confirmed/i.test(m)) return "メールアドレスの確認が済んでいません。確認メールのリンクを開いてください";
  if (/Database error|not allowed/i.test(m)) return "このメールアドレスでは登録できません。大学のメールアドレスを使ってください";
  if (/already|registered/i.test(m)) return "このメールアドレスは登録済みです";
  if (/rate limit/i.test(m)) return "短時間に送信しすぎです。しばらくしてからお試しください";
  return "エラーが発生しました: " + m;
}
function enter(user) {
  me = user; document.body.dataset.auth = "in";
  $("#userEmail").textContent = Store.mode === "local" ? "ローカルモード" : me.email;
  $("#logout").hidden = Store.mode === "local";
  applyTab(); refresh();
}
async function logout(msg) {
  await Store.auth.signOut(); me = null; posts = []; answers = [];
  document.body.dataset.auth = "out"; authMsg(msg || ""); $("#pw").value = "";
}
async function doAuth(kind) {
  const email = $("#email").value.trim(), pw = $("#pw").value, dom = (APP_CONFIG.ALLOWED_DOMAIN || "").trim().toLowerCase();
  authMsg("");
  if (!email || pw.length < 8) return authMsg("メールアドレスと8文字以上のパスワードを入力してください");
  const em = email.toLowerCase();
  if (kind === "up" && dom && !(em.endsWith("@" + dom) || em.endsWith("." + dom))) return authMsg("@" + dom + " のメールアドレスで登録してください");
  try {
    if (kind === "in") enter(await Store.auth.signIn(email, pw));
    else {
      const r = await Store.auth.signUp(email, pw);
      if (r.user) enter(r.user); else authMsg("確認メールを送りました。メール内のリンクを開いてから、ログインしてください。");
    }
  } catch (e) { authMsg(jpErr(e)); }
}
$("#signin").addEventListener("click", () => doAuth("in"));
$("#signup").addEventListener("click", () => doAuth("up"));
$("#pw").addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) doAuth("in"); });
$("#logout").addEventListener("click", () => logout(""));
if (APP_CONFIG.ALLOWED_DOMAIN) $("#authHint").textContent = "@" + APP_CONFIG.ALLOWED_DOMAIN + " のメールアドレスで登録できます。";

// ---------- 操作 ----------
document.addEventListener("click", e => {
  const t = e.target.closest("button,.tag"); if (!t) return;
  const d = t.dataset;
  if (d.tab) { tab = d.tab; document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("on", b === t)); applyTab(); }
  else if (d.cat) { cat = d.cat; document.querySelectorAll("#cats .chip").forEach(b => b.classList.toggle("on", b === t)); }
  else if (d.f) { filter = d.f; document.querySelectorAll("#filters .chip").forEach(b => b.classList.toggle("on", b === t)); render(); }
  else if (d.q) { qaFilter = d.q; document.querySelectorAll("#qaFilters .chip").forEach(b => b.classList.toggle("on", b === t)); render(); }
  else if (d.open) { openQ.has(d.open) ? openQ.delete(d.open) : openQ.add(d.open); render(); }
  else if (d.solve) { const p = posts.find(x => x.id === d.solve); run(() => Store.setSolved(p.id, !p.solved), "状態の更新に失敗しました"); }
  else if (d.best) run(() => Store.setBest(d.p, d.best), "ベストアンサーの設定に失敗しました(質問者のみ設定できます)");
  else if (d.delp) { if (confirm("この投稿を削除しますか?(付いている回答も一緒に削除されます)")) run(() => Store.deletePost(d.delp), "削除に失敗しました"); }
  else if (d.dela) { if (confirm("この回答を削除しますか?")) run(() => Store.deleteAnswer(d.dela), "削除に失敗しました"); }
  else if (d.answer) {
    const text = (drafts[d.answer] || "").trim(); if (!text) return;
    run(async () => {
      await Store.addAnswer({ postId: d.answer, name: $("#nick").value.trim() || "名無し", year: $("#year").value, text, createdAt: Date.now() });
      drafts[d.answer] = "";
    }, "回答の保存に失敗しました");
  }
  else if (t.classList.contains("star")) {
    const id = d.id, on = !favs.has(id); on ? favs.add(id) : favs.delete(id); render();
    Store.setFav(id, on).catch(() => { on ? favs.delete(id) : favs.add(id); render(); status("お気に入りの保存に失敗しました"); });
  }
  else if (d.t !== undefined) { tagFilter = tagFilter === d.t ? "" : d.t; render(); }
  else if (t.id === "clr") { tagFilter = ""; render(); }
  else if (t.id === "addTag") addNewTag();
});
document.addEventListener("input", e => { if (e.target.dataset.draft) drafts[e.target.dataset.draft] = e.target.value; });
$("#newTag").addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) addNewTag(); });
$("#q").addEventListener("input", e => { query = e.target.value.trim(); render(); });
$("#submit").addEventListener("click", () => {
  const text = $("#body").value.trim(); if (!text) return;
  const tags = [...new Set($("#tagIn").value.split(/[\s　]+/).map(s => s.replace(/^[#＃]/, "")).filter(Boolean))].slice(0, 5);
  const name = $("#nick").value.trim() || "名無し", year = $("#year").value;
  try { localStorage.setItem("bbs_nick", name); localStorage.setItem("bbs_year", year); } catch (e) {}
  run(async () => {
    for (const t of tags) await ensureTag(t);
    await Store.addPost({ name, year, cat: tab === "qa" ? "質問" : cat, text, tags, createdAt: Date.now() });
    $("#body").value = ""; $("#tagIn").value = ""; status("");
  }, "投稿の保存に失敗しました。時間をおいて再度お試しください。");
});
if (Store.mode === "local") status("ローカル保存モード: ログインなし・投稿はこのブラウザにのみ保存されます(js/config.js でSupabaseを設定すると共有・ログインが有効になります)。");
setInterval(refresh, 30000);
Store.auth.init().then(u => { if (u) enter(u); }).catch(() => {});
