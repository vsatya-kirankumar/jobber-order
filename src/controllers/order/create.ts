import { config } from '@order/config';
import { orderSchema } from '@order/schemes/order';
import { createOrder } from '@order/services/order.service';
import { BadRequestError, IOrderDocument } from '@vsatya-kirankumar/jobber-shared';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import Stripe from 'stripe';

const stripe = new Stripe(`${config.STRIPE_API_KEY}`, {
  typescript: true
});

export const intent = async (req: Request, res: Response): Promise<void> => {
  // Search for the customer
  const customer: Stripe.Response<Stripe.ApiSearchResult<Stripe.Customer>> = await stripe.customers.search({
    query: `email: "${req.currentUser!.email}"`
  });

  let customerId: string = '';
  if (!customer.data.length) {
    const createdCustomer = await stripe.customers.create({
      email: `${req.currentUser!.email}`,
      metadata: {
        buyerId: `${req.body.buyerId}`
      }
    });
    customerId = createdCustomer.id;
  } else {
    customerId = customer.data[0].id;
  }

  let paymentIntent: Stripe.Response<Stripe.PaymentIntent>;
  const serviceFee: number = req.body.price < 50 ? (5.5 / 100) * req.body.price + 2 : (5.5 / 100) * req.body.price;
  if (customerId) {
    paymentIntent = await stripe.paymentIntents.create({
      amount: Math.floor((req.body.price + serviceFee) * 100),
      currency: 'usd',
      customer: customerId,
      automatic_payment_methods: { enabled: true }
    });
  }

  res.status(StatusCodes.CREATED).json({
    message: 'Order intent created successfully',
    clientSecrent: paymentIntent!.client_secret,
    paymentIntentId: paymentIntent!.id
  });
};

export const order = async (req: Request, res: Response): Promise<void> => {
  const { error } = await Promise.resolve(orderSchema.validate(req.body));
  if (error?.details) {
    throw new BadRequestError(error?.details[0].message, 'Create order() method error.');
  }

  const serviceFee: number = req.body.price < 50 ? (5.5 / 100) * req.body.price + 2 : (5.5 / 100) * req.body.price;
  let orderData: IOrderDocument = req.body;
  orderData = { ...orderData, serviceFee };
  const order: IOrderDocument = await createOrder(orderData);
  res.status(StatusCodes.CREATED).json({ message: 'Your order has been created.', order });
};
