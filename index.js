export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. メッセージ送信 API
    if (request.method === "POST" && url.pathname === "/send") {
      try {
        const body = await request.json();
        const { nickname, message, ttl } = body;
        
        // データの存在チェック（ここで400エラーにならないようフロントとキーを統一）
        if (!nickname || !message || !ttl) {
          return new Response("Bad Request", { status: 400 });
        }

        // 有効期限（秒）を1秒〜86400秒(1日)の間に制限
        const ttlSeconds = Math.max(1, Math.min(86400, parseInt(ttl)));
        
        // 本文とTTLをJSON形式にまとめてmessageカラムに保存
        const textData = JSON.stringify({ body: message, ttl: ttlSeconds });

        await env.DB.prepare(
          "INSERT INTO messages (nickname, message) VALUES (?, ?)"
        ).bind(nickname, textData).run();

        return new Response("OK", { status: 200 });
      } catch (e) {
        return new Response("Server Error", { status: 500 });
      }
    }

    // 2. メッセージ取得 API
    if (request.method === "GET" && url.pathname === "/messages") {
      try {
        // 直近1時間以内に作成されたデータをD1から全件取得
        const { results } = await env.DB.prepare(
          "SELECT nickname, message, created_at FROM messages WHERE created_at >= datetime('now', '-1 hour') ORDER BY id ASC"
        ).all();

        const now = Date.now();
        
        // 各メッセージの寿命をパースして、まだ生きているデータだけを絞り込む
        const filteredResults = results.map(row => {
          try {
            const parsed = JSON.parse(row.message);
            return {
              nickname: row.nickname,
              message: parsed.body,
              ttl: parsed.ttl,
              createdAt: new Date(row.created_at + " UTC").getTime()
            };
          } catch(e) {
            // 古いデータ形式だった場合の互換性用
            return { nickname: row.nickname, message: row.message, ttl: 3600, createdAt: 0 };
          }
        }).filter(item => {
          // 「作成時刻 + 寿命(ミリ秒)」が現在時刻より未来のものだけを残す
          return (item.createdAt + (item.ttl * 1000)) > now;
        });

        return new Response(JSON.stringify(filteredResults), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response("Server Error", { status: 500 });
      }
    }

    // 3. 静的ファイルの配信
    return env.ASSETS.fetch(request);
  },

  // 1時間以上前のデータをDBから完全に削除する定期クリーンアップ
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      env.DB.prepare("DELETE FROM messages WHERE created_at < datetime('now', '-1 hour')").run()
    );
  }
};