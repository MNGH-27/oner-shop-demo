import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  it('rejects a parent that points back to the category being edited', async () => {
    const now = new Date();
    const prisma = {
      category: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'category-a',
            name: 'A',
            description: null,
            image: null,
            parentId: null,
            parent: null,
            isActive: true,
            sortOrder: 0,
            createdAt: now,
            updatedAt: now,
          })
          .mockResolvedValueOnce({ parentId: 'category-a' }),
      },
    } as unknown as PrismaService;
    const service = new CategoriesService(prisma);

    await expect(
      service.update('category-a', { parent: 'category-b' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
