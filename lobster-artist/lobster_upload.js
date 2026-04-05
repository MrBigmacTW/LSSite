#!/usr/bin/env node

/**
 * 🦞 龍蝦藝術家 - AI 創意 + 自動生圖 + 上傳
 *
 * 流程：AI 想梗 → KIE Z-Image 生圖 → 上傳龍蝦藝術網
 *
 * 用法：
 *   node lobster_upload.js                    # 3 張，AI 自動想主題
 *   node lobster_upload.js -n 5              # 5 張
 *   node lobster_upload.js -n 3 -s japanese  # 3 張日系
 *   node lobster_upload.js --no-ai           # 不用 AI，用內建主題庫
 */

const fs = require("fs");
const path = require("path");
const { getExistingDesigns, addDesignRecord } = require("./gsheet");

// ===== 設定 =====
const KIE_API_KEY = process.env.KIE_API_KEY || (() => { throw new Error("請設定 KIE_API_KEY"); })();
const KIE_API_URL = "https://api.kie.ai/api/v1/jobs";
const LOBSTER_API_URL = process.env.LOBSTER_API_URL || "https://ls-site-seven.vercel.app/api/products";
const LOBSTER_TOKEN = process.env.LOBSTER_API_KEY || (() => { throw new Error("請設定 LOBSTER_API_KEY"); })();
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || "";
const OUTPUT_DIR = "./lobster_output";
const LOG_DIR = "./logs";

// ===== 工具 =====
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ===== AI 創意大腦 =====
const STYLE_LIST = ["japanese", "street", "minimal", "illustration", "retro", "nature", "abstract"];

async function aiGenerateDesigns(count, style, existingDesigns = []) {
  if (!OPENROUTER_KEY) {
    console.log("   ⚠️ 沒有 OPENROUTER_API_KEY，用內建主題庫");
    return null;
  }

  const styleHint = style ? `全部使用 ${style} 風格。` : "每張用不同的風格，從以下選擇：japanese, street, minimal, illustration, retro, nature, abstract。";

  // 排程的自訂 AI 指示
  const customPrompt = process.env.AI_PROMPT || "";

  // 把已有設計告訴 AI 避免重複
  let existingHint = "";
  if (existingDesigns.length > 0) {
    const titles = existingDesigns.map(d => d.title).join("、");
    existingHint = `\n\n⚠️ 以下設計已經做過了，絕對不要重複類似的主題：\n${titles}\n`;
  }

  const prompt = `你是一個徽章與貼紙設計師，專門創作琺瑯徽章（enamel pin）和貼紙圖案。請為今天生成 ${count} 個獨特的設計方案。

${styleHint}${existingHint}
${customPrompt ? `\n特別指示：${customPrompt}\n` : ""}
要求：
1. 每個設計的主題清晰，像一枚精緻的琺瑯徽章或貼紙
2. 構圖集中飽滿、白色背景、絕對不要任何文字或字母
3. 融合流行元素、季節感或文化梗，有收藏價值
4. 避免重複（不要每次都是錦鯉、龍蝦、富士山）
5. 主題可以是：動物、神話生物、自然景物、食物、符號、人物頭像、機械等

生圖 prompt 規則：
- 風格固定使用：enamel pin art style, bold outlines, flat colors
- 描述圖案本身的造型和色彩，不提及任何布料、印刷、服裝用途
- 人物只描述臉部或半身，不要描述穿著衣服

回傳純 JSON array，不要 markdown：
[
  {
    "style": "風格tag",
    "title": "中文商品名（2-6字，有記憶點）",
    "description": "中文設計理念（20-40字）",
    "prompt": "英文圖案描述（50-80字）"
  }
]`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
      }),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";

    // 解析 JSON（可能包在 markdown code block 裡）
    const jsonStr = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const designs = JSON.parse(jsonStr);

    console.log(`   🧠 AI 生成了 ${designs.length} 個設計方案`);
    return designs;
  } catch (err) {
    console.log(`   ⚠️ AI 生成失敗: ${err.message}，改用內建主題庫`);
    return null;
  }
}

