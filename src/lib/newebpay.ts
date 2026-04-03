/**
 * 藍新金流 NewebPay 工具函式
 *
 * 需要環境變數：
 * - NEWEBPAY_MERCHANT_ID
 * - NEWEBPAY_HASH_KEY
 * - NEWEBPAY_HASH_IV
 *
 * 等拿到商店帳號後啟用
 */

import crypto from "crypto";

const MERCHANT_ID = process.env.NEWEBPAY_MERCHANT_ID || "";
const HASH_KEY = process.env.NEWEBPAY_HASH_KEY || "";
const HASH_IV = process.env.NEWEBPAY_HASH_IV || "";

// 測試環境用 ccore.newebpay.com，正式用 core.newebpay.com
const API_URL = process.env.NEWEBPAY_API_URL || "https://ccore.newebpay.com/MPG/mpg_gateway";

export function isConfigured(): boolean {
  return !!(MERCHANT_ID && HASH_KEY && HASH_IV);
}

export function createAesEncrypt(data: string): string {
  const cipher = crypto.createCipheriv("aes-256-cbc", HASH_KEY, HASH_IV);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

export function createShaEncrypt(aesEncrypt: string): string {
  const sha = crypto.createHash("sha256");
  const plainText = `HashKey=${HASH_KEY}&${aesEncrypt}&HashIV=${HASH_IV}`;
  return sha.update(plainText).digest("hex").toUpperCase();
}

export function decryptAes(encrypted: string): string {
  const decipher = crypto.createDecipheriv("aes-256-cbc", HASH_KEY, HASH_IV);
  decipher.setAutoPadding(false);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted.replace(/[\x00-\x1F]+/g, ""); // Remove padding
}

export interface PaymentParams {
  orderNo: string;
  amount: number;
  description: string;
  email: string;
  returnUrl: string;
  notifyUrl: string;
}

export function generatePaymentData(params: PaymentParams) {
  const tradeInfo = [
    `MerchantID=${MERCHANT_ID}`,
    `RespondType=JSON`,
    `TimeStamp=${Math.floor(Date.now() / 1000)}`,
    `Version=2.0`,
    `MerchantOrderNo=${params.orderNo}`,
    `Amt=${params.amount}`,
    `ItemDesc=${encodeURIComponent(params.description)}`,
    `Email=${encodeURIComponent(params.email)}`,
    `ReturnURL=${encodeURIComponent(params.returnUrl)}`,
    `NotifyURL=${encodeURIComponent(params.notifyUrl)}`,
    `CREDIT=1`,
  ].join("&");

  const aesEncrypt = createAesEncrypt(tradeInfo);
  const shaEncrypt = createShaEncrypt(aesEncrypt);

  return {
    MerchantID: MERCHANT_ID,
    TradeInfo: aesEncrypt,
    TradeSha: shaEncrypt,
    Version: "2.0",
    PayGateWay: API_URL,
  };
}
