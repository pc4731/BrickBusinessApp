import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Languages, UserRoles } from '@brick/types';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  phone?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsIn(UserRoles as unknown as string[])
  role!: (typeof UserRoles)[number];

  @IsOptional()
  @IsIn(Languages as unknown as string[])
  language?: (typeof Languages)[number];
}

export class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(15) phone?: string;
  @IsOptional() @IsIn(UserRoles as unknown as string[]) role?: (typeof UserRoles)[number];
  @IsOptional() @IsIn(Languages as unknown as string[]) language?: (typeof Languages)[number];
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() @MinLength(8) @MaxLength(72) password?: string;
}
