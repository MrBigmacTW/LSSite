/**
 * Chat Tool 定義 — 只有 lookup_order
 * Server 端執行，LLM 永遠不直接碰 DB
 */

import { db } from "@/lib/db";

// ── OpenRouter / OpenAI 格式的 tool 定義 ──
export const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "lookup_order",
      description:
        "查詢客戶的訂單狀態。需要訂單編號和驗證資訊（email 或手機）。",
      parameters: {
        type: "object",
        properties: {
          orderNo: {
            type: "string",
            description: "訂單編號，格式如 LS20260405001",
          },
          verifyType: {
            type: "string",
            enum: ["email", "phone"],
            description: "驗證方式：email 或 phone",
          },
          verifyValue: {
            type: "string",
            description: "用於驗證身分的 email 地址或手機號碼",
          },
        },
        required: ["orderNo", "verifyType", "verifyValue"],
      },
    },
  },
];

// ── 訂單狀態翻譯 ──
const STATUS_LABELS: Record<string, string> = {
  pending: "待付款 💳",
  paid: "已付款，製作中 🎨",
  shipped: "已出貨 📦",
  completed: "已完成 ✅",
  cancelled: "已取消 ❌",
};

// ── Tool 執行器 ──
export async function executeTool(
  name: string,
  args: Record<string, string>
): Promise<string> {
  if (name === "lookup_order") {
    return await lookupOrder(args);
  }
  return "未知的工具呼叫";
}

async function lookupOrder(args: Record<string, string>): Promise<string> {
  const { orderNo, verifyType, verifyValue } = args;

  // 參數驗證
  if (!orderNo || !verifyType || !verifyValue) {
    return "缺少必要資訊。需要訂單編號和驗證資訊（email 或手機）。";
  }

  // 只允許查詢，不允許 SQL injection
  const safeOrderNo = orderNo.replace(/[^a-zA-Z0-9]/g, "").slice(0, 30);
  const safeValue = verifyValue.replace(/[^\w@.+\-]/g, "").slice(0, 100);

  try {
    // 查訂單
    const result = await db.execute({
      sql: 'SELECT * FROM "Order" WHERE orderNo = ?',
      args: [safeOrderNo],
    });

    if (result.rows.length === 0) {
      return `找不到訂單編號 ${safeOrderNo}，請確認編號是否正確。`;
    }

    const order = result.rows[0];

    // 驗證身分
    const dbValue =
      verifyType === "email"
        ? String(order.email || "")
        : String(order.phone || "");

    if (dbValue.toLowerCase() !== safeValue.toLowerCase()) {
      return "驗證失敗，提供的 email 或手機與訂單記錄不符。請確認您的資訊是否正確。";
    }

    // 查訂單品項
    const items = await db.execute({
      sql: "SELECT title, size, quantity, price FROM OrderItem WHERE orderId = ?",
      args: [order.id],
    });

    const itemList = items.rows
      .map((i) => `- ${i.title}（${i.size}）x${i.quantity} NT$${i.price}`)
      .join("\n");

    const status = STATUS_LABELS[String(order.status)] || String(order.status);
    const createdAt = String(order.createdAt || "").slice(0, 10);
    const paidAt = order.paidAt
      ? String(order.paidAt).slice(0, 10)
      : null;

    let response = `訂單 ${safeOrderNo} 的資訊：\n`;
    response += `狀態：${status}\n`;
    response += `下單日期：${createdAt}\n`;
    if (paidAt) response += `付款日期：${paidAt}\n`;
    response += `商品：\n${itemList}\n`;
    response += `總金額：NT$${order.totalAmount}`;

    return response;
  } catch (err) {
    console.error("lookup_order error:", err);
    return "查詢時發生錯誤，請稍後再試或聯繫客服。";
  }
}
