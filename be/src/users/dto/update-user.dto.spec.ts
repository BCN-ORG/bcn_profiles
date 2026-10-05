import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { UpdateUserDto } from './update-user.dto';

describe('UpdateUserDto', () => {
  it('keeps omitted phone undefined, clears empty phone, and trims provided phone', () => {
    expect(plainToInstance(UpdateUserDto, {}).phone).toBeUndefined();
    expect(plainToInstance(UpdateUserDto, { phone: '' }).phone).toBeNull();
    expect(
      plainToInstance(UpdateUserDto, { phone: ' 0901234567 ' }).phone,
    ).toBe('0901234567');
  });
});
