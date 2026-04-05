import { createClient, type Client, type Row } from "@libsql/client";

// ── Turso client singleton ──
const globalForTurso = globalThis as unknown as { _turso?: Client };

function getClient(): Client {
  if (globalForTurso._turso) return globalForTurso._turso;

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || "file:prisma/dev.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  if (process.env.NODE_ENV !== "production") globalForTurso._turso = client;
  return client;
}

export const db = getClient();

// ── Helper: Row → plain object ──
function rowToObj(row: Row, columns: string[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (let i = 0; i < columns.length; i++) {
    obj[columns[i]] = row[columns[i]] ?? row[i];
  }
  return obj;
}

// ── Style queries ──
export async function getEnabledStyles(): Promise<{ id: string; name: string }[]> {
  const result = await db.execute("SELECT id, name FROM StyleConfig WHERE enabled = 1 ORDER BY sortOrder ASC");
  return result.rows.map((r) => ({ id: String(r.id), name: String(r.name) }));
}

// ── Product queries ──
export async function getPublishedProducts(limit?: number) {
  const sql = limit
    ? `SELECT * FROM Product WHERE status = 'published' ORDER BY createdAt DESC LIMIT ?`
    : `SELECT * FROM Product WHERE status = 'published' ORDER BY createdAt DESC`;
  const result = await db.execute({ sql, args: limit ? [limit] : [] });
  return result.rows.map((r) => rowToObj(r, result.columns));
}

export async function getProductById(id: string) {
  const result = await db.execute({ sql: "SELECT * FROM Product WHERE id = ?", args: [id] });
  if (result.rows.length === 0) return null;
  return rowToObj(result.rows[0], result.columns);
}

export async function getAllProducts() {
  const result = await db.execute("SELECT * FROM Product ORDER BY createdAt DESC");
  return result.rows.map((r) => rowToObj(r, result.columns));
}

export async function getProductCount(status?: string) {
  const sql = status
    ? "SELECT COUNT(*) as count FROM Product WHERE status = ?"
    : "SELECT COUNT(*) as count FROM Product";
  const result = await db.execute({ sql, args: status ? [status] : [] });
  return Number(result.rows[0].count);
}

export async function getTodayProductCount() {
  const today = new Date().toISOString().slice(0, 10);
  const result = await db.execute({
    sql: "SELECT COUNT(*) as count FROM Product WHERE createdAt >= ?",
    args: [today],
  });
  return Number(result.rows[0].count);
}

export async function publishProduct(id: string) {
  const now = new Date().toISOString();
  await db.execute({
    sql: "UPDATE Product SET status = 'published', publishedAt = ?, updatedAt = ? WHERE id = ?",
    args: [now, now, id],
  });
}

export async function rejectProduct(id: string, reason?: string) {
  const now = new Date().toISOString();
  await db.execute({
    sql: "UPDATE Product SET status = 'rejected', rejectionReason = ?, updatedAt = ? WHERE id = ?",
    args: [reason || null, now, id],
  });
}

export async function updateProductStatus(id: string, status: string) {
  const now = new Date().toISOString();
  await db.execute({
    sql: "UPDATE Product SET status = ?, updatedAt = ? WHERE id = ?",
    args: [status, now, id],
  });
}

export async function deleteProduct(id: string) {
  await db.execute({ sql: "DELETE FROM Product WHERE id = ?", args: [id] });
}

// ── User queries ──
export async function getUserByUsername(username: string) {
  const result = await db.execute({
    sql: "SELECT * FROM User WHERE username = ?",
    args: [username],
  });
  if (result.rows.length === 0) return null;
  return rowToObj(result.rows[0], result.columns) as {
    id: string; username: string; passwordHash: string; role: string;
  };
}

// ── API Key queries ──
export async function getApiKeyByKey(key: string) {
  const result = await db.execute({
    sql: "SELECT * FROM ApiKey WHERE key = ? AND active = 1",
    args: [key],
  });
  if (result.rows.length === 0) return null;
  return rowToObj(result.rows[0], result.columns);
}

// ── Order queries ──
export async function createOrder(data: {
  id: string; orderNo: string; name: string; phone: string;
  email: string; address: string; totalAmount: number;
  items: { id: string; productId: string; title: string; size: string; quantity: number; price: number; mockupUrl?: string }[];
}) {
  const now = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO "Order" (id, orderNo, name, phone, email, address, totalAmount, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    args: [data.id, data.orderNo, data.name, data.phone, data.email, data.address, data.totalAmount, now, now],
  });
  for (const item of data.items) {
    await db.execute({
      sql: `INSERT INTO OrderItem (id, orderId, productId, title, size, quantity, price, mockupUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [item.id, data.id, item.productId, item.title, item.size, item.quantity, item.price, item.mockupUrl || null],
    });
  }
}

export async function getOrders() {
  const orders = await db.execute(`SELECT * FROM "Order" ORDER BY createdAt DESC`);
  const items = await db.execute("SELECT * FROM OrderItem");
  return orders.rows.map((o) => {
    const order = rowToObj(o, orders.columns);
    (order as Record<string, unknown>).items = items.rows
      .filter((i) => i.orderId === o.id)
      .map((i) => rowToObj(i, items.columns));
    return order;
  });
}

// ── Template queries ──
export async function getTemplates() {
  const result = await db.execute("SELECT * FROM MockupTemplate WHERE active = 1 ORDER BY sortOrder ASC");
  return result.rows.map((r) => rowToObj(r, result.columns));
}

export async function getAllTemplates() {
  const result = await db.execute("SELECT * FROM MockupTemplate ORDER BY sortOrder ASC");
  return result.rows.map((r) => rowToObj(r, result.columns));
}

export async function getTemplateById(id: string) {
  const result = await db.execute({ sql: "SELECT * FROM MockupTemplate WHERE id = ?", args: [id] });
  if (result.rows.length === 0) return null;
  return rowToObj(result.rows[0], result.columns);
}

export async function updateTemplate(id: string, data: Record<string, unknown>) {
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  for (const [key, val] of Object.entries(data)) {
    sets.push(`${key} = ?`);
    args.push(val as string | number | null);
  }
  if (sets.length === 0) return;
  args.push(id);
  await db.execute({ sql: `UPDATE MockupTemplate SET ${sets.join(", ")} WHERE id = ?`, args });
}

export async function updateProductMockups(productId: string, mockups: { template: string; path: string }[]) {
  const now = new Date().toISOString();
  await db.execute({
    sql: "UPDATE Product SET mockups = ?, updatedAt = ? WHERE id = ?",
    args: [JSON.stringify(mockups), now, productId],
  });
}

export async function getPendingProducts() {
  const result = await db.execute(
    "SELECT * FROM Product WHERE status = 'pending_review' ORDER BY createdAt DESC"
  );
  return result.rows.map((r) => rowToObj(r, result.columns));
}
