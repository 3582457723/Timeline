const messagesDiv = document.getElementById('messages');
const nicknameInput = document.getElementById('nickname');
const messageInput = document.getElementById('message');
const sendBtn = document.getElementById('send-btn');
const ttlSelect = document.getElementById('ttl-select');

// メッセージを取得して画面に描画
async function fetchMessages() {
    try {
        const res = await fetch('/messages');
        if (!res.ok) return;
        const messages = await res.json();
        
        if (messages.length === 0) {
            messagesDiv.innerHTML = '<div class="system-msg">メッセージはありません。最初のチャットを投稿しよう！</div>';
            return;
        }

        messagesDiv.innerHTML = '';
        messages.forEach(msg => {
            const div = document.createElement('div');
            div.className = 'msg-item';
            div.innerHTML = `
                <div class="msg-user">${escapeHtml(msg.nickname)}</div>
                <div class="msg-text">${escapeHtml(msg.message)}</div>
            `;
            messagesDiv.appendChild(div);
        });
        
        // 一番下までスクロール
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } catch (err) {
        console.error('メッセージの取得に失敗しました', err);
    }
}

// メッセージを送信
async function sendMessage() {
    const nickname = nicknameInput.value.trim() || '名無しさん';
    const message = messageInput.value.trim();
    const ttl = ttlSelect.value; // ドロップダウンから秒数を取得
    
    if (!message) return;

    try {
        const res = await fetch('/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname, message, ttl }) // ttlを確実に含める
        });

        if (res.ok) {
            messageInput.value = '';
            fetchMessages(); // 送信成功したらすぐ更新
        } else {
            console.error('サーバーエラー:', res.status);
        }
    } catch (err) {
        alert('送信に失敗しました');
    }
}

// XSS対策のHTMLエスケープ
function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// イベントリスナーの登録
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// 初期読み込みと3秒ごとの自動更新
fetchMessages();
setInterval(fetchMessages, 100);