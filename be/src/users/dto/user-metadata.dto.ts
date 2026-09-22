import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UserMetadataDto {
  @IsOptional()
  @IsString({ message: 'Bio phải là chuỗi' })
  @MaxLength(500, { message: 'Bio không được vượt quá 500 ký tự' })
  bio?: string;

  @IsOptional()
  @IsString({ message: 'Khóa thành viên phải là chuỗi' })
  @MaxLength(20, { message: 'Khóa thành viên không được vượt quá 20 ký tự' })
  cohort?: string;

  @IsOptional()
  @IsString({ message: 'Vai trò cộng đồng phải là chuỗi' })
  @MaxLength(80, {
    message: 'Vai trò cộng đồng không được vượt quá 80 ký tự',
  })
  communityRole?: string;

  @IsOptional()
  @IsBoolean({ message: 'Trạng thái 3D phải là boolean' })
  profile3dEnabled?: boolean;

  @IsOptional()
  @IsString({ message: 'Trạng thái phải là chuỗi' })
  status?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsUrl({}, { message: 'Link Facebook không hợp lệ' })
  facebook?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsUrl({}, { message: 'Link Instagram không hợp lệ' })
  instagram?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsUrl({}, { message: 'Link TikTok không hợp lệ' })
  tiktok?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsUrl({}, { message: 'Link YouTube không hợp lệ' })
  youtube?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsUrl({}, { message: 'Link GitHub không hợp lệ' })
  github?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsUrl({}, { message: 'Link LinkedIn không hợp lệ' })
  linkedin?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsUrl({}, { message: 'Link Twitter/X không hợp lệ' })
  twitter?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsUrl({}, { message: 'Link website không hợp lệ' })
  website?: string;
}
