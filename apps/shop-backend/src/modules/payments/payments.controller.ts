import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PaymentsService } from './payments.service';

const html = (
  orderNumber: string,
  authority: string,
  amount: number,
) => `<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>درگاه پرداخت آزمایشی</title><style>
body{margin:0;background:#f4f0e8;color:#27231f;font-family:Tahoma,sans-serif;display:grid;min-height:100vh;place-items:center;padding:18px;box-sizing:border-box}.card{width:min(100%,440px);background:#fff;border:1px solid #ddd2c1;padding:32px;box-sizing:border-box}.tag{color:#806b55;font-size:12px}.amount{font-size:27px;margin:24px 0}.row{display:flex;justify-content:space-between;gap:15px;padding:13px 0;border-bottom:1px solid #eee7dd}.actions{display:grid;gap:10px;margin-top:28px}button{width:100%;padding:14px;border:1px solid #27231f;cursor:pointer;font:inherit}.pay{background:#27231f;color:#fff}.cancel{background:#fff;color:#7d382f}@media(max-width:480px){.card{padding:24px 18px}}
</style></head><body><main class="card"><span class="tag">محیط توسعه — پرداخت واقعی انجام نمی‌شود</span><h1>درگاه آزمایشی</h1><div class="row"><span>شماره سفارش</span><b dir="ltr">${orderNumber}</b></div><div class="amount">${amount.toLocaleString('fa-IR')} تومان</div><form class="actions" method="post" action="/api/payments/mock/${encodeURIComponent(authority)}/complete"><button class="pay" name="result" value="success">پرداخت موفق آزمایشی</button><button class="cancel" name="result" value="cancel">انصراف از پرداخت</button></form></main></body></html>`;

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Post('orders/:orderId/request')
  requestPayment(
    @CurrentUser('id') userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.payments.startForOrder(userId, orderId);
  }

  @Get('zarinpal/callback')
  async zarinpalCallback(
    @Query('Authority') authority: string = '',
    @Query('Status') status: string = '',
    @Res() response: Response,
  ) {
    try {
      const result = await this.payments.handleZarinpalCallback(
        authority,
        status,
      );
      return response.redirect(303, this.payments.redirectFor(result));
    } catch {
      return response.redirect(
        303,
        this.payments.redirectFor({ orderId: '', result: 'failed' }),
      );
    }
  }

  @Get('mock/:authority')
  async mockPage(
    @Param('authority') authority: string,
    @Res() response: Response,
  ) {
    const attempt = await this.payments.getMockPayment(authority);
    return response
      .type('html')
      .send(
        html(attempt.order.orderNumber, authority, attempt.order.totalAmount),
      );
  }

  @Post('mock/:authority/complete')
  @HttpCode(303)
  async completeMock(
    @Param('authority') authority: string,
    @Body('result') bodyResult: string | undefined,
    @Res() response: Response,
  ) {
    const result = await this.payments.completeMock(
      authority,
      bodyResult ?? 'success',
    );
    return response.redirect(303, this.payments.redirectFor(result));
  }
}
