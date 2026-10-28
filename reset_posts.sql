-- 既存の投稿・回答をすべて削除します(1回だけ実行。元に戻せません)
-- お気に入りも投稿に紐づいているため一緒に消えます
delete from answers;
delete from posts;
