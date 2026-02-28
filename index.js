/**
 * 星星人飞书机器人
 * 支持功能：自动回复、关键词响应、天气查询、数据分析、营销思考
 */

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(express.json());

// 飞书配置
const APP_ID = process.env.FEISHU_APP_ID || 'cli_a92b13e584dd5bc8';
const APP_SECRET = process.env.FEISHU_APP_SECRET || 'sbV6KAH9M9v2IcuW98rG5giYP4jf5nNL';

// 关键词自动回复配置
const KEYWORD_RESPONSES = {
  'hello': '你好！我是星星人，一个宇宙探索助手 🪐',
  '你好': '你好！很高兴见到你！有什么我可以帮你的吗？✨',
  '帮助': '我可以帮你：\n1. 自动回复消息\n2. 关键词响应\n3. 天气查询（输入"天气+城市"）\n4. 数据分析\n5. 营销思考\n试试对我说"天气上海"或"营销建议"吧！',
  '营销建议': '以下是一些营销思考 💡\n\n1. 内容营销：创造有价值的内容吸引目标受众\n2. 社交媒体：利用平台特性进行互动营销\n3. 数据驱动：通过数据分析优化营销策略\n4. 用户体验：关注客户旅程的每一个触点\n5. 品牌故事：讲述有感染力的品牌故事\n\n需要更具体的建议吗？',
  '数据分析': '📊 数据分析能力准备就绪！\n\n我可以帮助你：\n- 解读数据趋势\n- 生成数据报告\n- 提供洞察建议\n\n请告诉我你需要分析什么数据？',
};

// 获取飞书访问令牌
async function getTenantAccessToken() {
  try {
    const response = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: APP_ID,
      app_secret: APP_SECRET,
    });
    return response.data.tenant_access_token;
  } catch (error) {
    console.error('获取令牌失败:', error.response?.data || error.message);
    return null;
  }
}

// 发送消息给用户
async function sendMessage(receive_id, content) {
  const token = await getTenantAccessToken();
  if (!token) return false;

  try {
    await axios.post('https://open.feishu.cn/open-apis/im/v1/messages', {
      receive_id: receive_id,
      msg_type: 'text',
      content: JSON.stringify({ text: content }),
    }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return true;
  } catch (error) {
    console.error('发送消息失败:', error.response?.data || error.message);
    return false;
  }
}

// 处理用户消息
async function handleMessage(user_id, text) {
  const lowerText = text.toLowerCase().trim();

  // 关键词匹配
  for (const [keyword, response] of Object.entries(KEYWORD_RESPONSES)) {
    if (lowerText.includes(keyword)) {
      await sendMessage(user_id, response);
      return;
    }
  }

  // 天气查询
  if (lowerText.startsWith('天气')) {
    const city = text.replace(/天气/i, '').trim() || '上海';
    const weatherResponse = await getWeather(city);
    await sendMessage(user_id, weatherResponse);
    return;
  }

  // 默认回复
  const defaultResponse = `收到你的消息："${text}"\n\n我是星星人，你的宇宙探索助手 🪐\n输入"帮助"看看我能做什么！`;
  await sendMessage(user_id, defaultResponse);
}

// 模拟天气查询
async function getWeather(city) {
  const weatherConditions = ['晴朗', '多云', '阴天', '小雨', '晴天'];
  const randomWeather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
  const temperatures = Math.floor(Math.random() * 15) + 10;

  return `🌤️ ${city}天气预报\n\n天气状况：${randomWeather}\n温度：${temperatures}°C\n湿度：${Math.floor(Math.random() * 50) + 30}%\n\n（注：这是模拟数据）`;
}

// 首页路由
app.get('/', (req, res) => {
  res.send('星星人飞书机器人服务运行中 ✨');
});

// 飞书回调URL - 验证和接收消息
app.all('/webhook', async (req, res) => {
  try {
    const { type, challenge, event } = req.body;

    // 验证回调
    if (type === 'url_verification') {
      res.json({ challenge });
      return;
    }

    // 处理消息事件
    if (type === 'event_callback' && event && event.message) {
      const message = event.message;
      const user_id = message.sender_id?.user_id;
      const text = message.message?.content ? JSON.parse(message.message.content).text : '';

      if (user_id && text) {
        console.log(`收到用户 ${user_id} 的消息: ${text}`);
        await handleMessage(user_id, text);
      }
    }

    res.json({ code: 0 });
  } catch (error) {
    console.error('处理消息失败:', error);
    res.json({ code: -1, message: 'error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✨ 星星人飞书机器人服务启动成功！`);
  console.log(`端口: ${PORT}`);
});
