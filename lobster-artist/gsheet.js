/**
 * Google Sheet 設計記錄管理（免 OAuth，用公開 Sheet）
 *
 * Sheet 格式（第一行表頭）：
 * 名稱 | 風格 | 狀態 | Prompt | 設計理念 | 日期 | 商品ID
 */

const SHEET_ID = process.env.GOOGLE_SHEET_ID || "14gmf2VSva8ODDhhYiAh-ZxZ6bYtynioVGTIACJjEKeo";
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || "Sheet1";

// Google Sheet 公開 API（不需要 OAuth，Sheet 要設 Anyone with link = Editor）
const SHEET_API = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;

/**
 * 讀取所有已生成的設計（防重複用）
 */
async function getExistingDesigns() {
  try {
    const res = await fetch(SHEET_API);
    const text = await res.text();

    // Google 回傳格式是 google.visualization.Query.setResponse({...})
    const jsonStr = text.match(/google\.visualization\.Query\.setResponse\((.+)\)/)?.[1];
    if (!jsonStr) return [];

    const data = JSON.parse(jsonStr);
    const rows = data.table?.rows || [];

    // 跳過表頭（第一行），解析每一行
    return rows.map((row) => ({
      title: row.c?.[0]?.v || "",
      style: row.c?.[1]?.v || "",
      status: row.c?.[2]?.v || "",
      prompt: row.c?.[3]?.v || "",
      description: row.c?.[4]?.v || "",
      date: row.c?.[5]?.v || "",
      productId: row.c?.[6]?.v || "",
    })).filter(r => r.title); // 過濾空行
  } catch (err) {
    console.log(`   ⚠️ Google Sheet 讀取失敗: ${err.message}`);
    return [];
  }
}

/**
 * 新增一筆設計記錄到 Sheet（用 Google Apps Script Web App 或直接 append）
 */
async function addDesignRecord(design) {
  const WEBHOOK_URL = process.env.GOOGLE_SHEET_WEBHOOK || "https://script.google.com/macros/s/AKfycbzwOBQE7RTRyFhvpVueoM7S4yrOk6FXUYcNM5WNfByaeAKfqAj28GC4mLObrsT57LxpQA/exec";

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: design.title || "",
        style: design.style || "",
        status: design.status || "已生成",
        prompt: (design.prompt || "").slice(0, 500),
        description: design.description || "",
        date: new Date().toISOString().slice(0, 10),
        productId: design.productId || "",
      }),
    });
    if (res.ok) {
      console.log("   📝 已寫入 Google Sheet");
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    console.log(`   ⚠️ Sheet 寫入失敗: ${err.message}`);
  }
}

module.exports = { getExistingDesigns, addDesignRecord };
