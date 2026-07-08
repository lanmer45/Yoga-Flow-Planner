import { pgTable, text, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type RoutineEntry = {
  poseId: number;
  durationSeconds: number;
  breaths: number | null;
};

export type RoutineSections = {
  centering: RoutineEntry[];
  flow: RoutineEntry[];
  closing: RoutineEntry[];
};

export const routinesTable = pgTable("routines", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  sections: jsonb("sections")
    .$type<RoutineSections>()
    .notNull()
    .default({ centering: [], flow: [], closing: [] }),
});

export const insertRoutineSchema = createInsertSchema(routinesTable).omit({ id: true });
export type InsertRoutine = z.infer<typeof insertRoutineSchema>;
export type Routine = typeof routinesTable.$inferSelect;
