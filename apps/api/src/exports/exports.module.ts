import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ReportsModule } from '../reports/reports.module';
import { ExportsController } from './exports.controller';
import { ExportsService, DOCUMENTS_QUEUE } from './exports.service';
import { ExcelService } from './excel.service';
import { PdfService } from './pdf.service';
import { StorageService } from './storage.service';
import { DocumentsProcessor } from './documents.processor';

@Module({
  imports: [ReportsModule, BullModule.registerQueue({ name: DOCUMENTS_QUEUE })],
  controllers: [ExportsController],
  providers: [ExportsService, ExcelService, PdfService, StorageService, DocumentsProcessor],
  exports: [ExportsService],
})
export class ExportsModule {}
