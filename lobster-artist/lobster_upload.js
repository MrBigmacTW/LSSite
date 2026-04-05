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

  const prompt = `你是一個 T-shirt 設計的藝術總監。請為今天生成 ${count} 個獨特的設計方案。

${styleHint}${existingHint}
${customPrompt ? `\n特別指示：${customPrompt}\n` : ""}
要求：
1. 每個設計要有明確的視覺主題，適合印在衣服上
2. 構圖集中、白色背景、不要有文字
3. 結合時下流行元素、季節感、或文化梗
4. 避免重複常見的主題（不要每次都是錦鯉、龍蝦、富士山）
5. 要有記憶點，讓人看到會想穿的設計

回傳純 JSON array，不要 markdown：
[
  {
    "style": "風格tag",
    "title": "中文商品名（2-6字，有記憶點）",
    "description": "中文設計理念（20-40字）",
    "prompt": "英文 FLUX prompt（50-80字，描述視覺細節）"
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
const PROMPT_SUFFIX = "centered composition, pure design for apparel print, no text, no logo, no words, white background, highly detailed, 1024x1024";

const FALLBACK_THEMES = {
  japanese: [
    { title: "錦鯉迴旋", desc: "浮世繪風格錦鯉共舞", prompt: "Japanese ukiyo-e style, koi fish swimming in circular formation, traditional woodblock print, vibrant colors" },
    { title: "武士之魂", desc: "武士揮刀的動態瞬間", prompt: "Japanese ukiyo-e style, samurai warrior with katana in dynamic pose, bold ink outlines" },
    { title: "雲中龍", desc: "祥龍穿越雲層", prompt: "Japanese ukiyo-e style, dragon soaring among clouds, traditional art" },
    { title: "櫻吹雪", desc: "櫻花飄落的瞬間之美", prompt: "Japanese ukiyo-e style, cherry blossom branch with petals falling, delicate beauty" },
  ],
  street: [
    { title: "骷髏玫瑰", desc: "街頭風骷髏與玫瑰", prompt: "Urban street art, skull with roses and geometric patterns, graffiti style, bold colors" },
    { title: "霓虹猛虎", desc: "霓虹線條的猛虎", prompt: "Urban street art, wild tiger with neon outlines, spray paint texture, bold graphic" },
    { title: "塗鴉龍蝦", desc: "街頭塗鴉風格龍蝦", prompt: "Urban street art, lobster warrior graffiti style, bold neon colors, spray paint" },
  ],
  minimal: [
    { title: "一筆貓", desc: "一筆畫出的貓咪", prompt: "Minimalist line art, cat face portrait with single continuous line, elegant simplicity" },
    { title: "月下山水", desc: "極簡線條山巒與月", prompt: "Minimalist line art, mountain landscape with crescent moon, single line drawing" },
  ],
  illustration: [
    { title: "星際鯨魚", desc: "星空中悠游的鯨魚", prompt: "Hand-drawn illustration, whale swimming in starry space, whimsical storybook style" },
    { title: "章魚大廚", desc: "八隻手臂同時料理", prompt: "Hand-drawn illustration, octopus chef cooking with all tentacles, charming character" },
  ],
  retro: [
    { title: "復古棕櫚", desc: "70年代夕陽棕櫚", prompt: "Retro vintage style, sunset with palm trees silhouette, 70s-80s aesthetic, burnt orange and teal" },
    { title: "黑膠唱片", desc: "旋轉的黑膠唱片", prompt: "Retro vintage style, vinyl record with music notes, nostalgic color palette" },
  ],
  nature: [
    { title: "蝶之標本", desc: "蝴蝶標本的精緻排列", prompt: "Nature botanical art, butterfly collection display, detailed scientific illustration style" },
    { title: "蛾與月", desc: "飛蛾與弦月的夜間邂逅", prompt: "Nature art, moth and crescent moon, dark botanical illustration, mystical" },
  ],
  abstract: [
    { title: "圓之交響", desc: "重疊的彩色圓形", prompt: "Abstract modern art, overlapping colorful circles, bold composition, contemporary gallery style" },
    { title: "流體大理石", desc: "液態藝術的凝結瞬間", prompt: "Abstract art, fluid marble texture pattern, swirling colors, modern design" },
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
    const fullPrompt = d.prompt.includes("white background") ? d.prompt : `${d.prompt}, ${PROMPT_SUFFIX}`;

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
