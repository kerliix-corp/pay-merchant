import { Router } from "express";
import pagesRouter from "./pages.js";
import apiRouter from "./apiRoutes.js";
import orderRouter from "./orderRoutes.js";

const router = Router();

router.use("/", pagesRouter);
router.use("/api", apiRouter);
router.use("/api", orderRouter);

export default router;

