import { config } from '@order/config';
import { Client } from '@elastic/elasticsearch';
import { ClusterHealthResponse } from '@elastic/elasticsearch/lib/api/types';
import { winstonLogger } from '@vsatya-kirankumar/jobber-shared';
import { Logger } from 'winston';

const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'orderElasticSearchServer', 'debug');

const elasticSearchClient = new Client({ node: `${config.ELASTIC_SEARCH_URL}` || 'http://localhost:9200' });

const checkElasticSearchConnection = async (): Promise<void> => {
  let isConnected: boolean = false;
  while (!isConnected) {
    try {
      const health: ClusterHealthResponse = await elasticSearchClient.cluster.health({});
      log.info(`Order Service ElasticSearch health status - ${health.status}`);
      isConnected = true;
    } catch (error) {
      log.error('ElasticSearch connection failed. Retrying in 5 seconds...', error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      log.log('error', 'Order Service checkElasticSearchConnection() method error.', error);
    }
  }
};
export { checkElasticSearchConnection };
