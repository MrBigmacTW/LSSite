/**
 * POC 對話 seed helpers — 對應新版 3 題 intake
 *
 * 把 intake 答案組成「seed 對話訊息」（第一則 user + 第一則 assistant）
 */

import type { IntakeAnswers } from "@/app/studio-poc/components/IntakeForm";

export interface Msg {
  role: "user" | "assistant";
  content: string;
}

export function buildSeedMessage(intake: IntakeAnswers): string {
  return [`風格：${intake.styleLabel}`, `氣氛：${intake.moodLabel}`]
    .map((p) => `- ${p}`)
    .join("\n");
}

export function buildOpening(intake: IntakeAnswers): string {
  return `了解！你想要的是${intake.moodLabel}的${intake.styleLabel}設計 ✨

最關鍵的問題：**設計的主題（main subject）想要什麼？**

例如：
- 一隻可愛橘貓 / 戴墨鏡的紅貴賓
- 一個彈吉他的剪影 / 老房子 / 山脈
- 抽象幾何 / 星空 / 海浪
- 文字標語 / 名字 / 紀念日期

越具體越好，姿勢、表情、配件都可以說 — 我會把細節挖出來再開始畫。

（配色我會依風格自動搭配，你進入預覽後也可以再用 AI 改色 / 換背景）`;
}

export function seedMessagesFromIntake(intake: IntakeAnswers): Msg[] {
  return [
    { role: "user", content: buildSeedMessage(intake) },
    { role: "assistant", content: buildOpening(intake) },
  ];
}
