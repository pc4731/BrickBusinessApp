import { Module } from '@nestjs/common';
import { ReportsModule } from '../reports/reports.module';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { ExcelService } from './excel.service';
import { PdfService } from './pdf.service';
import { StorageService } from './storage.service';
import { DocumentGenerator } from './document-generator.service';

@Module({
  imports: [ReportsModule],
  controllers: [ExportsController],
  providers: [ExportsService, ExcelService, PdfService, StorageService, DocumentGenerator],
  exports: [ExportsService],
})
export class ExportsModule {}
