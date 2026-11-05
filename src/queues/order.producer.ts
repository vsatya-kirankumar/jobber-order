import { config } from '@order/config';
import { createRabbitMQConnection } from '@order/queues/connection';
import { winstonLogger } from '@vsatya-kirankumar/jobber-shared';
import { Channel } from 'amqplib';
import { Logger } from 'winston';

const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'orderServiceProducer', 'debug');

export const publishDirectMessage = async (
  channel: Channel,
  exchangeName: string,
  routingKey: string,
  message: string,
  logMessage: string
) => {
  try {
    if (!channel) {
      channel = (await createRabbitMQConnection()) as Channel;
    }
    await channel.assertExchange(exchangeName, 'direct');
    channel.publish(exchangeName, routingKey, Buffer.from(message));
    log.info(logMessage);
  } catch (error) {
    log.log('error', 'Order Service Provider publish DirectMessage() method error', error);
  }
};
