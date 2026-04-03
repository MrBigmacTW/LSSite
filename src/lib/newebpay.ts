/**
 * 藍新金流 NewebPay 工具
 * 文件：https://www.newebpay.com/website/Page/content/download_api
 */

import crypto from "crypto";

const MERCHANT_ID = process.env.NEWEBPAY_MERCHANT_ID || "";
const HASH_KEY = process.env.NEWEBPAY_HASH_KEY || "";
const HASH_IV = process.env.NEWEBPAY_HASH_IV || "";

// 測試環境用 ccore，正式環境用 core
const PAY_GATEWAY =
  process.env.NEWEBPAY_ENV === "production"
    ? "https://core.newebpay.com/MPG/mpg_gateway"
    : "https://ccore.newebpay.com/MPG/mpg_gateway";

export function isConfigured(): boolean {
  return !!(MERCHANT_ID && HASH_KEY && HASH_IV);
}

/** AES-256-CBC 加密 */
function aesEncrypt(data: string): string {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(HASH_KEY),
    Buffer.from(HASH_IV)
  );
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

/** SHA256 雜湊 */
function shaEncrypt(aesEncrypted: string): string {
  const plainText = `HashKey=${HASH_KEY}&${aesEncrypted}&HashIV=${HASH_IV}`;
  return crypto.createHash("sha256").update(plainText).digest("hex").toUpperCase();
}

/** AES-256-CBC 解密 */
export function aesDecrypt(encrypted: string): string {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(HASH_KEY),
    Buffer.from(HASH_IV)
  );
  decipher.setAutoPadding(false);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  // 移除 PKCS7 padding
  return decrypted.replace(/[\x00-\x1F]+$/g, "");
}

export interface PaymentParams {
  orderNo: string;
  amount: number;
  itemDesc: string;
  email: string;
}

/**
 * 產生藍新付款所需的表單資料
 * 前端拿到後用隱藏 form 自動 POST 到藍新
 */
export function generatePaymentForm(params: PaymentParams) {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  // 組合交易資訊字串
  const tradeInfo = [
    `MerchantID=${MERCHANT_ID}`,
    `RespondType=JSON`,
    `TimeStamp=${Math.floor(Date.now() / 1000)}`,
    `Version=2.0`,
    `MerchantOrderNo=${params.orderNo}`,
    `Amt=${params.amount}`,
    `ItemDesc=${encodeURIComponent(params.itemDesc)}`,
    `Email=${encodeURIComponent(params.email)}`,
    `ReturnURL=${encodeURIComponent(`${baseUrl}/api/payment/return`)}`,
    `NotifyURL=${encodeURIComponent(`${baseUrl}/api/payment/notify`)}`,
    `ClientBackURL=${encodeURIComponent(`${baseUrl}/checkout/success?orderNo=${params.orderNo}`)}`,
    `CREDIT=1`,
    `WEBATM=1`,
  ].join("&");

  const aesEncrypted = aesEncrypt(tradeInfo);
  const shaEncrypted = shaEncrypt(aesEncrypted);

  return {
    payGateway: PAY_GATEWAY,
    formData: {
      MerchantID: MERCHANT_ID,
      TradeInfo: aesEncrypted,
      TradeSha: shaEncrypted,
      Version: "2.0",
    },
  };
}

/**
 * 解密藍新回傳的 TradeInfo
 */
export function decryptTradeInfo(tradeInfo: string) {
  const decrypted = aesDecrypt(tradeInfo);
  return JSON.parse(decrypted);
}
