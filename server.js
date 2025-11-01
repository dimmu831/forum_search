const express = require('express');
const cors = require('cors');
const getJson = require('serpapi').getJson;
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

/**
 * 使用 SerpAPI 搜尋 Google 結果
 */
async function searchGoogle(keyword, site) {
  try {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      console.error('SERPAPI_API_KEY not found');
      return [];
    }

    const query = `${keyword} site:${site}`;
    
    console.log(`[${site}] Searching: ${query}`);

    const results = await getJson({
      api_key: apiKey,
      q: query,
      num: 10,
      engine: 'google'
    });

    if (!results.organic_results) {
      console.log(`[${site}] No organic results found`);
      return [];
    }

    // 提取標題和連結
    const items = results.organic_results
      .filter(result => result.title && result.link)
      .map(result => ({
        title: result.title,
        url: result.link
      }))
      .slice(0, 10);

    console.log(`[${site}] Found ${items.length} results`);

    return items;
  } catch (error) {
    console.error(`[${site}] Error searching:`, error.message);
    return [];
  }
}

/**
 * API 端點：搜尋
 */
app.post('/api/search', async (req, res) => {
  try {
    const { keyword } = req.body;

    if (!keyword || keyword.trim() === '') {
      return res.status(400).json({ error: '關鍵字不能為空' });
    }

    const forums = [
      { name: 'Dcard', site: 'dcard.tw' },
      { name: 'PTT', site: 'ptt.cc' },
      { name: 'Mobile01', site: 'mobile01.com' },
    ];

    const results = {};

    // 並行搜尋所有論壇
    const promises = forums.map(async ({ name, site }) => {
      const items = await searchGoogle(keyword, site);
      results[name] = items;
    });

    await Promise.all(promises);

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: '搜尋失敗' });
  }
});

/**
 * 健康檢查
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;

// 啟動伺服器
const server = app.listen(PORT, () => {
  console.log(`[INFO] Server running on port ${PORT}`);
  console.log(`[INFO] SERPAPI_API_KEY: ${process.env.SERPAPI_API_KEY ? '✓ Set' : '✗ Not set'}`);
});

// 錯誤處理
server.on('error', (err) => {
  console.error('[ERROR] Server error:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[ERROR] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[ERROR] Uncaught Exception:', error);
  process.exit(1);
});
