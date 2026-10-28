// Supabaseの接続設定(空のままならログイン不要のブラウザ内保存モードで動作)
window.APP_CONFIG = {
  SUPABASE_URL: "",       // 例: https://xxxx.supabase.co
  SUPABASE_ANON_KEY: "",  // Project Settings > API の anon public キー
  ALLOWED_DOMAIN: "shibaura-it.ac.jp"  // 登録を許可するメールのドメイン 例: xxx.ac.jp (DB側の制限と同じ値にする)
};
