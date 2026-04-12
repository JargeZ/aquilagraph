import { Hono } from "hono";
import { coreRouter } from "@/core_module/views/core";
import { reportsRouter } from "@/core_module/views/reports";
import { todoTaskRouter } from "@/export_module/views/todotask";

export const app = new Hono()
  .route("/api", coreRouter)
  .route("/api", todoTaskRouter)
  .route("/api", reportsRouter);
