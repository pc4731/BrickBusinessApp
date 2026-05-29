import {
  Body,
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { IsIn, IsString } from 'class-validator';
import type { JwtPayload } from '@brick/types';
import { DocumentType } from '@brick/db';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ExportsService } from './exports.service';
import { ExcelService } from './excel.service';
import { StorageService } from './storage.service';

class RequestDocumentDto {
  @IsIn(['INVOICE', 'CHALLAN', 'RECEIPT', 'TRANSPORT_SLIP'])
  type!: DocumentType;

  @IsString()
  orderId!: string;
}

@Controller('exports')
export class ExportsController {
  constructor(
    private readonly exports: ExportsService,
    private readonly excel: ExcelService,
    private readonly storage: StorageService,
  ) {}

  // ── Synchronous Excel report download ──
  @Get('excel/:report')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async excelReport(
    @CurrentOrg() orgId: string,
    @Param('report') report: string,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @Query('customerId') customerId: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.excel.generate(orgId, report, { dateFrom, dateTo, customerId });
    res.set('Content-Disposition', `attachment; filename="${report}-report.xlsx"`);
    return new StreamableFile(buffer);
  }

  // ── Async PDF document generation ──
  @Post('documents')
  requestDocument(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RequestDocumentDto,
  ) {
    return this.exports.requestDocument(orgId, user.sub, dto.type, dto.orderId);
  }

  @Get('documents/order/:orderId')
  listForOrder(@CurrentOrg() orgId: string, @Param('orderId') orderId: string) {
    return this.exports.listForOrder(orgId, orderId);
  }

  @Get('documents/:id')
  getDocument(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.exports.getDocument(orgId, id);
  }

  @Get('documents/:id/download')
  @Header('Content-Type', 'application/pdf')
  async download(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const doc = await this.exports.getDocument(orgId, id);
    if (doc.status !== 'READY' || !doc.url || !this.storage.exists(doc.url)) {
      throw new NotFoundException('Document not ready');
    }
    res.set('Content-Disposition', `attachment; filename="${doc.number}.pdf"`);
    return new StreamableFile(this.storage.stream(doc.url));
  }
}
