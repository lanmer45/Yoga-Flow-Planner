import { Router, type IRouter } from "express";
import { db, posesTable } from "@workspace/db";
import {
  ListPosesResponse,
  CreatePoseBody,
  CreatePoseResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/poses", async (_req, res): Promise<void> => {
  const poses = await db.select().from(posesTable).orderBy(posesTable.name);
  res.json(ListPosesResponse.parse(poses));
});

router.post("/poses", async (req, res): Promise<void> => {
  const parsed = CreatePoseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [pose] = await db
    .insert(posesTable)
    .values({
      ...parsed.data,
      defaultBreaths: parsed.data.defaultBreaths ?? null,
      cautions: [...parsed.data.cautions],
      isCustom: true,
    })
    .returning();

  res.status(201).json(CreatePoseResponse.parse(pose));
});

export default router;
