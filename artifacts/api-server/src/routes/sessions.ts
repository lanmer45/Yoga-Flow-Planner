import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, sessionsTable } from "@workspace/db";
import {
  ListSessionsResponse,
  CreateSessionBody,
  CreateSessionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/sessions", async (_req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(sessionsTable)
    .orderBy(desc(sessionsTable.completedAt));

  res.json(ListSessionsResponse.parse(sessions));
});

router.post("/sessions", async (req, res): Promise<void> => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [session] = await db
    .insert(sessionsTable)
    .values({
      routineId: parsed.data.routineId ?? null,
      routineTitle: parsed.data.routineTitle,
      totalSeconds: parsed.data.totalSeconds,
    })
    .returning();

  res.status(201).json(CreateSessionResponse.parse(session));
});

export default router;
