import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tradingRouter from "./trading";
import gamificationRouter from "./gamification";
import dashboardRouter from "./dashboard";
import personaRouter from "./persona";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tradingRouter);
router.use(gamificationRouter);
router.use(dashboardRouter);
router.use(personaRouter);

export default router;
