import { Injectable } from '@nestjs/common';
import { CreateSkusDto } from './dto/create-skus.dto';
import { UpdateSkusDto } from './dto/update-skus.dto';

@Injectable()
export class SkusService {
  create(createSkusDto: CreateSkusDto) {
    return 'This action adds a new skus';
  }

  findAll() {
    return `This action returns all skus`;
  }

  findOne(id: number) {
    return `This action returns a #${id} skus`;
  }

  update(id: number, updateSkusDto: UpdateSkusDto) {
    return `This action updates a #${id} skus`;
  }

  remove(id: number) {
    return `This action removes a #${id} skus`;
  }
}
