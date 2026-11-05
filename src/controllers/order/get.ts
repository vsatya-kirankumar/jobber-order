import { IOrderDocument } from '@vsatya-kirankumar/jobber-shared';
import { StatusCodes } from 'http-status-codes';
import { Request, Response } from 'express';
import { getOrderByOrderId, getOrdersBySellerId, getOrdersByBuyerId } from '@order/services/order.service';

export const orderId = async (req: Request, res: Response): Promise<void> => {
  const order: IOrderDocument = await getOrderByOrderId(req.params.orderId as string);
  res.status(StatusCodes.OK).json({ message: 'Order by order id', order });
};

export const sellerOrders = async (req: Request, res: Response): Promise<void> => {
  const orders: IOrderDocument[] = await getOrdersBySellerId(req.params.orderId as string);
  res.status(StatusCodes.OK).json({ message: 'Seller orders', orders });
};

export const buyerOrders = async (req: Request, res: Response): Promise<void> => {
  const orders: IOrderDocument[] = await getOrdersByBuyerId(req.params.buyerId as string);
  res.status(StatusCodes.OK).json({ message: 'Buyer orders', orders });
};
