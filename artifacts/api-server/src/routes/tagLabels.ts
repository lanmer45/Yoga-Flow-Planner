import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, tagLabelsTable } from "@workspace/db";
import {
  ListTagsResponse,
  CreateTagBody,
  CreateTagResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tag-labels", async (_req, res): Promise<void> => {
  const tags = await db.select().from(tagLabelsTable).orderBy(tagLabelsTable.name);
  res.json(ListTagsResponse.parse(tags));
});

router.post("/tag-labels", async (req, res): Promise<void> => {
  const parsed = CreateTagBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const name = parsed.data.name.trim();
  if (!name) {
    res.status(400).json({ error: "Tag name cannot be empty" });
    return;
  }

  const [existing] = await db
    .select()
    .from(tagLabelsTable)
    .where(eq(tagLabelsTable.name, name));
  if (existing) {
    res.status(201).json(CreateTagResponse.parse(existing));
    return;
  }

  const [tag] = await db
    .insert(tagLabelsTable)
    .values({ name, isCustom: true })
    .returning();

  res.status(201).json(CreateTagResponse.parse(tag));
});

export default router;
