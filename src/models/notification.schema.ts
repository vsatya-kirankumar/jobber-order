import { IOrderNotifcation } from '@vsatya-kirankumar/jobber-shared';
import { Schema, Model, model } from 'mongoose';

const notificationSchema: Schema = new Schema({
  userTo: { type: String, default: '' },
  senderUsername: { type: String, default: '' },
  senderPicture: { type: String, default: '' },
  receiverUsername: { type: String, default: '' },
  receiverPicture: { type: String, default: '' },
  isRead: { type: Boolean, default: false },
  message: { type: String, default: '' },
  orderId: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const NotificationModel: Model<IOrderNotifcation> = model<IOrderNotifcation>('OrderNotification', notificationSchema, 'OrderNotification');

export { NotificationModel };
