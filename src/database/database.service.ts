import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService extends Pool implements OnApplicationShutdown {
  constructor() {
    const port = Number(process.env.DB_PORT ?? 5432);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('DB_PORT must be an integer between 1 and 65535');
    }

    super({
      host: process.env.DB_HOST ?? 'localhost',
      port,
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'orders_db',
      connectionTimeoutMillis: 5000,
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.end();
  }
}