// ===== 內建主題庫（fallback） =====
const PROMPT_SUFFIX = "enamel pin art style, bold clean outlines, flat vivid colors, pure white background, centered composition, no text, no letters, highly detailed, 1024x1024";

const FALLBACK_THEMES = {
  japanese: [
    { title: "錦鯉迴旋", desc: "浮世繪風格錦鯉共舞", prompt: "Japanese ukiyo-e style isolated graphic, koi fish swimming in circular formation, traditional woodblock print style, vibrant colors, white background, no clothing" },
    { title: "武士之魂", desc: "武士揮刀的動態瞬間", prompt: "Japanese ukiyo-e style isolated graphic, samurai warrior silhouette with katana in dynamic pose, bold ink outlines, white background, no clothing" },
    { title: "雲中龍", desc: "祥龍穿越雲層", prompt: "Japanese ukiyo-e style isolated graphic, dragon soaring among stylized clouds, traditional art, white background, no clothing" },
    { title: "櫻吹雪", desc: "櫻花飄落的瞬間之美", prompt: "Japanese ukiyo-e style isolated graphic, cherry blossom branch with petals falling, delicate illustration, white background, no clothing" },
  ],
  street: [
    { title: "骷髏玫瑰", desc: "街頭風骷髏與玫瑰", prompt: "Isolated graphic, urban street art style skull with roses and geometric patterns, graffiti illustration, bold colors, white background, no clothing" },
    { title: "霓虹猛虎", desc: "霓虹線條的猛虎", prompt: "Isolated graphic, wild tiger face with neon outlines, spray paint texture illustration, bold graphic, white background, no clothing" },
    { title: "塗鴉龍蝦", desc: "街頭塗鴉風格龍蝦", prompt: "Isolated graphic, lobster warrior graffiti illustration style, bold neon colors, urban art, white background, no clothing" },
  ],
  minimal: [
    { title: "一筆貓", desc: "一筆畫出的貓咪", prompt: "Isolated graphic, minimalist line art cat face portrait with single continuous line, elegant simplicity, white background, no clothing" },
    { title: "月下山水", desc: "極簡線條山巒與月", prompt: "Isolated graphic, minimalist line art mountain landscape with crescent moon, single line drawing, white background, no clothing" },
  ],
  illustration: [
    { title: "星際鯨魚", desc: "星空中悠游的鯨魚", prompt: "Isolated graphic, hand-drawn illustration of a whale swimming in starry space, whimsical storybook style, white background, no clothing" },
    { title: "章魚大廚", desc: "八隻手臂同時料理", prompt: "Isolated graphic, hand-drawn illustration of octopus chef cooking with all tentacles, charming character design, white background, no clothing" },
  ],
  retro: [
    { title: "復古棕櫚", desc: "70年代夕陽棕櫚", prompt: "Isolated graphic, retro vintage style sunset with palm trees silhouette, 70s-80s aesthetic, burnt orange and teal, white background, no clothing" },
    { title: "黑膠唱片", desc: "旋轉的黑膠唱片", prompt: "Isolated graphic, retro vintage style vinyl record with music notes, nostalgic color palette, white background, no clothing" },
  ],
  nature: [
    { title: "蝶之標本", desc: "蝴蝶標本的精緻排列", prompt: "Isolated graphic, nature botanical art butterfly collection display, detailed scientific illustration style, white background, no clothing" },
    { title: "蛾與月", desc: "飛蛾與弦月的夜間邂逅", prompt: "Isolated graphic, moth and crescent moon, dark botanical illustration, mystical design, white background, no clothing" },
  ],
  abstract: [
    { title: "圓之交響", desc: "重疊的彩色圓形", prompt: "Isolated graphic, abstract modern art overlapping colorful circles, bold composition, contemporary gallery style, white background, no clothing" },
    { title: "流體大理石", desc: "液態藝術的凝結瞬間", prompt: "Isolated graphic, abstract fluid marble texture pattern, swirling colors, modern design, white background, no clothing" },
  ],
};

