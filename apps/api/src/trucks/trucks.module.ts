import { Module } from '@nestjs/common';
import { OwnTrucksController } from './own-trucks.controller';
import { OwnTrucksService } from './own-trucks.service';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { HiredTrucksController } from './hired-trucks.controller';
import { HiredTrucksService } from './hired-trucks.service';

@Module({
  controllers: [OwnTrucksController, DriversController, HiredTrucksController],
  providers: [OwnTrucksService, DriversService, HiredTrucksService],
  exports: [OwnTrucksService, DriversService, HiredTrucksService],
})
export class TrucksModule {}
