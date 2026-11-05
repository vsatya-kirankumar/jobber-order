import { config } from '@order/config';
import { createRabbitMQConnection } from '@order/queues/connection';
import { updateOrderReview } from '@order/services/order.service';
import { winstonLogger } from '@vsatya-kirankumar/jobber-shared';
import { Channel, ConsumeMessage } from 'amqplib';
import { Logger } from 'winston';

const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'orderServiceConsumer', 'debug');

export const consumerReviewFanoutMessages = async (channel: Channel): Promise<void> => {
  try {
    if (!channel) {
      channel = (await createRabbitMQConnection()) as Channel;
    }

    const exchangeName = 'jobber-buyer-update';
    const queueName = 'user-buyer-queue';

    await channel.assertExchange(exchangeName, 'direct');
    const jobberQueue = await channel.assertQueue(queueName, { durable: true, autoDelete: false });
    await channel.bindQueue(jobberQueue.queue, exchangeName, '');

    channel.consume(jobberQueue.queue, async (message: ConsumeMessage | null) => {
      await updateOrderReview(JSON.parse(message!.content.toString()));
      channel.ack(message!);
    });
  } catch (error) {
    log.log('error', 'Order Service consumerReviewFanoutMessages() method error.', error);
  }
};
