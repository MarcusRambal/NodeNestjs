import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { CreateOrderDto } from './dto/create-order.dto';

const MAX_AMOUNT_CENTS = 9_999_999_999;

interface CreatedOrder {
  order_id: string;
  total_amount: string;
  items_count: number;
  created_at: Date;
}

@Injectable()
export class OrdersService {
  constructor(private readonly database: DatabaseService) {}

  async create(order: CreateOrderDto) {
    const totalCents = order.items.reduce(
      (total, item) => total + Math.round(item.price * 100) * item.quantity,
      0,
    );
    const itemsCount = order.items.reduce(
      (total, item) => total + item.quantity,
      0,
    );

    if (totalCents > MAX_AMOUNT_CENTS || itemsCount > 2_147_483_647) {
      throw new BadRequestException('Order totals exceed the supported limits');
    }

    const orderId = randomUUID();
    const client = await this.database.connect();
    let transactionStarted = false;
    let destroyClient = false;

    try {
      await client.query('BEGIN');
      transactionStarted = true;

      const result = await client.query<CreatedOrder>(
        `INSERT INTO orders (order_id, customer_id, total_amount, items_count)
         VALUES ($1, $2, $3, $4)
         RETURNING order_id, total_amount, items_count, created_at`,
        [
          orderId,
          order.customerId,
          (totalCents / 100).toFixed(2),
          itemsCount,
        ],
      );

      const values: string[] = [];
      const parameters: (string | number)[] = [];
      order.items.forEach((item, index) => {
        const offset = index * 4;
        values.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`,
        );
        parameters.push(
          orderId,
          item.productId,
          item.quantity,
          (Math.round(item.price * 100) / 100).toFixed(2),
        );
      });

      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ${values.join(', ')}`,
        parameters,
      );
      await client.query('COMMIT');

      const created = result.rows[0];
      return {
        orderId: created.order_id,
        totalAmount: Number(created.total_amount),
        itemsCount: created.items_count,
        processedAt: created.created_at.toISOString(),
      };
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          destroyClient = true;
          console.error('Failed to roll back order transaction', rollbackError);
        }
      }
      throw error;
    } finally {
      client.release(
        destroyClient
          ? new Error('Order transaction could not be rolled back')
          : undefined,
      );
    }
  }
}
