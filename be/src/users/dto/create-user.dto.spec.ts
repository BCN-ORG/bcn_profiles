import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

describe('CreateUserDto', () => {
  it('normalizes a blank optional phone to undefined', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'admin-created@example.test',
      password: 'secret123',
      phone: '   ',
    });

    expect(dto.phone).toBeUndefined();
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
