const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let posts = [], tagNames = [], favs = new Set(Store.getFavs());
let tab = "tl", filter = "all", cat = "ひとりごと", tagFilter = "", query = "";
const status = m => { $("#status").textContent = m || ""; };
try { $("#nick").value = localStorage.getItem("bbs_nick") || ""; $("#year").value = localStorage.getItem("bbs_year") || "1年"; } catch (e) {}

function allTags() {
  const c = {};
  tagNames.forEach(t => { if (!(t in c)) c[t] = 0; });
  posts.forEach(p => (p.tags || []).forEach(t => c[t] = (c[t] || 0) + 1));
  return Object.entries(c).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"));
}
function render() {
  let v = posts.filter(p => tab === "qa" ? p.cat === "質問" : true);
  if (tab === "tl") {
    if (filter === "fav") v = v.filter(p => favs.has(p.id));
    else if (filter !== "all") v = v.filter(p => p.cat === filter);
  }
  if (tagFilter) v = v.filter(p => (p.tags || []).includes(tagFilter));
  if (query) v = v.filter(p => ((p.text || "") + (p.tags || []).join(" ")).toLowerCase().includes(query.toLowerCase()));
  $("#list").innerHTML = v.length ? v.map(p => `<div class="card post">
    <div class="ph"><div class="av">${esc((p.name || "?")[0])}</div><span>${esc(p.name || "名無し")}</span><span class="meta">${esc(p.year || "")}</span>
    <span class="badge ${p.cat === "情報共有" ? "info" : p.cat === "質問" ? "q" : ""}">${esc(p.cat || "")}</span>
    <button class="star ${favs.has(p.id) ? "on" : ""}" data-id="${esc(p.id)}" aria-label="お気に入り">★</button></div>
    <p>${esc(p.text || "")}</p><div>${(p.tags || []).map(t => `<span class="tag" data-t="${esc(t)}">#${esc(t)}</span>`).join("")}</div></div>`).join("")
    : '<div class="empty">該当する投稿がありません</div>';
  const tl = allTags();
  $("#tagList").innerHTML = tl.length ? tl.map(([t, n]) => `<li><button class="${t === tagFilter ? "on" : ""}" data-t="${esc(t)}"><span>#${esc(t)}</span><span class="n">${n}</span></button></li>`).join("") : '<li class="meta" style="padding:8px 10px">タグはまだありません</li>';
  $("#clr").hidden = !tagFilter;
}
async function refresh() {
  try { posts = await Store.listPosts(); tagNames = await Store.listTags(); render(); }
  catch (e) { status("データの読み込みに失敗しました"); console.error(e); }
}
async function ensureTag(name) {
  if (!allTags().some(([t]) => t === name)) await Store.addTag(name);
}
async function addNewTag() {
  const n = $("#newTag").value.replace(/^[#＃\s]+/, "").trim(); if (!n) return;
  try { await ensureTag(n); $("#newTag").value = ""; tagFilter = n; await refresh(); }
  catch (e) { status("タグの作成に失敗しました"); }
}
document.addEventListener("click", e => {
  const t = e.target.closest("button,.tag"); if (!t) return;
  if (t.dataset.tab) { tab = t.dataset.tab; document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("on", b === t)); render(); }
  else if (t.dataset.cat) { cat = t.dataset.cat; document.querySelectorAll("#cats .chip").forEach(b => b.classList.toggle("on", b === t)); }
  else if (t.dataset.f) { filter = t.dataset.f; document.querySelectorAll("#filters .chip").forEach(b => b.classList.toggle("on", b === t)); render(); }
  else if (t.classList.contains("star")) { const id = t.dataset.id; favs.has(id) ? favs.delete(id) : favs.add(id); Store.setFavs([...favs]); render(); }
  else if (t.dataset.t !== undefined) { tagFilter = tagFilter === t.dataset.t ? "" : t.dataset.t; render(); }
  else if (t.id === "clr") { tagFilter = ""; render(); }
  else if (t.id === "addTag") addNewTag();
});
$("#newTag").addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) addNewTag(); });
$("#q").addEventListener("input", e => { query = e.target.value.trim(); render(); });
$("#submit").addEventListener("click", async () => {
  const text = $("#body").value.trim(); if (!text) return;
  const tags = [...new Set($("#tagIn").value.split(/[\s　]+/).map(s => s.replace(/^[#＃]/, "")).filter(Boolean))].slice(0, 5);
  const name = $("#nick").value.trim() || "名無し", year = $("#year").value;
  try { localStorage.setItem("bbs_nick", name); localStorage.setItem("bbs_year", year); } catch (e) {}
  try {
    for (const t of tags) await ensureTag(t);
    await Store.addPost({ name, year, cat, text, tags, createdAt: Date.now() });
    $("#body").value = ""; $("#tagIn").value = ""; status(""); await refresh();
  } catch (e) { status("投稿の保存に失敗しました。時間をおいて再度お試しください。"); console.error(e); }
});
if (Store.mode === "local") status("ローカル保存モード: 投稿はこのブラウザにのみ保存されます(js/config.js でSupabaseを設定すると共有されます)。");
refresh();
setInterval(refresh, 30000);
