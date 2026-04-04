/**
 * Notion 設計記錄管理
 *
 * 對應 Notion Database「龍蝦作品集」欄位：
 * - Name (title): 設計名稱（Notion 預設的 title 欄）
 * - 風格 (select): japanese/street/minimal/...
 * - 狀態 (select): 已生成/已上架/已退回
 * - Prompt (rich_text): 英文 prompt
 * - 設計理念 (rich_text): 中文描述
 * - 創造日期 (date): 生成日期
 * - 商品ID (rich_text): 網站上的 product ID
 */

const NOTION_KEY = process.env.NOTION_API_KEY || "";
const NOTION_DB = process.env.NOTION_DATABASE_ID || "";
const NOTION_API = "https://api.notion.com/v1";

async function notionFetch(endpoint, method = "GET", body = null) {
  const opts = {
    method,
    headers: {
      "Authorization": `Bearer ${NOTION_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${NOTION_API}${endpoint}`, opts);
  return res.json();
}

/**
 * 讀取所有已生成的設計（防重複用）
 */
async function getExistingDesigns() {
  if (!NOTION_KEY || !NOTION_DB) return [];

  try {
    const data = await notionFetch(`/databases/${NOTION_DB}/query`, "POST", {
      sorts: [{ property: "創造日期", direction: "descending" }],
      page_size: 100,
    });

    return (data.results || []).map((page) => ({
      title: page.properties["Name"]?.title?.[0]?.plain_text || "",
      style: page.properties["風格"]?.select?.name || "",
      prompt: page.properties["Prompt"]?.rich_text?.[0]?.plain_text || "",
      status: page.properties["狀態"]?.select?.name || "",
    }));
  } catch (err) {
    console.log(`   ⚠️ Notion 讀取失敗: ${err.message}`);
    return [];
  }
}

/**
 * 寫入新的設計記錄
 */
async function addDesignRecord(design) {
  if (!NOTION_KEY || !NOTION_DB) return;

  try {
    await notionFetch("/pages", "POST", {
      parent: { database_id: NOTION_DB },
      properties: {
        "Name": { title: [{ text: { content: design.title } }] },
        "風格": { select: { name: design.style } },
        "狀態": { select: { name: design.status || "已生成" } },
        "Prompt": { rich_text: [{ text: { content: (design.prompt || "").slice(0, 2000) } }] },
        "設計理念": { rich_text: [{ text: { content: design.description || "" } }] },
        "創造日期": { date: { start: new Date().toISOString().slice(0, 10) } },
        "商品ID": { rich_text: [{ text: { content: design.productId || "" } }] },
      },
    });
    console.log("   📝 已寫入 Notion");
  } catch (err) {
    console.log(`   ⚠️ Notion 寫入失敗: ${err.message}`);
  }
}

module.exports = { getExistingDesigns, addDesignRecord };
