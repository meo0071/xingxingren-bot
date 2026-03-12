const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const APP_ID = process.env.FEISHU_APP_ID || 'cli_a92b13e584dd5bc8';
const APP_SECRET = process.env.FEISHU_APP_SECRET || 'sbV6KAH9M9v2IcuW98rG5giYP4jf5nNL';

const RESPONSES = {
  '帮助': '我是星星人 🪐\n1. 自动回复\n2. 关键词响应\n3. 天气查询（说"天气城市"）\n4. 营销建议\n5. 数据分析',
  '营销建议': '💡 营销建议：\n1. 内容营销\n2. 社交媒体\n3. 数据驱动\n4. 用户体验\n5. 品牌故事',
  '数据分析': '📊 数据分析准备好啦！\n告诉我你需要分析什么？',
};

async function getToken() {
  try {
    const r = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: APP_ID, app_secret: APP_SECRET,
    });
    return r.data.tenant_access_token;
  } catch (e) { console.error('令牌错误', e.message); return null; }
}

async function send(id, type, text) {
  const token = await getToken();
  if (!token) return;
  try {
    await axios.post('https://open.feishu.cn/open-apis/im/v1/messages', {
      receive_id_type: type, receive_id: id,
      msg_type: 'text', content: JSON.stringify({ text }),
    }, { headers: { Authorization: `Bearer ${token}` } });
  } catch (e) { console.error('发送错误', e.response?.data || e.message); }
}

app.all('/webhook', async (req, res) => {
  const { type, challenge, event } = req.body;
  console.log('收到:', JSON.stringify(req.body));
  
  if (type === 'url_verification') { res.json({ challenge }); return; }
  
  if (event?.message) {
    const msg = event.message;
    const user_id = msg.sender_id?.user_id;
    const chat_id = msg.chat_id;
    let text = '';
    try { text = JSON.parse(msg.message?.content || '{}').text || ''; } catch(e) {}
    
    console.log(`收到: user=${user_id}, chat=${chat_id}, text=${text}`);
    
    if (text) {
      const lower = text.toLowerCase();
      let reply = RESPONSES[lower] || `收到: "${text}"\n\n说"帮助"看我能做什么 🪐`;
      
      if (text.includes('天气')) {
        const city = text.replace(/天气/gi, '').trim() || '上海';
        reply = `🌤️ ${city}天气\n\n晴朗\n温度15-25°C`;
      }
      
      if (chat_id) await send(chat_id, 'chat_id', reply);
      else if (user_id) await send(user_id, 'user_id', reply);
    }
  }
  res.json({ code: 0 });
});

app.get('/', (req, res) => res.send('星星人服务运行中 ✨'));
app.listen(3000, () => console.log('✨ 启动成功!'));
