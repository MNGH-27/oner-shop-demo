import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProductColorDto } from './create-product.dto';

describe('ProductColorDto', () => {
  it('accepts a six-digit HEX palette value', async () => {
    const color = plainToInstance(ProductColorDto, {
      name: 'کرم',
      hex: '#D8C4A8',
    });

    await expect(validate(color)).resolves.toHaveLength(0);
  });

  it('keeps the palette optional for legacy colors', async () => {
    const color = plainToInstance(ProductColorDto, { name: 'کرم' });

    await expect(validate(color)).resolves.toHaveLength(0);
  });

  it('rejects invalid palette values', async () => {
    const color = plainToInstance(ProductColorDto, {
      name: 'کرم',
      hex: 'cream',
    });

    const errors = await validate(color);
    expect(errors[0]?.constraints?.matches).toContain('HEX');
  });
});
