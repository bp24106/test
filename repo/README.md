# 一人暮らし掲示板

大学生の一人暮らし向け掲示板サイト(HTML/CSS/JavaScriptのみ、ビルド不要)。

## 構成
- `index.html` 画面 / `css/style.css` デザイン
- `js/app.js` 画面ロジック / `js/store.js` 保存層 / `js/config.js` 接続設定
- `supabase.sql` DBのテーブル定義

## ローカルで動かす
`index.html` をブラウザで開く(または IntelliJ IDEA で右上のブラウザアイコンから開く)。
設定が空だと、投稿はそのブラウザ内(localStorage)にのみ保存されます。

## DB(Supabase)で共有する
1. Supabaseでプロジェクトを作成し、`supabase.sql` を SQL Editor で実行
2. `js/config.js` に Project URL と anon public キーを記入
3. 注意: anonキーは公開前提のキーです。守っているのは RLS(行レベルセキュリティ)なので、ポリシーを必ず有効にしてください。ログイン認証や削除機能を入れるときはポリシーも見直してください。

## GitHub Pagesで公開
リポジトリの Settings > Pages で Branch を `main` / `(root)` に設定。
