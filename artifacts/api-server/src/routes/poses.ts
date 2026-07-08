import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, posesTable } from "@workspace/db";
import {
  ListPosesResponse,
  CreatePoseBody,
  CreatePoseResponse,
  UpdatePoseBody,
  UpdatePoseResponse,
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

router.put("/poses/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid pose id" });
    return;
  }

  const parsed = UpdatePoseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [pose] = await db
    .update(posesTable)
    .set({
      ...parsed.data,
      defaultBreaths: parsed.data.defaultBreaths ?? null,
      cautions: [...parsed.data.cautions],
    })
    .where(eq(posesTable.id, id))
    .returning();

  if (!pose) {
    res.status(404).json({ error: "Pose not found" });
    return;
  }

  res.json(UpdatePoseResponse.parse(pose));
});

export default router;
