import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category, CategoryDocument } from './schemas/category.schema';

@Injectable()
export class CategoriesService implements OnModuleInit {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async onModuleInit() {
    try {
      await this.categoryModel.collection.dropIndex('slug_1');
    } catch {
      /* index may not exist */
    }
  }

  async create(dto: CreateCategoryDto): Promise<CategoryDocument> {
    return this.categoryModel.create({ ...dto });
  }

  async findAll(
    page = 1,
    limit = 20,
    options?: { onlyActive?: boolean; search?: string; parent?: string | null },
  ) {
    const filter: Record<string, unknown> = {};

    if (options?.onlyActive === true) filter.isActive = true;
    if (options?.search) {
      filter.name = { $regex: options.search, $options: 'i' };
    }
    if (options?.parent === null) {
      filter.parent = null;
    } else if (options?.parent) {
      filter.parent = options.parent;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.categoryModel
        .find(filter)
        .populate('parent', 'name')
        .skip(skip)
        .limit(limit)
        .sort({ sortOrder: 1, createdAt: -1 })
        .exec(),
      this.categoryModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getTree(onlyActive = false): Promise<Record<string, unknown>[]> {
    const filter = onlyActive ? { isActive: true } : {};
    const categories = await this.categoryModel
      .find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .lean()
      .exec();

    type TreeNode = Record<string, unknown> & { children: TreeNode[] };
    const map = new Map<string, TreeNode>();

    for (const cat of categories) {
      map.set(String(cat._id), { ...cat, children: [] });
    }

    const roots: TreeNode[] = [];
    for (const cat of categories) {
      const node = map.get(String(cat._id))!;
      const parentId = cat.parent ? String(cat.parent) : null;
      if (parentId && map.has(parentId)) {
        map.get(parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async findById(id: string): Promise<CategoryDocument> {
    const category = await this.categoryModel
      .findById(id)
      .populate('parent', 'name')
      .exec();

    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryDocument> {
    const category = await this.categoryModel
      .findByIdAndUpdate(id, dto, { new: true })
      .populate('parent', 'name')
      .exec();

    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async remove(id: string): Promise<void> {
    const children = await this.categoryModel.countDocuments({ parent: id }).exec();
    if (children > 0) {
      throw new BadRequestException('Cannot delete category with subcategories');
    }

    const result = await this.categoryModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Category not found');
  }
}
