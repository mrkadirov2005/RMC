import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './common/auth.guard';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { StudentsModule } from './modules/students/students.module';
import { DiscountsModule } from './modules/discounts/discounts.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ArchiveModule } from './modules/archive/archive.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { CentersModule } from './modules/centers/centers.module';
import { ClassesModule } from './modules/classes/classes.module';
import { DebtsModule } from './modules/debts/debts.module';
import { GradesModule } from './modules/grades/grades.module';
import { ImportExportModule } from './modules/import-export/import-export.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OwnersModule } from './modules/owners/owners.module';
import { ParentsModule } from './modules/parents/parents.module';
import { PaymentPlansModule } from './modules/payment-plans/payment-plans.module';
import { PortalModule } from './modules/portal/portal.module';
import { RefundsModule } from './modules/refunds/refunds.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { RoomSlotsModule } from './modules/room-slots/room-slots.module';
import { SavedFiltersModule } from './modules/saved-filters/saved-filters.module';
import { SearchModule } from './modules/search/search.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { SuperusersModule } from './modules/superusers/superusers.module';
import { SystemModule } from './modules/system/system.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { TelegramRegistrationsModule } from './modules/telegram-registrations/telegram-registrations.module';
import { TelegramStudentsModule } from './modules/telegram-students/telegram-students.module';
import { TestsModule } from './modules/tests/tests.module';
import { TranslationsModule } from './modules/translations/translations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    HealthModule,
    StudentsModule,
    DiscountsModule,
    PaymentsModule,
    ArchiveModule,
    AssignmentsModule,
    AttendanceModule,
    AuditLogsModule,
    CentersModule,
    ClassesModule,
    DebtsModule,
    GradesModule,
    ImportExportModule,
    InvoicesModule,
    NotificationsModule,
    OwnersModule,
    ParentsModule,
    PaymentPlansModule,
    PortalModule,
    RefundsModule,
    ReportsModule,
    RoomsModule,
    RoomSlotsModule,
    SavedFiltersModule,
    SearchModule,
    SessionsModule,
    SettingsModule,
    SubjectsModule,
    SuperusersModule,
    SystemModule,
    TeachersModule,
    TelegramRegistrationsModule,
    TelegramStudentsModule,
    TestsModule,
    TranslationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
