import { config } from '@order/config';
import { winstonLogger } from '@vsatya-kirankumar/jobber-shared';
import amqp, { Channel, ChannelModel } from 'amqplib';
import { Logger } from 'winston';

const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'orderQueueConnection', 'debug');

export const createRabbitMQConnection = async (): Promise<Channel | undefined> => {
  try {
    const connection: ChannelModel = await amqp.connect(`${config.RABBITMQ_ENDPOINT}`);
    const channel: Channel = await connection.createChannel();
    log.info('Order server connected to queue successfully...');
    closeConnection(channel, connection);

    return channel;
  } catch (error) {
    log.log('error', 'Order Service createRabbitMQConnection() method error.', error);
    return undefined;
  }
};

const closeConnection = (channel: Channel, connection: ChannelModel): void => {
  process.once('SIGINT', async () => {
    await connection.close();
    await channel.close();
  });
};
