import { Request, Response } from 'express';
import { getNotificationsById } from 'src/services/notification.service';
import { IOrderNotifcation } from '@vsatya-kirankumar/jobber-shared';
import { StatusCodes } from 'http-status-codes';

export const notifications = async (req: Request, res: Response): Promise<void> => {
  const notifications: IOrderNotifcation[] = await getNotificationsById(`${req.params.userTo}`);
  res.status(StatusCodes.OK).json({ message: 'Notifications', notifications });
};
