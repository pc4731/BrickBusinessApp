import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import configuration, { AppConfig } from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { FactoriesModule } from './factories/factories.module';
import { TrucksModule } from './trucks/trucks.module';
import { StockModule } from './stock/stock.module';
import { OrdersModule } from './orders/orders.module';
import { FinanceModule } from './finance/finance.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { ExportsModule } from './exports/exports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { SettingsModule } from './settings/settings.module';
import { UsersModule } from './users/users.module';
import { HealthController } from './health/health.controller';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      // Dev loads the monorepo-root .env; prod relies on injected process env.
      envFilePath: ['../../.env', '.env'],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const t = config.get('throttle', { infer: true });
        return [{ ttl: t.ttl * 1000, limit: t.limit }];
      },
    }),
    BullModule.forRoot({
      connection: (() => {
        const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
        return {
          host: url.hostname,
          port: Number(url.port || 6379),
          password: url.password || undefined,
        };
      })(),
    }),
    PrismaModule,
    AuthModule,
    CustomersModule,
    FactoriesModule,
    TrucksModule,
    StockModule,
    OrdersModule,
    FinanceModule,
    PaymentsModule,
    ReportsModule,
    ExportsModule,
    NotificationsModule,
    AuditModule,
    SettingsModule,
    UsersModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: authenticate → rate-limit → authorize by role.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
