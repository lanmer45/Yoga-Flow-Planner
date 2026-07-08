import { pgTable, text, serial, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tagLabelsTable = pgTable("tag_labels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  isCustom: boolean("is_custom").notNull().default(false),
});

export const insertTagLabelSchema = createInsertSchema(tagLabelsTable).omit({ id: true });
export type InsertTagLabel = z.infer<typeof insertTagLabelSchema>;
export type TagLabel = typeof tagLabelsTable.$inferSelect;
