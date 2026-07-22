import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { Provider } from './entities/provider.entity';

@Injectable()
export class ProvidersService {
  private providers: Provider[] = [
    {
      id: 1,
      name: 'Mock Provider',
      address: 'Mock Address',
      email: 'mock@provider.com',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null as any,
      products: [],
      lots: []
    }
  ];
  private nextId = 2;

  create(createProviderDto: CreateProviderDto) {
    const newProvider: Provider = {
      id: this.nextId++,
      ...createProviderDto,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null as any,
      products: [],
      lots: []
    };
    this.providers.push(newProvider);
    return newProvider;
  }

  findAll() {
    return this.providers;
  }

  findOne(id: number) {
    const provider = this.providers.find(p => p.id === id);
    if (!provider) {
      throw new NotFoundException(`Provider with ID ${id} not found`);
    }
    return provider;
  }

  update(id: number, updateProviderDto: UpdateProviderDto) {
    const index = this.providers.findIndex(p => p.id === id);
    if (index === -1) {
      throw new NotFoundException(`Provider with ID ${id} not found`);
    }
    
    this.providers[index] = {
      ...this.providers[index],
      ...updateProviderDto,
      updatedAt: new Date(),
    };
    
    return this.providers[index];
  }

  remove(id: number) {
    const index = this.providers.findIndex(p => p.id === id);
    if (index === -1) {
      throw new NotFoundException(`Provider with ID ${id} not found`);
    }
    
    const provider = this.providers[index];
    this.providers.splice(index, 1);
    return provider;
  }
}