function getFallbackDesigns(count, style) {
  const designs = [];
  for (let i = 0; i < count; i++) {
    const s = style || randomChoice(STYLE_LIST);
    const themes = FALLBACK_THEMES[s] || FALLBACK_THEMES.japanese;
    const theme = randomChoice(themes);
    designs.push({
      style: s,
      title: theme.title,
      description: theme.desc,
      prompt: `${theme.prompt}, ${PROMPT_SUFFIX}`,
    });
  }
  return designs;
}

// ===== Prompt 清洗（移除衣服相關詞彙，避免生成 T-shirt mockup）=====
function sanitizePrompt(prompt) {
  // 移除「T-shirt design」及各種衣服描述
  const apparel = [
    /\bT-shirt design\b/gi,
    /\bt-shirt\b/gi,
    /\bshirt design\b/gi,
    /\bapparel design\b/gi,
    /\bgarment\b/gi,
    /\bfeaturing on (?:a |the )?(?:shirt|tee|apparel)\b/gi,
    /\bprinted on\b/gi,
    /\bworn by\b/gi,
    /\bon (?:a |the )?fabric\b/gi,
  ];
  let clean = prompt;
  for (const re of apparel) {
    clean = clean.replace(re, "enamel pin");
  }
  // 確保風格前綴正確
  if (!/\benamel pin\b/i.test(clean)) {
    clean = "Enamel pin art style: " + clean;
  }
  return clean.replace(/\s{2,}/g, " ").trim();
}

// ===== KIE API =====
async function kieCreate(prompt) {
  const res = await fetch(`${KIE_API_URL}/createTask`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${KIE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "z-image", input: { prompt, aspect_ratio: "1:1" } }),
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error(`KIE: ${data.msg}`);
  return data.data.taskId;
}

