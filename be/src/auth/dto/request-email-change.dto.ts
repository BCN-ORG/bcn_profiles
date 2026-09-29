import { IsEmail, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class RequestEmailChangeDto {
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Email mới không hợp lệ' })
  @IsNotEmpty({ message: 'Email mới không được để trống' })
  newEmail!: string;
}
