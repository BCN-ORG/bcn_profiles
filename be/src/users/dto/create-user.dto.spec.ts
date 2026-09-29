import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

describe('CreateUserDto', () => {
  it('normalizes email casing and surrounding whitespace', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: '  Admin-Created@Example.TEST  ',
      password: 'secret123',
    });

    expect(dto.email).toBe('admin-created@example.test');
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

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
