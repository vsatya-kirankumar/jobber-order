import { Application } from 'express';
import { verifyGatewayRequest } from '@vsatya-kirankumar/jobber-shared';
import { healthRoutes, orderRoutes } from '@order/routes/index';

const BASE_PATH = '/api/v1/order';

export const appRoutes = (app: Application) => {
  app.use('', healthRoutes());
  app.use(BASE_PATH, verifyGatewayRequest, orderRoutes());
};
