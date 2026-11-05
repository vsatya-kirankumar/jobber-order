import { Logger } from 'winston';
import { winstonLogger } from '@vsatya-kirankumar/jobber-shared';
import { config } from '@order/config';
import mongoose from 'mongoose';

const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'chatDatabaseServer', 'debug');

const databaseConnection = async (): Promise<void> => {
  try {
    await mongoose.connect(`${config.DATBASE_URL}`);
    log.info('Chat Service successfully connected to mogo database.');
  } catch (error) {
    log.log('error', 'Chat Service databaseConnection() method error.', error);
  }
};

export { databaseConnection };
