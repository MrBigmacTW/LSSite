/**
 * 訂單確認 Email（用 Resend 寄送）
 */

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev"; // 用自己的域名更好

interface OrderItem {
  title: string;
  size: string;
  quantity: number;
  price: number;
  mockupUrl?: string;
}

interface OrderEmailData {
  orderNo: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  totalAmount: number;
  items: OrderItem[];
}

export async function sendOrderConfirmation(order: OrderEmailData) {
  if (!process.env.RESEND_API_KEY) {
    console.log("⚠️ RESEND_API_KEY 未設定，跳過寄信");
    return;
  }

  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #333;">
          ${item.mockupUrl ? `<img src="${item.mockupUrl}" width="60" height="60" style="object-fit:contain;background:#111;border-radius:4px;" />` : ""}
        </td>
        <td style="padding:12px;border-bottom:1px solid #333;color:#F0EDE6;">
          <strong>${item.title}</strong><br/>
          <span style="color:#A8A49C;font-size:13px;">尺寸：${item.size}</span>
        </td>
        <td style="padding:12px;border-bottom:1px solid #333;color:#A8A49C;text-align:center;">
          x${item.quantity}
        </td>
        <td style="padding:12px;border-bottom:1px solid #333;color:#F0EDE6;text-align:right;">
          NT$ ${(item.price * item.quantity).toLocaleString()}
        </td>
      </tr>`
    )
    .join("");

  const html = `
  <div style="max-width:600px;margin:0 auto;background:#0A0A0A;padding:40px 30px;font-family:'Helvetica Neue',Arial,sans-serif;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#E8432A;font-size:18px;letter-spacing:4px;margin:0;">
        LOBSTER <span style="color:#F0EDE6;">ART</span>
      </h1>
    </div>

    <!-- Title -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="width:48px;height:48px;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3);border-radius:4px;margin:0 auto 16px;line-height:48px;font-size:24px;">✓</div>
      <h2 style="color:#F0EDE6;font-size:22px;margin:0 0 8px;">付款成功</h2>
      <p style="color:#A8A49C;font-size:14px;margin:0;">訂單編號：<strong style="color:#F0EDE6;">${order.orderNo}</strong></p>
    </div>

    <!-- Order Items -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <thead>
        <tr style="border-bottom:2px solid #333;">
          <th style="padding:8px 12px;color:#6B6760;font-size:11px;text-align:left;letter-spacing:1px;width:60px;">圖片</th>
          <th style="padding:8px 12px;color:#6B6760;font-size:11px;text-align:left;letter-spacing:1px;">商品</th>
          <th style="padding:8px 12px;color:#6B6760;font-size:11px;text-align:center;letter-spacing:1px;">數量</th>
          <th style="padding:8px 12px;color:#6B6760;font-size:11px;text-align:right;letter-spacing:1px;">小計</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <!-- Total -->
    <div style="text-align:right;padding:16px 12px;border-top:2px solid #333;margin-bottom:32px;">
      <span style="color:#A8A49C;font-size:14px;">總計</span>
      <span style="color:#F0EDE6;font-size:24px;font-weight:bold;margin-left:16px;">NT$ ${order.totalAmount.toLocaleString()}</span>
    </div>

    <!-- Shipping Info -->
    <div style="background:#111;border:1px solid #1A1A1A;padding:20px;margin-bottom:32px;">
      <h3 style="color:#C9A96E;font-size:11px;letter-spacing:2px;margin:0 0 12px;">收件資訊</h3>
      <p style="color:#F0EDE6;margin:4px 0;font-size:14px;">${order.name}</p>
      <p style="color:#A8A49C;margin:4px 0;font-size:13px;">${order.phone}</p>
      <p style="color:#A8A49C;margin:4px 0;font-size:13px;">${order.address}</p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;border-top:1px solid #1A1A1A;padding-top:24px;">
      <p style="color:#6B6760;font-size:11px;letter-spacing:1px;margin:0;">
        LOBSTER ART 2026
      </p>
      <p style="color:#6B6760;font-size:11px;margin:8px 0 0;">
        有任何問題請回覆此信件
      </p>
    </div>
  </div>`;

  try {
    await resend.emails.send({
      from: `龍蝦藝術網 <${FROM_EMAIL}>`,
      to: order.email,
      subject: `訂單確認 ${order.orderNo} — 龍蝦藝術網`,
      html,
    });
    console.log(`📧 確認信已寄送: ${order.email}`);
  } catch (err) {
    console.error("📧 寄信失敗:", err);
  }
}
