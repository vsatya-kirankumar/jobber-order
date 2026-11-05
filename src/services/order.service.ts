import { config } from '@order/config';
import { OrderModel } from '@order/models/order.schema';
import { publishDirectMessage } from '@order/queues/order.producer';
import { orderChannel } from '@order/server';
import {
  IDeliveredWork,
  IExtendedDelivery,
  IOrderDocument,
  IOrderMessage,
  IReviewMessageDetails,
  lowerCase
} from '@vsatya-kirankumar/jobber-shared';
import { sendNotification } from './notification.service';

export const getOrderByOrderId = async (orderId: string): Promise<IOrderDocument> => {
  const order: IOrderDocument[] = await OrderModel.aggregate([{ $match: { orderId } }]);
  return order[0];
};

export const getOrdersBySellerId = async (sellerId: string): Promise<IOrderDocument[]> => {
  const order: IOrderDocument[] = await OrderModel.aggregate([{ $match: { sellerId } }]);
  return order;
};

export const getOrdersByBuyerId = async (buyerId: string): Promise<IOrderDocument[]> => {
  const order: IOrderDocument[] = await OrderModel.aggregate([{ $match: { buyerId } }]);
  return order;
};

export const createOrder = async (data: IOrderDocument): Promise<IOrderDocument> => {
  const order: IOrderDocument = await OrderModel.create(data);

  //send notification to user service
  const messageDetails: IOrderMessage = {
    sellerId: data.sellerId,
    ongoingJobs: 1,
    type: 'create-order'
  };

  await publishDirectMessage(
    orderChannel,
    'jobber-seller-update',
    'user-seller',
    JSON.stringify(messageDetails),
    'Details sent to user service.'
  );

  const emailMessageDetails: IOrderMessage = {
    orderId: data.orderId,
    invoiceId: data.invoiceId,
    orderDue: `${data.offer.newDeliveryDate}`,
    amount: `${data.price}`,
    buyerUsername: lowerCase(data.buyerUsername),
    sellerUsername: lowerCase(data.sellerUsername),
    title: data.offer.gigTitle,
    description: data.offer.description,
    requirements: data.requirements,
    serviceFee: `${order.serviceFee}`,
    total: `${order.price + order.serviceFee!}`,
    orderUrl: `${config.CLIENT_URL}/orders/${data.orderId}/activities`,
    template: 'orderPlaced'
  };

  await publishDirectMessage(
    orderChannel,
    'jobber-order-notification',
    'order-email',
    JSON.stringify(emailMessageDetails),
    'Order email sent to notification service.'
  );

  // send notification
  sendNotification(order, data.sellerUsername, 'placed an order for your gig');

  return order;
};

export const cancelOrder = async (orderId: string, data: IOrderMessage): Promise<IOrderDocument> => {
  const order: IOrderDocument = (await OrderModel.findOneAndUpdate(
    { orderId },
    {
      $set: {
        cancelled: true,
        status: 'Cancelled',
        approvedAt: new Date()
      }
    },
    { new: true }
  ).exec()) as IOrderDocument;

  // Update seller info
  await publishDirectMessage(
    orderChannel,
    'jobber-seller-update',
    'user-seller',
    JSON.stringify({ type: 'cancel-order', sellerId: data.sellerId }),
    'Cancelled order details sent to user service.'
  );

  // Update buyer info
  await publishDirectMessage(
    orderChannel,
    'jobber-buyer-update',
    'user-buyer',
    JSON.stringify({ type: 'cancel-order', buyerId: data.buyerId, purchasedGigs: data.purchasedGigs }),
    'Cancelled order details sent to user service.'
  );

  // send notification
  sendNotification(order, order.sellerUsername, 'cancelled your order');

  return order;
};

export const approveOrder = async (orderId: string, data: IOrderMessage): Promise<IOrderDocument> => {
  const order: IOrderDocument = (await OrderModel.findOneAndUpdate(
    { orderId },
    {
      $set: {
        approved: true,
        cancelled: false,
        status: 'Completed',
        approvedAt: new Date()
      }
    },
    { new: true }
  ).exec()) as IOrderDocument;

  const emailMessageDetails: IOrderMessage = {
    sellerId: data.sellerId,
    ongoingJobs: data.ongoingJobs,
    completedJobs: data.completedJobs,
    totalEarnings: data.totalEarnings,
    recentDelivery: `${new Date()}`,
    type: 'approved-order'
  };

  // Update seller info
  await publishDirectMessage(
    orderChannel,
    'jobber-seller-update',
    'user-seller',
    JSON.stringify(emailMessageDetails),
    'Approved order details sent to user service.'
  );

  // Update buyer info
  await publishDirectMessage(
    orderChannel,
    'jobber-buyer-update',
    'user-buyer',
    JSON.stringify({ type: 'purchased-gigs', buyerId: data.buyerId, purchasedGigs: data.purchasedGigs }),
    'Approved order details sent to user service.'
  );

  // send notification
  sendNotification(order, order.sellerUsername, 'approved your order delivery');

  return order;
};

