/**
 * POC 對話 seed helpers
 *
 * 把 intake 答案組成「seed 對話訊息」（第一則 user + 第一則 assistant）
 * 抽出來放在 lib 是為了讓 StudioClient 也能呼叫（hoist messages state 後共用）
 */

import type { IntakeAnswers } from "@/app/studio-poc/components/IntakeForm";

export interface Msg {
  role: "user" | "assistant";
  content: string;
}

function humanizePurpose(value: string): string {
  const map: Record<string, string> = {
    "for personal wear": "自己穿",
    "as a gift": "送禮",
    "for a special occasion or memorial": "紀念日 / 特殊場合",
    "to commemorate a beloved pet": "紀念毛小孩",
    "for a group or event": "團體 / 活動",
  };
  return map[value] || value;
}

export function buildSeedMessage(intake: IntakeAnswers): string {
  const parts: string[] = [
    `想印在：${intake.shirtColorLabel}`,
    `用途：${humanizePurpose(intake.purpose)}`,
    `風格：${intake.style}`,
    `配色：${intake.colorPalette}`,
  ];
  if (intake.hasText === "yes" && intake.textContent) {
    parts.push(`要加文字：「${intake.textContent}」`);
  } else {
    parts.push("不加文字，純圖案");
  }
  return parts.map((p) => `- ${p}`).join("\n");
}

export function buildOpening(intake: IntakeAnswers): string {
  const hasText =
    intake.hasText === "yes" && intake.textContent
      ? `，會加上「${intake.textContent}」這個文字`
      : "";
  return `了解！你想要一件${intake.shirtColorLabel}的設計，看起來會是個很棒的方向${hasText} ✨\n\n再請教你一個關鍵問題：**設計的主題（main subject）想要什麼？**\n例如：一隻動物、一個人物、抽象元素、植物、食物、星空... 越具體越好。`;
}

export function seedMessagesFromIntake(intake: IntakeAnswers): Msg[] {
  return [
    { role: "user", content: buildSeedMessage(intake) },
    { role: "assistant", content: buildOpening(intake) },
  ];
}
