import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly repository: Repository<Category>
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const existing = await this.repository.findOne({ where: { name: createCategoryDto.name } });
    if (existing) {
      throw new ConflictException('Category name already exists');
    }
    const category = this.repository.create(createCategoryDto);
    return await this.repository.save(category);
  }

  async findAll(active: boolean | undefined): Promise<Category[]> {
    const where = active === undefined ? {} : {where: {active}};
    return await this.repository.find(where);
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.repository.findOne({where: {id: id}});
    if (!category) {
      throw new NotFoundException(`The category with id #${id} could not be found`);
    }
    return category;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const category = await this.repository.findOne({where: {id}});
    if (!category) {
      throw new NotFoundException(`The category with id #${id} was not found`);
    }
    if (updateCategoryDto.name) {
      const nameConflict = await this.repository.findOne({ where: { name: updateCategoryDto.name } });
      if (nameConflict) {
        throw new ConflictException('Category name already exists');
      }
    }
    const updatedCategory = Object.assign(category, updateCategoryDto);
    return await this.repository.save(updatedCategory);
  }

  async remove(id: number): Promise<Category> {
      const category = await this.repository.findOne({where: {id}});
      if (!category) {
        throw new NotFoundException(`The searched category with id #${id} was not found`);
      }
      category.active = false;
      return await this.repository.save(category);
  }
}
