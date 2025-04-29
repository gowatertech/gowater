import { Router } from "express";
import aiAssistantRouter from "../../routes/ai-assistant";

export function registerAIAssistantRoutes(router: Router) {
  router.use('/api/ai/assistant', aiAssistantRouter);
}