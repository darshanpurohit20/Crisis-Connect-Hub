import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import callsRouter from "./calls";
import operatorsRouter from "./operators";
import queueRouter from "./queue";
import insightsRouter from "./insights";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(callsRouter);
router.use(operatorsRouter);
router.use(queueRouter);
router.use(insightsRouter);

export default router;
