#!/usr/bin/env node

/**
 * 🦞 龍蝦藝術家 - 自動生成並上傳腳本（Node.js 版）
 * KIE Z-Image 生圖 → 下載 → 上傳龍蝦藝術網
 *
 * 用法：
 *   node lobster_upload.js                    # 3 張隨機風格
 *   node lobster_upload.js -n 5              # 5 張
 *   node lobster_upload.js -n 3 -s japanese  # 3 張日系
 *   node lobster_upload.js -n 2 -s street -p 1380  # 2 張街頭 NT$1380
 */

const fs = require("fs");
const path = require("path");

// ===== 設定 =====
const KIE_API_KEY = process.env.KIE_API_KEY || "73ed980107cc4400bdb5a0a62a98dfdd";
const KIE_API_URL = "https://api.kie.ai/api/v1/jobs";
const LOBSTER_API_URL = process.env.LOBSTER_API_URL || "https://ls-site-seven.vercel.app/api/products";
const LOBSTER_TOKEN = process.env.LOBSTER_API_KEY || "lob_a53fc24de4fb941cc7305712111eecbb35670c3cc9f24343";
const OUTPUT_DIR = "./lobster_output";
const LOG_DIR = "./logs";

// ===== 風格庫 =====
const STYLES = {
  japanese: {
    prefix: "Japanese ukiyo-e style illustration, traditional woodblock print aesthetic,",
    themes: [
      { en: "koi fish swimming in circular formation", zh: "錦鯉迴旋", desc: "浮世繪風格錦鯉，象徵吉祥與堅韌，優雅姿態在水中迴旋共舞" },
      { en: "samurai warrior with katana in dynamic pose", zh: "武士之魂", desc: "武士揮刀的動態瞬間，展現日本武道的力與美" },
      { en: "dragon soaring among clouds", zh: "雲中龍", desc: "祥龍穿越雲層，東方神話中最具力量的象徵" },
      { en: "crane flying gracefully over ocean waves", zh: "鶴舞浪間", desc: "白鶴翱翔於浪花之上，象徵長壽與優雅" },
      { en: "cherry blossom branch with petals falling", zh: "櫻吹雪", desc: "櫻花飄落的瞬間之美，轉瞬即逝的浪漫" },
      { en: "fierce oni mask surrounded by flowers", zh: "鬼面花開", desc: "鬼面與花的對比，凶猛與柔美的共存" },
      { en: "mount fuji at golden sunset", zh: "富士夕照", desc: "夕陽下的富士山，日本最具代表性的風景" },
      { en: "tanuki raccoon dog with umbrella", zh: "狸貓撐傘", desc: "可愛的狸貓撐著傘，日本民間傳說中的精靈" },
    ],
  },
  street: {
    prefix: "Urban street art style, graffiti-inspired, bold graphic, spray paint texture,",
    themes: [
      { en: "skull with roses and geometric patterns", zh: "骷髏玫瑰", desc: "街頭風格骷髏頭與玫瑰，死亡與美麗的街頭詩意" },
      { en: "boombox with musical notes exploding", zh: "音爆", desc: "音響爆發出的音符浪潮，街頭音樂的視覺化" },
      { en: "sneaker with angel wings", zh: "飛翼球鞋", desc: "球鞋長出翅膀，街頭文化中運動鞋的神聖地位" },
      { en: "wild tiger with neon outlines", zh: "霓虹猛虎", desc: "霓虹線條勾勒的猛虎，都市叢林中的王者" },
      { en: "lobster warrior with graffiti style", zh: "塗鴉龍蝦", desc: "街頭塗鴉風格的龍蝦戰士，品牌精神的街頭詮釋" },
      { en: "skateboard with flames and stars", zh: "烈焰滑板", desc: "火焰與星星裝飾的滑板，街頭少年的自由精神" },
    ],
  },
  minimal: {
    prefix: "Minimalist line art, single continuous line drawing, elegant simplicity,",
    themes: [
      { en: "cat face portrait with minimal lines", zh: "一筆貓", desc: "一筆畫出的貓咪輪廓，極簡中的溫柔" },
      { en: "mountain landscape with moon", zh: "月下山水", desc: "極簡線條勾勒月光下的山巒，留白之間盡是禪意" },
      { en: "coffee cup with rising steam", zh: "咖啡時光", desc: "簡單線條的咖啡杯與嫋嫋蒸氣，日常中的寧靜" },
      { en: "geometric fox made of triangles", zh: "幾何狐", desc: "三角形拼成的狐狸，幾何之美" },
      { en: "ocean wave single line art", zh: "一筆浪", desc: "一條線畫出的海浪，極簡的力量" },
      { en: "human face abstract portrait", zh: "抽象肖像", desc: "連續線條的人臉，每條線都是情感的表達" },
    ],
  },
  illustration: {
    prefix: "Hand-drawn illustration style, whimsical character design, storybook quality,",
    themes: [
      { en: "whale swimming in starry space", zh: "星際鯨魚", desc: "在星空中悠游的鯨魚，宇宙與海洋的奇幻交會" },
      { en: "mushroom forest with tiny creatures", zh: "蘑菇森林", desc: "巨大蘑菇下的微小生物，童話般的森林世界" },
      { en: "robot tending a garden", zh: "園藝機器人", desc: "機器人細心照料花園，科技與自然的溫暖共處" },
      { en: "fox reading books under a tree", zh: "閱讀狐狸", desc: "樹下讀書的狐狸，知識的浪漫" },
      { en: "octopus chef cooking", zh: "章魚大廚", desc: "八隻手臂同時料理的章魚廚師，忙碌卻快樂" },
      { en: "bear astronaut floating in space", zh: "太空熊", desc: "熊穿著太空衣漂浮在宇宙中，可愛的冒險精神" },
    ],
  },
  retro: {
    prefix: "Retro vintage style, 70s-80s aesthetic, nostalgic color palette,",
    themes: [
      { en: "sunset with palm trees silhouette", zh: "復古棕櫚", desc: "70年代夕陽棕櫚樹，焦橙與青綠的復古配色" },
      { en: "classic retro car side view", zh: "經典老車", desc: "復古跑車的側面輪廓，黃金年代的速度與自由" },
      { en: "vinyl record with music notes", zh: "黑膠唱片", desc: "旋轉的黑膠唱片，類比時代的音樂溫度" },
      { en: "roller skates with rainbow trail", zh: "彩虹溜冰", desc: "拖著彩虹尾巴的溜冰鞋，80年代的繽紛回憶" },
      { en: "retro arcade game machine", zh: "復古街機", desc: "像素風格的街機，電子遊戲的黃金年代" },
      { en: "cassette tape with flowers", zh: "花卉卡帶", desc: "卡式錄音帶與花朵，類比時代的浪漫" },
    ],
  },
  nature: {
    prefix: "Nature-inspired art, botanical illustration meets modern design,",
    themes: [
      { en: "monstera leaves arrangement", zh: "龜背芋", desc: "熱帶龜背芋的葉片排列，自然的幾何之美" },
      { en: "coral reef ecosystem", zh: "珊瑚礁", desc: "色彩繽紛的珊瑚礁生態，海洋生命的繁華" },
      { en: "butterfly collection display", zh: "蝶之標本", desc: "蝴蝶標本的精緻排列，自然界的藝術品" },
      { en: "mushroom varieties arrangement", zh: "蘑菇圖鑑", desc: "各種蘑菇的圖鑑式排列，大自然的奇妙設計" },
      { en: "moth and crescent moon", zh: "蛾與月", desc: "飛蛾與弦月的夜間邂逅，黑暗中的浪漫" },
      { en: "crystal formation cluster", zh: "水晶簇", desc: "水晶礦物的自然結晶，大地的寶藏" },
    ],
  },
  abstract: {
    prefix: "Abstract modern art, geometric shapes and organic forms, contemporary gallery style,",
    themes: [
      { en: "overlapping colorful circles", zh: "圓之交響", desc: "重疊的彩色圓形，色彩與形狀的和諧對話" },
      { en: "fluid marble texture pattern", zh: "流體大理石", desc: "流動的大理石紋路，液態藝術的凝結瞬間" },
      { en: "color block composition", zh: "色塊構成", desc: "大膽的色塊組合，現代藝術的純粹表達" },
      { en: "topographic contour lines", zh: "等高線", desc: "地形等高線的藝術化，大地的指紋" },
      { en: "brushstroke explosion of colors", zh: "筆觸爆發", desc: "色彩在畫布上爆發的瞬間，情感的視覺化" },
      { en: "spiral forms with gradient", zh: "漸層螺旋", desc: "漸層色彩的螺旋形態，無限與永恆的象徵" },
    ],
  },
  typography: {
    prefix: "Typographic art, creative lettering, text as visual element,",
    themes: [
      { en: "modern kanji calligraphy art", zh: "現代書法", desc: "漢字書法的現代詮釋，傳統與當代的碰撞" },
      { en: "stacked bold typography block", zh: "字型堆疊", desc: "大膽的字型堆疊，文字本身就是藝術" },
      { en: "3D text illusion design", zh: "立體文字", desc: "3D 立體錯覺文字，平面中的空間魔法" },
      { en: "graffiti style lettering art", zh: "塗鴉字型", desc: "街頭塗鴉風格的字型藝術，文字的叛逆表達" },
      { en: "deconstructed alphabet composition", zh: "解構字母", desc: "拆解重組的字母，文字的抽象化實驗" },
      { en: "pixel font retro game style", zh: "像素字型", desc: "復古遊戲風格的像素字型，8-bit 時代的懷舊" },
    ],
  },
};

