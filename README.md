# 一人暮らし掲示板

大学生の一人暮らし向け掲示板サイト(HTML/CSS/JavaScriptのみ、ビルド不要)。

## 機能
- ログイン(大学のメールアドレスで登録・確認メール認証)※Supabase利用時
- タイムライン(ひとりごと/情報共有)、お気に入り、検索、タグ作成と右側のタグ絞り込み
- Q&A: 質問・回答、ベストアンサー(質問者のみ設定可)、解決済み、絞り込み
- 自分の投稿・回答の削除
- お気に入りはアカウントに紐づけて保存(端末をまたいで使える)

## 構成
`index.html` / `css/style.css` / `js/app.js`(画面) / `js/store.js`(保存と認証) / `js/config.js`(設定) / `supabase.sql`(DB定義) / `reset_posts.sql`(既存投稿の一括削除用)

## ローカルで動かす
`index.html` をブラウザで開く(IntelliJ IDEAの右上のブラウザアイコンからでも可)。
設定が空だと、ログインなし・ブラウザ内保存の1人用モードで動きます。

## Supabaseで共有・ログインを有効にする
1. Supabaseでプロジェクトを作成
2. Authentication > Providers > Email で「Confirm email」をON
3. `supabase.sql` を SQL Editor で実行(登録できるメールは `shibaura-it.ac.jp` に設定済み)
   - すでに投稿が入っている場合は、一度だけ `reset_posts.sql` も実行すると全件削除できます
4. `js/config.js` に Project URL と anon public キーを記入(`ALLOWED_DOMAIN` は設定済み)
5. Authentication > URL Configuration の Site URL に公開先(GitHub PagesのURL)を設定(確認メールのリンク先になります)

## 注意
- anonキーは公開前提のキーです。守っているのはRLS(行レベルセキュリティ)なので、必ず `supabase.sql` を実行してください。
- 削除・ベストアンサーの権限はRLSで制限しているため、画面を細工しても他人の分は変更できません。
- 既にあるデータは `user_id` が空のため、誰も削除できません(必要ならSupabaseの管理画面で削除)。

## GitHub Pagesで公開
リポジトリの Settings > Pages で Branch を `main` / `(root)` に設定。
