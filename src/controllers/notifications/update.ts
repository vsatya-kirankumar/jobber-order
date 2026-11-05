import { IOrderNotifcation } from '@vsatya-kirankumar/jobber-shared';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { markNotificationAsRead } from 'src/services/notification.service';

export const markSingleNotificationAsRead = async (req: Request, res: Response): Promise<void> => {
  const { notificationId } = req.body;
  const notification: IOrderNotifcation = await markNotificationAsRead(`${notificationId}`);
  res.status(StatusCodes.OK).json({ message: 'Notification updated successfully.', notification });
};
