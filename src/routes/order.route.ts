import { Router } from 'express';
import express from 'express';
import { notifications } from 'src/controllers/notifications/get';
import { intent, order } from 'src/controllers/order/create';
import { buyerOrders, orderId, sellerOrders } from 'src/controllers/order/get';
import { buyerApproveOrder, cancel, deliverOrder, deliveryDate, requestExtension } from 'src/controllers/order/update';
import { markNotificationAsRead } from 'src/services/notification.service';

const router: Router = express.Router();

export const orderRoutes = (): Router => {
  router.get('/notification/:userTo', notifications);
  router.get('/:orderId', orderId);
  router.get('/seller/:sellerId', sellerOrders);
  router.get('/buyer/:buyerId', buyerOrders);
  router.post('/', order);
  router.post('/create-payment-intent', intent);
  router.put('/cancel/:orderId', cancel);
  router.put('/extension/:orderId', requestExtension);
  router.put('/deliver-order/:orderId', deliverOrder);
  router.put('/approve-order/:orderId', buyerApproveOrder);
  router.put('/gig/:type/:orderId', deliveryDate);
  router.put('/notification/mark-as-read', markNotificationAsRead);

  return router;
};
