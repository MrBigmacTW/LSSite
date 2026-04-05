/**
 * 新增三個每日排程到 Turso DB
 * 執行：node seed-schedules.mjs
 */
import { createClient } from "@libsql/client";
import crypto from "crypto";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const schedules = [
  {
    // ── 風格1：浮世繪和風 ──
    // 日系圖騰系列，每天早上上架，主打傳統東方美學
    name: "浮世繪日系",
    hour: 9,
    count: 3,
    style: "japanese",
    price: 1280,
    prompt:
      "今天主題是【浮世繪神獸與自然】。" +
      "選擇以下其中一個方向：" +
      "（1）日本傳統神獸：九尾狐、天狗、河童、鬼、雷神、風神，搭配雲紋和波紋；" +
      "（2）四季自然：在暴風雨中的鷹、月下的白狼、雪中的鶴、夜晚的鯉魚躍龍門；" +
      "（3）戰國武將面具或兜（頭盔）的正面特寫，金屬質感與和紙紋理混搭。" +
      "風格要像葛飾北齋的版畫，強對比的靛藍、硃砂紅、墨黑配色，線條有力。",
  },
  {
    // ── 風格2：台灣本土自然 ──
    // 主打台灣認同，下午時段
    name: "台灣生態誌",
    hour: 14,
    count: 3,
    style: "nature",
    price: 1280,
    prompt:
      "今天主題是【台灣本土生態與原住民圖騰】。" +
      "選擇以下其中一個方向：" +
      "（1）台灣特有種動物頭像特寫：台灣黑熊、台灣藍鵲、石虎、台灣獼猴、穿山甲，" +
      "用精緻自然插畫風格，細節豐富，帶點懷舊博物館標本的感覺；" +
      "（2）原住民幾何圖騰：排灣族菱形紋、泰雅族祖靈眼、阿美族豐年祭圖騰，" +
      "色彩鮮豔，黑底金紅配色；" +
      "（3）台灣山林風景的極簡幾何化：玉山、太魯閣峽谷、阿里山雲海，" +
      "低多邊形 low-poly 藝術風格。" +
      "整體要有強烈的台灣在地認同感，可以讓外國遊客一眼認出是台灣的設計。",
  },
  {
    // ── 風格3：Y2K 復古未來 ──
    // 晚間時段，主打年輕潮流市場
    name: "Y2K 復古未來",
    hour: 20,
    count: 3,
    style: "retro",
    price: 1280,
    prompt:
      "今天主題是【Y2K 復古未來 × 科技懷舊】。" +
      "選擇以下其中一個方向：" +
      "（1）千禧年科技物件：GameBoy、磁片、CRT 螢幕、舊手機、CD 光碟，" +
      "用鉻金屬光澤和賽博色彩（青、品紅、銀）呈現，有點 vaporwave 感；" +
      "（2）Y2K 角色頭像：戴著老式耳機的機械少女頭部特寫、電子眼機器人臉、" +
      "霓虹色的骷髏頭加電路板，酷且帶點懷舊；" +
      "（3）復古電玩像素怪物的現代重繪：8-bit 風格的龍、外星人、太空船，" +
      "粗糙像素邊緣配上現代鮮豔漸層色彩，形成強烈對比。" +
      "整體要有 2000 年初的時代氛圍，帶點甜蜜的科技懷舊感。",
  },
];

async function main() {
  console.log("新增排程...\n");

  for (const s of schedules) {
    const id = `sch-${crypto.randomUUID().slice(0, 8)}`;
    await db.execute({
      sql: `INSERT OR IGNORE INTO Schedule
              (id, name, hour, count, style, prompt, price, enabled, sortOrder)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      args: [id, s.name, s.hour, s.count, s.style, s.prompt, s.price, s.hour],
    });
    console.log(`✅ ${String(s.hour).padStart(2,"0")}:00  ${s.name}  (${s.style}, ${s.count}張, NT$${s.price})`);
    console.log(`   Prompt: ${s.prompt.slice(0, 60)}...\n`);
  }

  // 列出全部排程確認
  const all = await db.execute('SELECT id, name, hour, style, count, enabled FROM Schedule ORDER BY hour');
  console.log("── 目前所有排程 ──");
  for (const r of all.rows) {
    console.log(`  ${String(r.hour).padStart(2,"0")}:00  ${r.name}  [${r.style}]  ${r.enabled ? "✅啟用" : "⏸停用"}`);
  }
}

main().catch(console.error);
