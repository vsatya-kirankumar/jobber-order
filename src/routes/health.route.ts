import { Router } from 'express';
import express from 'express';
import { health } from '@order/controllers/health.controller';

const router: Router = express.Router();

export const healthRoutes = (): Router => {
  router.get('/order-health', health);

  return router;
};
