/**
 * 聊天輸入清洗 — 防 Prompt Injection
 */

const INJECTION_PATTERNS = [
  /ignore\s*(all\s*)?(previous|above|prior|earlier)\s*(instructions?|prompts?|rules?|context)/gi,
  /disregard\s*(all\s*)?(previous|above|prior|earlier)/gi,
  /you\s+are\s+now\s/gi,
  /act\s+as\s+(a\s+)?/gi,
  /pretend\s+(you|to\s+be)/gi,
  /role\s*play\s+as/gi,
  /system\s*:\s*/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<\/?system>/gi,
  /<\/?prompt>/gi,
  /<<\s*SYS\s*>>/gi,
  /new\s+instructions?\s*:/gi,
  /override\s*(previous|all)?\s*(instructions?|rules?)/gi,
  /forget\s*(everything|all|previous)/gi,
  /do\s+not\s+follow\s+(the\s+)?(previous|above|system)/gi,
  /jailbreak/gi,
  /DAN\s+mode/gi,
  /developer\s+mode/gi,
];

const MAX_INPUT_LENGTH = 500;

export function sanitizeInput(text: string): string {
  // 截斷長度
  let clean = text.slice(0, MAX_INPUT_LENGTH).trim();

  // 過濾注入 pattern
  for (const pattern of INJECTION_PATTERNS) {
    clean = clean.replace(pattern, "[...]");
  }

  return clean;
}

/**
 * 檢查是否需要轉人工的關鍵字
 */
const ESCALATION_KEYWORDS = [
  "取消訂單", "取消", "退款", "退貨", "退錢",
  "投訴", "客訴", "申訴", "不滿", "很爛", "爛死",
  "找真人", "真人客服", "人工客服", "找人",
  "改地址", "改尺寸", "改數量", "修改訂單",
];

export function shouldEscalate(text: string): boolean {
  return ESCALATION_KEYWORDS.some((kw) => text.includes(kw));
}
