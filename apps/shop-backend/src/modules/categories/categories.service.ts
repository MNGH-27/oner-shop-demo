import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { apiEntity } from '../../common/utils/api-entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
type CategoryWithParent = Prisma.CategoryGetPayload<{
  include: { parent: true };
}>;
@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}
  private map(row: CategoryWithParent) {
    return {
      ...apiEntity(row),
      parent: row.parent ? apiEntity(row.parent) : null,
    };
  }
  private async assertParent(parentId?: string | null, ownId?: string) {
    if (!parentId) return;
    const visited = new Set<string>();
    let currentId: string | null = parentId;
    while (currentId) {
      if (currentId === ownId) {
        throw new BadRequestException(
          'این والد یک چرخه در ساختار دسته‌بندی ایجاد می‌کند',
        );
      }
      if (visited.has(currentId)) {
        throw new BadRequestException('ساختار والد دسته‌بندی چرخه‌ای است');
      }
      visited.add(currentId);
      const current: { parentId: string | null } | null =
        await this.prisma.category.findUnique({
          where: { id: currentId },
          select: { parentId: true },
        });
      if (!current) throw new BadRequestException('دسته‌بندی والد پیدا نشد');
      currentId = current.parentId;
    }
  }
  private async activeCategoryIds() {
    const rows = await this.prisma.category.findMany({
      select: { id: true, parentId: true, isActive: true },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const memo = new Map<string, boolean>();
    const hasActivePath = (id: string, trail = new Set<string>()): boolean => {
      const cached = memo.get(id);
      if (cached !== undefined) return cached;
      const row = byId.get(id);
      if (!row || !row.isActive || trail.has(id)) {
        memo.set(id, false);
        return false;
      }
      if (!row.parentId) {
        memo.set(id, true);
        return true;
      }
      const nextTrail = new Set(trail);
      nextTrail.add(id);
      const result = hasActivePath(row.parentId, nextTrail);
      memo.set(id, result);
      return result;
    };
    return rows.filter((row) => hasActivePath(row.id)).map((row) => row.id);
  }
  async create(dto: CreateCategoryDto) {
    await this.assertParent(dto.parent);
    const { parent, ...data } = dto;
    return this.map(
      await this.prisma.category.create({
        data: { ...data, parentId: parent || null },
        include: { parent: true },
      }),
    );
  }
  async findAll(
    page = 1,
    limit = 20,
    options?: { onlyActive?: boolean; search?: string; parent?: string | null },
  ) {
    const activeIds = options?.onlyActive
      ? await this.activeCategoryIds()
      : undefined;
    const where: Prisma.CategoryWhereInput = {
      ...(activeIds ? { id: { in: activeIds } } : {}),
      ...(options?.search
        ? { name: { contains: options.search, mode: 'insensitive' } }
        : {}),
      ...(options?.parent === null
        ? { parentId: null }
        : options?.parent
          ? { parentId: options.parent }
          : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        include: { parent: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.category.count({ where }),
    ]);
    return {
      items: rows.map((r) => this.map(r)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }
  async getTree(onlyActive = false) {
    const allRows = await this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const byId = new Map(allRows.map((row) => [row.id, row]));
    const hasActivePath = (id: string, trail = new Set<string>()): boolean => {
      const row = byId.get(id);
      if (!row || !row.isActive || trail.has(id)) return false;
      if (!row.parentId) return true;
      const nextTrail = new Set(trail);
      nextTrail.add(id);
      return hasActivePath(row.parentId, nextTrail);
    };
    const rows = onlyActive
      ? allRows.filter((row) => hasActivePath(row.id))
      : allRows;
    type CategoryRow = (typeof rows)[number];
    type Node = CategoryRow & {
      _id: string;
      parent: string | null;
      children: Node[];
    };
    const map = new Map<string, Node>();
    rows.forEach((r) =>
      map.set(r.id, {
        ...apiEntity(r),
        parent: r.parentId,
        children: [],
      }),
    );
    const roots: Node[] = [];
    rows.forEach((r) => {
      const node = map.get(r.id)!;
      if (r.parentId && map.has(r.parentId))
        map.get(r.parentId)!.children.push(node);
      else roots.push(node);
    });
    return roots;
  }
  async findById(id: string) {
    const row = await this.prisma.category.findUnique({
      where: { id },
      include: { parent: true },
    });
    if (!row) throw new NotFoundException('Category not found');
    return this.map(row);
  }
  async update(id: string, dto: UpdateCategoryDto) {
    await this.findById(id);
    await this.assertParent(dto.parent, id);
    const { parent, ...data } = dto;
    return this.map(
      await this.prisma.category.update({
        where: { id },
        data: {
          ...data,
          ...(parent !== undefined ? { parentId: parent || null } : {}),
        },
        include: { parent: true },
      }),
    );
  }
  async remove(id: string) {
    await this.findById(id);
    if (await this.prisma.category.count({ where: { parentId: id } }))
      throw new BadRequestException(
        'Cannot delete category with subcategories',
      );
    if (await this.prisma.product.count({ where: { categoryId: id } }))
      throw new BadRequestException(
        'Cannot delete category that still contains products',
      );
    await this.prisma.category.delete({ where: { id } });
  }
}
