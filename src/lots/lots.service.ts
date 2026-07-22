import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Provider } from 'src/providers/entities/provider.entity';
import { Sku } from 'src/skus/entities/skus.entity';
import { Repository } from 'typeorm';
import { Lot } from './entities/lot.entity';
import { CreateLotDto } from './dto/create-lot.dto';
import { LotQueryDto } from './dto/lot-query.dto';
import { UpdateLotDto } from './dto/update-lot.dto';
import { LotState } from './enums/lot-state.enum';

@Injectable()
export class LotsService {
  constructor(
    @InjectRepository(Lot)
    private readonly lotRepository: Repository<Lot>,
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    @InjectRepository(Sku)
    private readonly skuRepository: Repository<Sku>,
  ) {}

  async create(createLotDto: CreateLotDto): Promise<Lot> {
    const provider = await this.providerRepository.findOne({
      where: { id: createLotDto.providerId },
    });

    if (!provider) {
      throw new NotFoundException(`The provider with id #${createLotDto.providerId} could not be found`);
    }

    const lot = this.lotRepository.create({
      providerId: provider.id,
      provider,
      dateOfEntry: createLotDto.dateOfEntry,
      state: createLotDto.state ?? LotState.RECEIVED,
    });

    return await this.lotRepository.save(lot);
  }

  async findAll(query: LotQueryDto = {}): Promise<Lot[]> {
    const where: Record<string, unknown> = {
      active: query.active ?? true,
    };

    if (query.providerId !== undefined) {
      where.providerId = query.providerId;
    }

    if (query.state !== undefined) {
      where.state = query.state;
    }

    return await this.lotRepository.find({
      where,
      relations: ['provider'],
    });
  }

  async findOne(id: number): Promise<Lot> {
    const lot = await this.lotRepository.findOne({
      where: { id },
      relations: ['provider', 'skus'],
    });

    if (!lot) {
      throw new NotFoundException(`The lot with id #${id} could not be found`);
    }

    return lot;
  }

  async update(id: number, updateLotDto: UpdateLotDto): Promise<Lot> {
    const lot = await this.findOne(id);

    if (updateLotDto.providerId !== undefined && updateLotDto.providerId !== lot.providerId) {
      const provider = await this.providerRepository.findOne({
        where: { id: updateLotDto.providerId },
      });

      if (!provider) {
        throw new NotFoundException(`The provider with id #${updateLotDto.providerId} could not be found`);
      }

      lot.provider = provider;
      lot.providerId = provider.id;
    }

    Object.assign(lot, updateLotDto);

    return await this.lotRepository.save(lot);
  }

  async remove(id: number): Promise<Lot> {
    const lot = await this.findOne(id);

    if ((lot.skus ?? []).length > 0) {
      throw new ConflictException('Cannot deactivate lot with associated skus');
    }

    lot.active = false;

    return await this.lotRepository.save(lot);
  }
}
