import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaymentModes, PaymentTypes, TruckExpenseTypes } from '@brick/types';

class MoneyEventBase {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountPaise!: number;

  @IsISO8601()
  paymentDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}

class BankRefFields extends MoneyEventBase {
  @IsIn(PaymentModes as unknown as string[])
  paymentMode!: (typeof PaymentModes)[number];

  @IsOptional() @IsString() @MaxLength(40) chequeNumber?: string;
  @IsOptional() @IsString() @MaxLength(60) upiRef?: string;
  @IsOptional() @IsString() @MaxLength(60) bankRef?: string;
  @IsOptional() @IsString() proofUrl?: string;
}

export class CreateCustomerPaymentDto extends BankRefFields {
  @IsString()
  customerId!: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsIn(PaymentTypes as unknown as string[])
  paymentType!: (typeof PaymentTypes)[number];

  @IsOptional()
  @IsString()
  receivedById?: string;
}

export class CreateFactoryPaymentDto extends BankRefFields {
  @IsString()
  factoryId!: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsIn(PaymentTypes as unknown as string[])
  paymentType!: (typeof PaymentTypes)[number];

  @IsOptional()
  @IsString()
  paidById?: string;
}

export class CreateTruckPaymentDto extends MoneyEventBase {
  @IsString()
  hiredTruckId!: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsIn(PaymentModes as unknown as string[])
  paymentMode!: (typeof PaymentModes)[number];
}

export class CreateTruckExpenseDto {
  @IsString()
  ownTruckId!: string;

  @IsIn(TruckExpenseTypes as unknown as string[])
  expenseType!: (typeof TruckExpenseTypes)[number];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountPaise!: number;

  @IsISO8601()
  expenseDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsString()
  proofUrl?: string;
}

export class CreateGeneralExpenseDto {
  @IsString()
  @MaxLength(80)
  category!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountPaise!: number;

  @IsISO8601()
  expenseDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsString()
  proofUrl?: string;
}
