import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const posesTable = pgTable("poses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  defaultDurationSeconds: integer("default_duration_seconds").notNull(),
  durationType: text("duration_type").notNull(),
  defaultBreaths: integer("default_breaths"),
  perSide: boolean("per_side").notNull().default(false),
  cue: text("cue").notNull(),
  cautions: jsonb("cautions").$type<string[]>().notNull().default([]),
  modification: text("modification").notNull(),
  chairOption: text("chair_option").notNull(),
  isCustom: boolean("is_custom").notNull().default(false),
});

export const insertPoseSchema = createInsertSchema(posesTable).omit({ id: true });
export type InsertPose = z.infer<typeof insertPoseSchema>;
export type Pose = typeof posesTable.$inferSelect;
