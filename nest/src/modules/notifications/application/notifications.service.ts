import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../../database/database.tokens';
import { notifications } from '../../../database/schema';

@Injectable()
export class NotificationsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  requireIdentity(userType?: string, userId?: number) {
    if (!userType || !userId) throw new UnauthorizedException('Authentication required.');
  }

  async listForUser(userType: string, userId: number, centerId?: number) {
    const conditions = [eq(notifications.userType, userType), eq(notifications.userId, userId)];
    if (centerId) conditions.push(eq(notifications.centerId, centerId));
    return this.db.select().from(notifications).where(and(...conditions)).orderBy(desc(notifications.createdAt));
  }

  async create(body: any, centerId?: number) {
    if (!centerId) throw new BadRequestException('center_id is required for notifications.');
    const rows = await this.db
      .insert(notifications)
      .values({
        centerId,
        userType: body.user_type,
        userId: body.user_id,
        title: body.title,
        message: body.message,
        type: body.type || 'info',
      })
      .returning();
    return { message: 'Notification created', notification: rows[0] };
  }

  async markAsRead(id: number, userType: string, userId: number, centerId?: number) {
    const rows = await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(and(...this.ownedNotificationConditions(id, userType, userId, centerId)))
      .returning();
    if (!rows[0]) throw new NotFoundException('Notification not found');
    return { message: 'Notification marked as read', notification: rows[0] };
  }

  async remove(id: number, userType: string, userId: number, centerId?: number) {
    const rows = await this.db
      .delete(notifications)
      .where(and(...this.ownedNotificationConditions(id, userType, userId, centerId)))
      .returning();
    if (!rows[0]) throw new NotFoundException('Notification not found');
    return { message: 'Notification deleted', notification: rows[0] };
  }

  private ownedNotificationConditions(id: number, userType: string, userId: number, centerId?: number) {
    const conditions = [
      eq(notifications.notificationId, id),
      eq(notifications.userType, userType),
      eq(notifications.userId, userId),
    ];
    if (centerId) conditions.push(eq(notifications.centerId, centerId));
    return conditions;
  }
}