export const sellerDeliverOrder = async (orderId: string, delivered: boolean, deliveredWork: IDeliveredWork): Promise<IOrderDocument> => {
  const order: IOrderDocument = (await OrderModel.findOneAndUpdate(
    { orderId },
    {
      $set: {
        delivered,
        status: 'Delivered',
        ['events.orderDelivered']: new Date()
      },
      $push: {
        deliveredWork
      }
    },
    { new: true }
  ).exec()) as IOrderDocument;

  if (order) {
    const emailMessageDetails: IOrderMessage = {
      orderId,
      buyerUsername: lowerCase(order.buyerUsername),
      sellerUsername: lowerCase(order.sellerUsername),
      title: order.offer.gigTitle,
      description: order.offer.description,
      orderUrl: `${config.CLIENT_URL}/orders/${orderId}/activities`,
      template: 'orderDelivered'
    };

    await publishDirectMessage(
      orderChannel,
      'jobber-order-notification',
      'order-email',
      JSON.stringify(emailMessageDetails),
      'Order delivered message sent to notification service.'
    );

    sendNotification(order, order.buyerUsername, 'delivered your order.');
  }

  return order;
};

export const requestDeliverExtension = async (orderId: string, data: IExtendedDelivery): Promise<IOrderDocument> => {
  const { originalDate, newDate, days, reason } = data;

  const order: IOrderDocument = (await OrderModel.findOneAndUpdate(
    { orderId },
    {
      $set: {
        ['requestExtension.originalDate']: originalDate,
        ['requestExtension.newDate']: newDate,
        ['requestExtension.days']: days,
        ['requestExtension.reason']: reason
      }
    },
    { new: true }
  ).exec()) as IOrderDocument;

  if (order) {
    const emailMessageDetails: IOrderMessage = {
      buyerUsername: lowerCase(order.buyerUsername),
      sellerUsername: lowerCase(order.sellerUsername),
      originalDate: order.offer.oldDeliveryDate,
      newDate: order.offer.newDeliveryDate,
      reason: order.offer.reason,
      orderUrl: `${config.CLIENT_URL}/orders/${orderId}/activities`,
      template: 'orderExtension'
    };

    await publishDirectMessage(
      orderChannel,
      'jobber-order-notification',
      'order-email',
      JSON.stringify(emailMessageDetails),
      'Order delivery extension message sent to notification service.'
    );

    sendNotification(order, order.buyerUsername, 'requested for order delivery date extension');
  }

  return order;
};

export const approveDeliveryDate = async (orderId: string, data: IExtendedDelivery): Promise<IOrderDocument> => {
  const { deliveryDateUpdate, newDate, days, reason } = data;

  const order: IOrderDocument = (await OrderModel.findOneAndUpdate(
    { orderId },
    {
      $set: {
        ['offer.deliveryInDays']: days,
        ['offer.newDeliverDate']: newDate,
        ['offer.reason']: reason,
        ['offer.deliveryDateUpdate']: new Date(`${deliveryDateUpdate}`),
        requestExtension: {
          originalDate: '',
          newDate: '',
          days: 0,
          reason: ''
        }
      }
    },
    { new: true }
  ).exec()) as IOrderDocument;

  if (order) {
    const emailMessageDetails: IOrderMessage = {
      subject: 'Congratulations! Your extension request was approved',
      buyerUsername: lowerCase(order.buyerUsername),
      sellerUsername: lowerCase(order.sellerUsername),
      header: 'Request Accepted',
      message: 'You can continue working on the order.',
      type: 'accepted',
      orderUrl: `${config.CLIENT_URL}/orders/${orderId}/activities`,
      template: 'orderExtensionApproval'
    };

    await publishDirectMessage(
      orderChannel,
      'jobber-order-notification',
      'order-email',
      JSON.stringify(emailMessageDetails),
      'Order request extension approval message sent to notification service.'
    );

    sendNotification(order, order.sellerUsername, 'approved your order delivery date extension request');
  }

  return order;
};

export const rejectDeliveryDate = async (orderId: string): Promise<IOrderDocument> => {
  const order: IOrderDocument = (await OrderModel.findOneAndUpdate(
    { orderId },
    {
      $set: {
        requestExtension: {
          originalDate: '',
          newDate: '',
          days: 0,
          reason: ''
        }
      }
    },
    { new: true }
  ).exec()) as IOrderDocument;

  if (order) {
    const emailMessageDetails: IOrderMessage = {
      subject: 'Sorry! Your extension request was rejected',
      buyerUsername: lowerCase(order.buyerUsername),
      sellerUsername: lowerCase(order.sellerUsername),
      header: 'Request Rejected',
      message: 'You can contact the seller for more informatio',
      type: 'rejected',
      orderUrl: `${config.CLIENT_URL}/orders/${orderId}/activities`,
      template: 'orderExtensionApproval'
    };

    await publishDirectMessage(
      orderChannel,
      'jobber-order-notification',
      'order-email',
      JSON.stringify(emailMessageDetails),
      'Order request extension rejection message sent to notification service.'
    );

    sendNotification(order, order.sellerUsername, 'rejecting your order delivery date extension request');
  }

  return order;
};

export const updateOrderReview = async (data: IReviewMessageDetails): Promise<IOrderDocument> => {
  const order: IOrderDocument = (await OrderModel.findOneAndUpdate(
    { orderId: data.orderId },
    {
      $set:
        data.type === 'buyer-review'
          ? {
              buyerReview: {
                rating: data.rating,
                review: data.review,
                create: new Date(`${data.createdAt}`)
              },
              ['events.buyerReview']: new Date(`${data.createdAt}`)
            }
          : {
              sellerReview: {
                rating: data.rating,
                review: data.review,
                create: new Date(`${data.createdAt}`)
              },
              ['events.sellerReview']: new Date(`${data.createdAt}`)
            }
    }
  ).exec()) as IOrderDocument;

  sendNotification(order, data.type === 'buyer-review' ? order.buyerUsername : order.sellerUsername, `left you a ${data.rating} review`);

  return order;
};
