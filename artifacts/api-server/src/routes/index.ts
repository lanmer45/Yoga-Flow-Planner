import { Router, type IRouter } from "express";
import healthRouter from "./health";
import posesRouter from "./poses";
import tagLabelsRouter from "./tagLabels";
import routinesRouter from "./routines";

const router: IRouter = Router();

router.use(healthRouter);
router.use(posesRouter);
router.use(tagLabelsRouter);
router.use(routinesRouter);

export default router;