async function kiePoll(taskId) {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${KIE_API_URL}/recordInfo?taskId=${taskId}`, {
        headers: { "Authorization": `Bearer ${KIE_API_KEY}` },
      });
      const text = await res.text();
      const data = JSON.parse(text);
      const state = data.data?.state;
      process.stdout.write(`   ⏳ ${state || "waiting"} (${i + 1}/60)\r`);
      if (state === "success") {
        const result = JSON.parse(data.data.resultJson);
        console.log(`   ✅ 生成完成 (${data.data.costTime}s)      `);
        return result.resultUrls[0];
      }
      if (state === "failed") throw new Error(data.data.failMsg || "failed");
    } catch (e) {
      if (e instanceof Error && e.message.includes("failed")) throw e;
      console.log(`   ⚠️ polling 異常，重試... (${e})`);
    }
    await sleep(5000);
  }
  throw new Error("Timeout");
}

// ===== 上傳 =====
async function uploadToLobster(filepath, title, description, tags, price) {
  const fileData = fs.readFileSync(filepath);
  const form = new FormData();
  form.append("title", title);
  form.append("description", description);
  form.append("price", String(price));
  form.append("tags", JSON.stringify(tags));
  form.append("source", "lobster");
  form.append("design_image", new Blob([fileData]), path.basename(filepath));

  const res = await fetch(LOBSTER_API_URL, {
    method: "POST",
    headers: { "Authorization": `Bearer ${LOBSTER_TOKEN}` },
    body: form,
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`上傳失敗 (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
}

// ===== 主程式 =====
async function main() {
  const args = process.argv.slice(2);
  let count = 3, style = "", price = 1280, noAi = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-n") count = parseInt(args[++i]);
    if (args[i] === "-s") style = args[++i];
    if (args[i] === "-p") price = parseInt(args[++i]);
    if (args[i] === "--no-ai") noAi = true;
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(LOG_DIR, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  console.log("");
  console.log("============================================");
  console.log("🦞 龍蝦藝術家 啟動");
  console.log(`   數量: ${count} | 風格: ${style || "隨機"} | AI: ${noAi ? "關閉" : "開啟"}`);
  console.log("============================================");

  // Step 0: 讀取 Notion 已有設計（防重複）
  console.log("\n📋 Step 0: 讀取 Notion 記錄...");
  const existingDesigns = await getExistingDesigns();
  if (existingDesigns.length > 0) {
    console.log(`   已有 ${existingDesigns.length} 個設計，AI 會避開這些主題`);
  } else {
    console.log("   無 Notion 記錄（或未設定），跳過防重複");
  }

  // Step 1: AI 想梗（或用 fallback）
  console.log("\n🧠 Step 1: 生成設計方案...");
  let designs;
  if (!noAi) {
    designs = await aiGenerateDesigns(count, style, existingDesigns);
  }
  if (!designs) {
    designs = getFallbackDesigns(count, style);
    console.log(`   📦 使用內建主題庫 (${designs.length} 個)`);
  }

  // Step 2-4: 逐個生圖 + 上傳
  let success = 0, failed = 0;
  const results = [];

  for (let i = 0; i < designs.length; i++) {
    const d = designs[i];
    const rawPrompt = d.prompt.includes("white background") ? d.prompt : `${d.prompt}, ${PROMPT_SUFFIX}`;
    const fullPrompt = sanitizePrompt(rawPrompt);
    if (rawPrompt !== fullPrompt) {
      console.log(`   🧹 Prompt 清洗: 已移除衣服相關詞彙`);
    }

    console.log(`\n--- [${i + 1}/${designs.length}] ${d.title} (${d.style}) ---`);
    console.log(`   💡 ${d.description}`);

    try {
      console.log("   📤 KIE Z-Image 生成中...");
      const taskId = await kieCreate(fullPrompt);
      const imageUrl = await kiePoll(taskId);

      const filename = `design_${ts}_${i + 1}.jpg`;
      const filepath = path.join(OUTPUT_DIR, filename);
      const imgRes = await fetch(imageUrl);
      const rawBuffer = Buffer.from(await imgRes.arrayBuffer());

      // 壓縮到 2MB 以下（Vercel 限制 4.5MB）
      let finalBuffer = rawBuffer;
      if (rawBuffer.length > 2 * 1024 * 1024) {
        try {
          const sharp = require("sharp");
          finalBuffer = await sharp(rawBuffer)
            .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toBuffer();
          console.log(`   📐 壓縮: ${Math.round(rawBuffer.length/1024)}KB → ${Math.round(finalBuffer.length/1024)}KB`);
        } catch {
          console.log(`   ⚠️ 無法壓縮（sharp 未安裝），用原始大小`);
        }
      }

      fs.writeFileSync(filepath, finalBuffer);
      console.log(`   📥 已下載 (${Math.round(finalBuffer.length/1024)}KB)`);

      console.log("   🦞 上傳中...");
      const result = await uploadToLobster(filepath, d.title, d.description, [d.style], price);
      console.log(`   ✅ 成功！Mockup: ${result.mockups || 0} 張`);

      // 寫回 Notion
      await addDesignRecord({
        title: d.title,
        style: d.style,
        prompt: fullPrompt,
        description: d.description,
        productId: result.id || "",
        status: "已生成",
      });

      results.push({ ...d, status: "success", id: result.id });
      success++;
    } catch (err) {
      console.log(`   ❌ ${err.message}`);
      results.push({ ...d, status: "failed", error: err.message });
      failed++;
    }

    if (i < designs.length - 1) await sleep(2000);
  }

  fs.writeFileSync(path.join(LOG_DIR, `run_${ts}.json`), JSON.stringify(results, null, 2), "utf-8");

  console.log("");
  console.log("============================================");
  console.log(`🦞 完成！成功: ${success} | 失敗: ${failed}`);
  console.log("============================================");
  console.log("後台審核: https://ls-site-seven.vercel.app/admin/review");
}

main().catch(console.error);
