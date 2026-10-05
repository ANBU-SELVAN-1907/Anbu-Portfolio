import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const content = sqliteTable("content", {
  id: integer("id").primaryKey(),
  draft: text("draft").notNull(),
  published: text("published").notNull(),
  revision: integer("revision").notNull().default(0),
  updated: text("updated").notNull(),
});
export const owner = sqliteTable("owner", {
  id: integer("id").primaryKey(),
  userId: text("user_id").notNull(),
});
export const history = sqliteTable("history", {
  id: text("id").primaryKey(),
  payload: text("payload").notNull(),
  created: text("created").notNull(),
});
export const media = sqliteTable("media", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  size: integer("size").notNull(),
  created: text("created").notNull(),
});
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  created: text("created").notNull(),
  read: integer("read").notNull().default(0),
});
export const limits = sqliteTable("limits", {
  id: text("id").primaryKey(),
  count: integer("count").notNull(),
  expires: integer("expires").notNull(),
});
export const analytics = sqliteTable("analytics", {
  day: text("day").primaryKey(),
  views: integer("views").notNull().default(0),
  contacts: integer("contacts").notNull().default(0),
  resumes: integer("resumes").notNull().default(0),
  attempts: integer("attempts").notNull().default(0),
});
export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  day: text("day").notNull(),
  source: text("source").notNull(),
  views: integer("views").notNull().default(0),
});
