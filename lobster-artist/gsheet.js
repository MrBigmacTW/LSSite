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
  // 方法：用 Google Sheets API v4 append（需要 API Key）
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";

  if (GOOGLE_API_KEY) {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}!A:G:append?valueInputOption=USER_ENTERED&key=${GOOGLE_API_KEY}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values: [[
            design.title || "",
            design.style || "",
            design.status || "已生成",
            (design.prompt || "").slice(0, 500),
            design.description || "",
            new Date().toISOString().slice(0, 10),
            design.productId || "",
          ]],
        }),
      });

      if (res.ok) {
        console.log("   📝 已寫入 Google Sheet");
      } else {
        // API Key 方式失敗，試 fallback
        throw new Error(await res.text());
      }
    } catch (err) {
      console.log(`   ⚠️ Sheet API 寫入失敗: ${err.message}`);
      // Fallback: 輸出到 console 讓使用者手動貼
      console.log(`   📋 手動貼入 Sheet: ${design.title}\t${design.style}\t已生成\t${(design.prompt || "").slice(0, 100)}...\t${design.description}\t${new Date().toISOString().slice(0, 10)}\t${design.productId}`);
    }
  } else {
    // 沒有 API Key，直接輸出
    console.log(`   📋 [Sheet 記錄] ${design.title} | ${design.style} | ${design.productId}`);
  }
}

module.exports = { getExistingDesigns, addDesignRecord };
