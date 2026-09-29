import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class ConfirmEmailChangeDto {
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Email mới không hợp lệ' })
  @IsNotEmpty({ message: 'Email mới không được để trống' })
  newEmail!: string;

  @IsString()
  @IsNotEmpty({ message: 'Mã OTP không được để trống' })
  @Length(6, 6, { message: 'Mã OTP phải có đúng 6 ký tự' })
  otp!: string;
}
