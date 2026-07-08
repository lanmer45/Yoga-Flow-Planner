import { Router, type IRouter } from "express";
import healthRouter from "./health";
import posesRouter from "./poses";
import tagLabelsRouter from "./tagLabels";
import routinesRouter from "./routines";
import sessionsRouter from "./sessions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(posesRouter);
router.use(tagLabelsRouter);
router.use(routinesRouter);
router.use(sessionsRouter);

export default router;
