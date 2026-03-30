import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, stickerProjects, stickers, InsertStickerProject, InsertSticker } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ Sticker Project Helpers ============

export async function createStickerProject(data: InsertStickerProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(stickerProjects).values(data);
  return result[0].insertId;
}

export async function getStickerProject(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(stickerProjects)
    .where(and(eq(stickerProjects.id, projectId), eq(stickerProjects.userId, userId)))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getUserProjects(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(stickerProjects)
    .where(eq(stickerProjects.userId, userId))
    .orderBy(stickerProjects.createdAt);
}

export async function updateProjectStatus(projectId: number, status: "draft" | "generating" | "completed" | "failed", progress?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Partial<InsertStickerProject> = { status };
  if (progress !== undefined) updateData.progress = progress;
  await db.update(stickerProjects).set(updateData).where(eq(stickerProjects.id, projectId));
}

export async function updateProjectTemplateUrl(projectId: number, url: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(stickerProjects).set({ templateImageUrl: url }).where(eq(stickerProjects.id, projectId));
}

export async function updateProjectKeywords(projectId: number, keywords: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(stickerProjects).set({ keywords }).where(eq(stickerProjects.id, projectId));
}

// ============ Sticker Helpers ============

export async function createStickers(dataList: InsertSticker[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(stickers).values(dataList);
}

export async function getProjectStickers(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(stickers)
    .where(eq(stickers.projectId, projectId))
    .orderBy(stickers.gridIndex);
}

export async function updateStickerStatus(stickerId: number, status: "pending" | "generating" | "completed" | "failed") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(stickers).set({ status }).where(eq(stickers.id, stickerId));
}

export async function updateStickerUrls(stickerId: number, urls: {
  originalImageUrl?: string;
  processedImageUrl?: string;
  finalImageUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Partial<InsertSticker> = {};
  if (urls.originalImageUrl) updateData.originalImageUrl = urls.originalImageUrl;
  if (urls.processedImageUrl) updateData.processedImageUrl = urls.processedImageUrl;
  if (urls.finalImageUrl) updateData.finalImageUrl = urls.finalImageUrl;
  if (Object.keys(updateData).length > 0) {
    updateData.status = "completed";
    await db.update(stickers).set(updateData).where(eq(stickers.id, stickerId));
  }
}

export async function updateProjectMainTab(projectId: number, mainImageUrl: string, tabImageUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(stickerProjects).set({ mainImageUrl, tabImageUrl }).where(eq(stickerProjects.id, projectId));
}

export async function updateProjectStickerCount(projectId: number, stickerCount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(stickerProjects).set({ stickerCount }).where(eq(stickerProjects.id, projectId));
}

export async function deleteProjectStickers(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(stickers).where(eq(stickers.projectId, projectId));
}

export async function updateProjectStickerType(projectId: number, stickerType: "static" | "animated") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(stickerProjects).set({ stickerType }).where(eq(stickerProjects.id, projectId));
}
