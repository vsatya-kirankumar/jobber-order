import { IOrderDocument, IOrderNotifcation } from '@vsatya-kirankumar/jobber-shared';
import { NotificationModel } from '@order/models/notification.schema';
import { socketIOOrderObject } from '@order/server';
import { getOrderByOrderId } from './order.service';

export const createNotification = async (data: IOrderNotifcation): Promise<IOrderNotifcation> => {
  const notification: IOrderNotifcation = await NotificationModel.create(data);
  return notification;
};

export const getNotificationsById = async (userToId: string): Promise<IOrderNotifcation[]> => {
  const notifications: IOrderNotifcation[] = await NotificationModel.aggregate([{ $match: { userTo: userToId } }]);
  return notifications;
};

export const markNotificationAsRead = async (notificationId: string): Promise<IOrderNotifcation> => {
  const notification: IOrderNotifcation = (await NotificationModel.findOneAndUpdate(
    { _id: notificationId },
    { $set: { isRead: true } },
    { new: true }
  )) as IOrderNotifcation;

  const order: IOrderDocument = await getOrderByOrderId(notification.orderId);
  socketIOOrderObject.emit('order notification', order, notification);

  return notification;
};

export const sendNotification = async (data: IOrderDocument, userToId: string, message: string): Promise<void> => {
  const notification: IOrderNotifcation = {
    userTo: userToId,
    senderUsername: data.sellerUsername,
    senderPicture: data.sellerImage,
    receiverUsername: data.buyerUsername,
    receiverPicture: data.buyerImage,
    message,
    orderId: data.orderId
  } as IOrderNotifcation;

  const orderNotification: IOrderNotifcation = await createNotification(notification);

  socketIOOrderObject.emit('order notification', data, orderNotification);
};
