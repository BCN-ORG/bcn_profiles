import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class AuthorizeQueryDto {
  @IsString() client_id!: string;
  @IsString() redirect_uri!: string;
  @IsIn(['code']) response_type!: 'code';
  @IsString() state!: string;
  @Matches(/^[A-Za-z0-9_-]{43,128}$/) code_challenge!: string;
  @IsIn(['S256']) code_challenge_method!: 'S256';
}

export class TokenDto {
  @IsIn(['authorization_code', 'refresh_token']) grant_type!:
    | 'authorization_code'
    | 'refresh_token';
  @IsString() client_id!: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() redirect_uri?: string;
  @IsOptional() @IsString() code_verifier?: string;
  @IsOptional() @IsString() refresh_token?: string;
}

export class RevokeDto {
  @IsString() token!: string;
}
