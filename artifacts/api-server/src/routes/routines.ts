import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  routinesTable,
  posesTable,
  type RoutineSections,
  type RoutineEntry,
} from "@workspace/db";
import {
  ListRoutinesResponse,
  CreateRoutineBody,
  CreateRoutineResponse,
  GetRoutineParams,
  GetRoutineResponse,
  UpdateRoutineParams,
  UpdateRoutineBody,
  UpdateRoutineResponse,
  DeleteRoutineParams,
  DuplicateRoutineParams,
  DuplicateRoutineResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function allEntries(sections: RoutineSections): RoutineEntry[] {
  return [...sections.centering, ...sections.flow, ...sections.closing];
}

function totalSeconds(sections: RoutineSections): number {
  return allEntries(sections).reduce((sum, e) => sum + e.durationSeconds, 0);
}

function normalizeSections(sections: {
  centering: readonly { poseId: number; durationSeconds: number; breaths: number | null }[];
  flow: readonly { poseId: number; durationSeconds: number; breaths: number | null }[];
  closing: readonly { poseId: number; durationSeconds: number; breaths: number | null }[];
}): RoutineSections {
  const norm = (arr: readonly { poseId: number; durationSeconds: number; breaths: number | null }[]) =>
    arr.map((e) => ({
      poseId: e.poseId,
      durationSeconds: e.durationSeconds,
      breaths: e.breaths ?? null,
    }));
  return {
    centering: norm(sections.centering),
    flow: norm(sections.flow),
    closing: norm(sections.closing),
  };
}

function withTotal(routine: typeof routinesTable.$inferSelect) {
  return { ...routine, totalSeconds: totalSeconds(routine.sections) };
}

router.get("/routines", async (_req, res): Promise<void> => {
  const routines = await db.select().from(routinesTable).orderBy(routinesTable.title);

  const poseIds = [
    ...new Set(routines.flatMap((r) => allEntries(r.sections).map((e) => e.poseId))),
  ];
  const poses = poseIds.length
    ? await db.select().from(posesTable).where(inArray(posesTable.id, poseIds))
    : [];
  const poseMap = new Map(poses.map((p) => [p.id, p]));

  const summaries = routines.map((r) => {
    const entries = allEntries(r.sections);
    const cautions = [
      ...new Set(entries.flatMap((e) => poseMap.get(e.poseId)?.cautions ?? [])),
    ];
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      tags: r.tags,
      totalSeconds: totalSeconds(r.sections),
      poseCount: entries.length,
      cautions,
    };
  });

  res.json(ListRoutinesResponse.parse(summaries));
});

router.post("/routines", async (req, res): Promise<void> => {
  const parsed = CreateRoutineBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [routine] = await db
    .insert(routinesTable)
    .values({
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      tags: [...(parsed.data.tags ?? [])],
      sections: normalizeSections(parsed.data.sections),
    })
    .returning();

  res.status(201).json(CreateRoutineResponse.parse(withTotal(routine)));
});

router.get("/routines/:id", async (req, res): Promise<void> => {
  const params = GetRoutineParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [routine] = await db
    .select()
    .from(routinesTable)
    .where(eq(routinesTable.id, params.data.id));

  if (!routine) {
    res.status(404).json({ error: "Routine not found" });
    return;
  }

  res.json(GetRoutineResponse.parse(withTotal(routine)));
});

router.put("/routines/:id", async (req, res): Promise<void> => {
  const params = UpdateRoutineParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateRoutineBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [routine] = await db
    .update(routinesTable)
    .set({
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      tags: [...(parsed.data.tags ?? [])],
      sections: normalizeSections(parsed.data.sections),
    })
    .where(eq(routinesTable.id, params.data.id))
    .returning();

  if (!routine) {
    res.status(404).json({ error: "Routine not found" });
    return;
  }

  res.json(UpdateRoutineResponse.parse(withTotal(routine)));
});

router.delete("/routines/:id", async (req, res): Promise<void> => {
  const params = DeleteRoutineParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [routine] = await db
    .delete(routinesTable)
    .where(eq(routinesTable.id, params.data.id))
    .returning();

  if (!routine) {
    res.status(404).json({ error: "Routine not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/routines/:id/duplicate", async (req, res): Promise<void> => {
  const params = DuplicateRoutineParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [source] = await db
    .select()
    .from(routinesTable)
    .where(eq(routinesTable.id, params.data.id));

  if (!source) {
    res.status(404).json({ error: "Routine not found" });
    return;
  }

  const [copy] = await db
    .insert(routinesTable)
    .values({
      title: `${source.title} (Copy)`,
      description: source.description,
      tags: source.tags,
      sections: source.sections,
    })
    .returning();

  res.status(201).json(DuplicateRoutineResponse.parse(withTotal(copy)));
});

export default router;
