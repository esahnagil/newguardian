import { Injectable } from '@nestjs/common';
import { db } from '../database/db';
import { devices } from '../database/schema';
import { eq } from 'drizzle-orm';
import type { Device, NewDevice } from '../database/schema';

@Injectable()
export class DevicesService {
  async findAll(): Promise<Device[]> {
    return await db.select().from(devices);
  }

  async findOne(id: number): Promise<Device | null> {
    const result = await db
      .select()
      .from(devices)
      .where(eq(devices.id, id))
      .limit(1);
    return result[0] || null;
  }

  async create(device: NewDevice): Promise<Device> {
    const [result] = await db.insert(devices).values(device).returning();
    return result;
  }

  async update(id: number, device: Partial<Device>): Promise<Device | null> {
    const [result] = await db
      .update(devices)
      .set(device)
      .where(eq(devices.id, id))
      .returning();
    return result || null;
  }

  async delete(id: number): Promise<boolean> {
    const [result] = await db
      .delete(devices)
      .where(eq(devices.id, id))
      .returning();
    return !!result;
  }
}
