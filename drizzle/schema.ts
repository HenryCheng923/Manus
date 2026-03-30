import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** 貼圖專案表 */
export const stickerProjects = mysqlTable("stickerProjects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull().default("我的貼圖"),
  stickerType: mysqlEnum("stickerType", ["static", "animated"]).default("static").notNull(),
  templateImageUrl: text("templateImageUrl"),
  keywords: text("keywords"),
  stickerCount: int("stickerCount").default(8).notNull(),
  mainImageUrl: text("mainImageUrl"),
  tabImageUrl: text("tabImageUrl"),
  status: mysqlEnum("status", ["draft", "generating", "completed", "failed"]).default("draft").notNull(),
  selectedStyle: varchar("selectedStyle", { length: 100 }),
  progress: int("progress").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StickerProject = typeof stickerProjects.$inferSelect;
export type InsertStickerProject = typeof stickerProjects.$inferInsert;

/** 單張貼圖表 */
export const stickers = mysqlTable("stickers", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  gridIndex: int("gridIndex").notNull(),
  keyword: varchar("keyword", { length: 100 }).notNull(),
  originalImageUrl: text("originalImageUrl"),
  processedImageUrl: text("processedImageUrl"),
  finalImageUrl: text("finalImageUrl"),
  status: mysqlEnum("status", ["pending", "generating", "completed", "failed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Sticker = typeof stickers.$inferSelect;
export type InsertSticker = typeof stickers.$inferInsert;