const PROMPT_SUFFIX = "centered composition, pure design for apparel print, no text, no logo, no words, white background, highly detailed, 1024x1024";

// ===== 工具函式 =====
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function randomStyle() { return randomChoice(Object.keys(STYLES)); }

// ===== KIE API =====
async function kieCreate(prompt) {
  const res = await fetch(`${KIE_API_URL}/createTask`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${KIE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "z-image", input: { prompt, aspect_ratio: "1:1" } }),
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error(`KIE error: ${data.msg}`);
  return data.data.taskId;
}

async function kiePoll(taskId, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${KIE_API_URL}/recordInfo?taskId=${taskId}`, {
      headers: { "Authorization": `Bearer ${KIE_API_KEY}` },
    });
    const data = await res.json();
    const state = data.data?.state;

    process.stdout.write(`   ⏳ ${state || "waiting"} (${i + 1}/${maxAttempts})\r`);

    if (state === "success") {
      const result = JSON.parse(data.data.resultJson);
      console.log(`   ✅ 生成完成 (${data.data.costTime}s)`);
      return result.resultUrls[0];
    }
    if (state === "failed") throw new Error(`KIE failed: ${data.data.failMsg}`);

    await sleep(5000);
  }
  throw new Error("Timeout");
}

// ===== 下載圖片 =====
async function downloadImage(url, filepath) {
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filepath, buffer);
  return buffer.length;
}

// ===== 上傳到龍蝦藝術網 =====
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
  return res.json();
}

// ===== 主程式 =====
async function main() {
  // 解析參數
  const args = process.argv.slice(2);
  let count = 3, style = "", price = 1280;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-n") count = parseInt(args[++i]);
    if (args[i] === "-s") style = args[++i];
    if (args[i] === "-p") price = parseInt(args[++i]);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(LOG_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const logFile = path.join(LOG_DIR, `run_${timestamp}.json`);
  const results = [];

  console.log("");
  console.log("============================================");
  console.log("🦞 龍蝦藝術家 啟動（Z-Image）");
  console.log(`   數量: ${count} | 風格: ${style || "隨機"} | 售價: NT$${price}`);
  console.log(`   時間: ${new Date().toLocaleString("zh-TW")}`);
  console.log("============================================");
  console.log("");

  let success = 0, failed = 0;

  for (let i = 0; i < count; i++) {
    const currentStyle = style || randomStyle();
    const styleData = STYLES[currentStyle];
    const theme = randomChoice(styleData.themes);
    const prompt = `${styleData.prefix} ${theme.en}, ${PROMPT_SUFFIX}`;
    const filename = `design_${timestamp}_${i + 1}.jpg`;

    console.log(`--- [${i + 1}/${count}] ${theme.zh} (${currentStyle}) ---`);

    try {
      // Step 1: KIE 生圖
      console.log("   📤 KIE Z-Image 生成中...");
      const taskId = await kieCreate(prompt);
      console.log(`   Task: ${taskId}`);

      // Step 2: 等待完成
      const imageUrl = await kiePoll(taskId);

      // Step 3: 下載
      const filepath = path.join(OUTPUT_DIR, filename);
      const size = await downloadImage(imageUrl, filepath);
      console.log(`   📥 已下載 (${Math.round(size / 1024)}KB)`);

      // Step 4: 上傳
      console.log("   🦞 上傳中...");
      const result = await uploadToLobster(filepath, theme.zh, theme.desc, [currentStyle], price);
      console.log(`   ✅ 上傳成功！Mockup: ${result.mockups || 0} 張`);

      results.push({ title: theme.zh, style: currentStyle, theme: theme.en, taskId, status: "success" });
      success++;
    } catch (err) {
      console.log(`   ❌ 失敗: ${err.message}`);
      results.push({ title: theme.zh, style: currentStyle, status: "failed", error: err.message });
      failed++;
    }

    if (i < count - 1) await sleep(2000);
  }

  // 儲存 log
  fs.writeFileSync(logFile, JSON.stringify(results, null, 2), "utf-8");

  console.log("");
  console.log("============================================");
  console.log(`🦞 完成！成功: ${success} | 失敗: ${failed}`);
  console.log("============================================");
  console.log("");
  console.log("下一步：");
  console.log("  1. 到後台審核: https://ls-site-seven.vercel.app/admin/review");
  console.log("  2. 帳號: admin / changeme");
  console.log("  3. 好的點「上架」，不好的點「退回」");
  console.log("");
  console.log(`📋 Log: ${logFile}`);
}

main().catch(console.error);
