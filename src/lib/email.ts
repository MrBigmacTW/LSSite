/**
 * 訂單 Email 系統（Resend）
 * 付款成功時寄出三封信：客戶確認 / 印刷廠通知 / 老闆通知
 */

import { Resend } from "resend";
import { db } from "./db";

const resend = new Resend(process.env.RESEND_API_KEY || "");
const FROM = process.env.FROM_EMAIL || "onboarding@resend.dev";

interface OrderItem {
  title: string;
  size: string;
  quantity: number;
  price: number;
  mockupUrl?: string;
  designUrl?: string; // 原始設計圖 URL（給印刷廠用）
  productId?: string;
}

interface OrderData {
  orderNo: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  totalAmount: number;
  items: OrderItem[];
}

interface EmailConfig {
  id: string;
  name: string;
  enabled: number;
  recipientType: string;
  recipientEmail: string;
  subject: string;
  headerText: string;
  footerText: string;
}

// 讀取 Email 設定
async function getEmailConfigs(): Promise<EmailConfig[]> {
  const result = await db.execute("SELECT * FROM EmailConfig WHERE enabled = 1");
  return result.rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    enabled: r.enabled as number,
    recipientType: r.recipientType as string,
    recipientEmail: r.recipientEmail as string,
    subject: r.subject as string,
    headerText: r.headerText as string,
    footerText: r.footerText as string,
  }));
}

// 替換模板變數
function replaceVars(template: string, order: OrderData): string {
  return template
    .replace(/\{orderNo\}/g, order.orderNo)
    .replace(/\{name\}/g, order.name)
    .replace(/\{totalAmount\}/g, order.totalAmount.toLocaleString())
    .replace(/\{phone\}/g, order.phone)
    .replace(/\{email\}/g, order.email);
}

// 商品明細 HTML
function itemsTable(items: OrderItem[]): string {
  return items.map((item) => {
    const imgSrc = item.designUrl || item.mockupUrl || "";
    return `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #333;">
        ${imgSrc ? `<img src="${imgSrc}" width="50" height="50" style="object-fit:contain;background:#111;border-radius:4px;" />` : "—"}
      </td>`;
      <td style="padding:10px;border-bottom:1px solid #333;color:#F0EDE6;">
        <strong>${item.title}</strong><br/>
        <span style="color:#A8A49C;font-size:12px;">尺寸：${item.size}</span>
      </td>
      <td style="padding:10px;border-bottom:1px solid #333;color:#A8A49C;text-align:center;">x${item.quantity}</td>
      <td style="padding:10px;border-bottom:1px solid #333;color:#F0EDE6;text-align:right;">NT$ ${(item.price * item.quantity).toLocaleString()}</td>
    </tr>`;
  }).join("");
}

// 生成 Email HTML
function buildHtml(config: EmailConfig, order: OrderData, type: string): string {
  const header = replaceVars(config.headerText || "", order);
  const footer = replaceVars(config.footerText || "", order);
  const showAddress = type !== "printer"; // 印刷廠不需要看地址

  return `
  <div style="max-width:600px;margin:0 auto;background:#0A0A0A;padding:32px 24px;font-family:'Helvetica Neue',Arial,sans-serif;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="color:#E8432A;font-size:16px;letter-spacing:3px;font-weight:600;">LOBSTER</span>
      <span style="color:#F0EDE6;font-size:16px;letter-spacing:3px;font-weight:600;"> ART</span>
    </div>

    <div style="text-align:center;margin-bottom:24px;">
      <h2 style="color:#F0EDE6;font-size:18px;margin:0 0 6px;">${replaceVars(config.subject, order)}</h2>
      ${header ? `<p style="color:#A8A49C;font-size:13px;margin:0;">${header}</p>` : ""}
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <thead>
        <tr style="border-bottom:2px solid #333;">
          <th style="padding:6px 10px;color:#6B6760;font-size:10px;text-align:left;width:50px;">圖</th>
          <th style="padding:6px 10px;color:#6B6760;font-size:10px;text-align:left;">商品</th>
          <th style="padding:6px 10px;color:#6B6760;font-size:10px;text-align:center;">數量</th>
          <th style="padding:6px 10px;color:#6B6760;font-size:10px;text-align:right;">小計</th>
        </tr>
      </thead>
      <tbody>${itemsTable(order.items)}</tbody>
    </table>

    <div style="text-align:right;padding:12px;border-top:2px solid #333;margin-bottom:24px;">
      <span style="color:#A8A49C;font-size:13px;">總計</span>
      <span style="color:#F0EDE6;font-size:22px;font-weight:bold;margin-left:12px;">NT$ ${order.totalAmount.toLocaleString()}</span>
    </div>

    ${showAddress ? `
    <div style="background:#111;border:1px solid #1A1A1A;padding:16px;margin-bottom:24px;">
      <p style="color:#C9A96E;font-size:10px;letter-spacing:2px;margin:0 0 8px;">收件資訊</p>
      <p style="color:#F0EDE6;margin:3px 0;font-size:13px;">${order.name}</p>
      <p style="color:#A8A49C;margin:3px 0;font-size:12px;">${order.phone}</p>
      <p style="color:#A8A49C;margin:3px 0;font-size:12px;">${order.email}</p>
      <p style="color:#A8A49C;margin:3px 0;font-size:12px;">${order.address}</p>
    </div>` : ""}

    ${footer ? `<p style="color:#6B6760;font-size:11px;text-align:center;margin-top:20px;">${footer}</p>` : ""}
    <p style="color:#6B6760;font-size:10px;text-align:center;letter-spacing:1px;margin-top:16px;border-top:1px solid #1A1A1A;padding-top:16px;">LOBSTER ART 2026</p>
  </div>`;
}

/**
 * 付款成功時寄出所有 Email
 */
export async function sendAllOrderEmails(order: OrderData) {
  if (!process.env.RESEND_API_KEY) {
    console.log("⚠️ RESEND_API_KEY 未設定，跳過寄信");
    return;
  }

  const configs = await getEmailConfigs();

  for (const config of configs) {
    // 決定收件人
    let to: string;
    if (config.recipientType === "customer") {
      to = order.email;
    } else {
      to = config.recipientEmail;
      if (!to) {
        console.log(`⚠️ ${config.name}: 收件人未設定，跳過`);
        continue;
      }
    }

    const subject = replaceVars(config.subject, order);
    const html = buildHtml(config, order, config.id);

    try {
      // 印刷廠的信附加設計圖
      const attachments: { filename: string; content: Buffer }[] = [];
      if (config.id === "printer") {
        for (const item of order.items) {
          const imgUrl = item.designUrl || item.mockupUrl;
          if (imgUrl) {
            try {
              const imgRes = await fetch(imgUrl);
              if (imgRes.ok) {
                const buf = Buffer.from(await imgRes.arrayBuffer());
                const ext = imgUrl.includes(".png") ? "png" : "jpg";
                attachments.push({
                  filename: `${item.title}_${item.size}.${ext}`,
                  content: buf,
                });
              }
            } catch {}
          }
        }
      }

      await resend.emails.send({
        from: `龍蝦藝術網 <${FROM}>`,
        to,
        subject,
        html,
        ...(attachments.length > 0 ? { attachments } : {}),
      });
      console.log(`📧 ${config.name} → ${to}${attachments.length > 0 ? ` (${attachments.length} 附件)` : ""}`);
    } catch (err) {
      console.error(`📧 ${config.name} 寄送失敗:`, err);
    }
  }
}
