import { config } from '@order/config';
import { checkElasticSearchConnection } from '@order/elasticsearch';
import { createRabbitMQConnection } from '@order/queues/connection';
import { consumerReviewFanoutMessages } from '@order/queues/order.consumer';
import { appRoutes } from '@order/routes';
import { CustomError, IAuthPayload, IErrorResponse, winstonLogger } from '@vsatya-kirankumar/jobber-shared';
import { Channel } from 'amqplib';
import compression from 'compression';
import cors from 'cors';
import { Application, NextFunction, Request, Response, json, urlencoded } from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import http from 'http';
import JWT from 'jsonwebtoken';
import { Server } from 'socket.io';
import { Logger } from 'winston';

const SERVER_PORT = config.SERVER_PORT || 4006;
const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'chatServer', 'debug');
let orderChannel: Channel;
let socketIOOrderObject: Server;

const start = (app: Application): void => {
  securityMiddleware(app);
  standardMiddleware(app);
  routesMiddleware(app);
  startQueues();
  startElasticSearch();
  chatErrorHandler(app);
  startServer(app);
};

const securityMiddleware = (app: Application): void => {
  app.set('trust-proxy', 1);

  app.use(
    cors({
      origin: `${config.API_GATEWAY_URL}`,
      methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
      credentials: true
    })
  );

  app.use(hpp());
  app.use(helmet());

  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];
      const payload: IAuthPayload = JWT.verify(token, config.JWT_TOKEN!) as IAuthPayload;
      req.currentUser = payload;
    }
    next();
  });
};

const standardMiddleware = (app: Application): void => {
  app.use(compression());
  app.use(json({ limit: '200mb' }));
  app.use(urlencoded({ extended: true, limit: '200mb' }));
};

const routesMiddleware = (app: Application) => {
  appRoutes(app);
};

const startQueues = async (): Promise<void> => {
  orderChannel = (await createRabbitMQConnection()) as Channel;
  consumerReviewFanoutMessages(orderChannel);
};

const startElasticSearch = (): void => {
  checkElasticSearchConnection();
};

const chatErrorHandler = (app: Application): void => {
  app.use((error: IErrorResponse, _req: Request, res: Response, _next: NextFunction) => {
    log.log('error', `Order Service Error: ${error.comingFrom}: `, error);
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json(error.serializeErrors());
    }
    return res.status(500).json({
      message: 'Internal Server Error'
    });
  });
};

const startServer = async (app: Application): Promise<void> => {
  try {
    const httpServer: http.Server = http.createServer(app);
    const socketIO: Server = await createSocketIO(httpServer);
    await startHttpServer(httpServer);
    socketIOOrderObject = socketIO;
  } catch (error) {
    log.log('error', 'Order Service startServer() Error: ', error);
  }
};

const createSocketIO = async (httpServer: http.Server): Promise<Server> => {
  const io: Server = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    }
  });
  return io;
};

const startHttpServer = async (httpServer: http.Server): Promise<void> => {
  try {
    log.info(`Order Service has started with process id ${process.pid}...`);
    httpServer.listen(SERVER_PORT, () => {
      log.info(`Order Service is running on port ${SERVER_PORT}`);
    });
  } catch (error) {
    log.log('error', 'Order Service startHttpServer() Error: ', error);
  }
};

export { orderChannel, socketIOOrderObject, start };
