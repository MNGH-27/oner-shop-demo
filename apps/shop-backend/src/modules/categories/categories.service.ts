import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { apiEntity } from '../../common/utils/api-entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}
  private map(row: any) { return { ...apiEntity(row), parent: row.parent ? apiEntity(row.parent) : null }; }
  private async assertParent(parentId?: string | null, ownId?: string) { if (!parentId) return; if (parentId === ownId) throw new BadRequestException('دسته‌بندی نمی‌تواند والد خودش باشد'); if (!await this.prisma.category.findUnique({where:{id:parentId}})) throw new BadRequestException('دسته‌بندی والد پیدا نشد'); }
  async create(dto:CreateCategoryDto){await this.assertParent(dto.parent);const {parent,...data}=dto;return this.map(await this.prisma.category.create({data:{...data,parentId:parent||null},include:{parent:true}}));}
  async findAll(page=1,limit=20,options?:{onlyActive?:boolean;search?:string;parent?:string|null}){const where:Prisma.CategoryWhereInput={...(options?.onlyActive?{isActive:true}:{}),...(options?.search?{name:{contains:options.search,mode:'insensitive'}}:{}),...(options?.parent===null?{parentId:null}:options?.parent?{parentId:options.parent}:{})};const[rows,total]=await Promise.all([this.prisma.category.findMany({where,include:{parent:true},skip:(page-1)*limit,take:limit,orderBy:[{sortOrder:'asc'},{createdAt:'desc'}]}),this.prisma.category.count({where})]);return{items:rows.map((r)=>this.map(r)),meta:{total,page,limit,totalPages:Math.ceil(total/limit)||1}};}
  async getTree(onlyActive=false){const rows=await this.prisma.category.findMany({where:onlyActive?{isActive:true}:{},orderBy:[{sortOrder:'asc'},{name:'asc'}]});type Node=ReturnType<typeof apiEntity>&{children:Node[]};const map=new Map<string,Node>();rows.forEach((r)=>map.set(r.id,{...apiEntity(r),parent:r.parentId,children:[]} as Node));const roots:Node[]=[];rows.forEach((r)=>{const node=map.get(r.id)!;if(r.parentId&&map.has(r.parentId))map.get(r.parentId)!.children.push(node);else roots.push(node)});return roots;}
  async findById(id:string){const row=await this.prisma.category.findUnique({where:{id},include:{parent:true}});if(!row)throw new NotFoundException('Category not found');return this.map(row);}
  async update(id:string,dto:UpdateCategoryDto){await this.findById(id);await this.assertParent(dto.parent,id);const {parent,...data}=dto;return this.map(await this.prisma.category.update({where:{id},data:{...data,...(parent!==undefined?{parentId:parent||null}:{})},include:{parent:true}}));}
  async remove(id:string){if(await this.prisma.category.count({where:{parentId:id}}))throw new BadRequestException('Cannot delete category with subcategories');try{await this.prisma.category.delete({where:{id}})}catch{throw new NotFoundException('Category not found')}}
}
