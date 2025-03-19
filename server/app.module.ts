import { Module } from '@nestjs/common';
import { MonitoringGateway } from './monitoring/monitoring.gateway';
import { DatabaseModule } from './database/database.module';
import { DevicesModule } from './devices/devices.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    DevicesModule,
  ],
  providers: [MonitoringGateway],
})
export class AppModule {}
