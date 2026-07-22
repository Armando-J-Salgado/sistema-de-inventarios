import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersService } from './providers.service';
import { NotFoundException } from '@nestjs/common';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';

describe('ProvidersService', () => {
  let service: ProvidersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProvidersService],
    }).compile();

    service = module.get<ProvidersService>(ProvidersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new provider (happy path)', () => {
      const createDto: CreateProviderDto = {
        name: 'New Provider',
        address: '123 Test St',
        email: 'test@new.com',
      };

      const result = service.create(createDto);
      expect(result).toHaveProperty('id');
      expect(result.name).toEqual(createDto.name);
      expect(result.address).toEqual(createDto.address);
      expect(result.email).toEqual(createDto.email);
      expect(result.active).toBe(true);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('findAll', () => {
    it('should return an array of providers (happy path)', () => {
      const result = service.findAll();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('name', 'Mock Provider');
    });
  });

  describe('findOne', () => {
    it('should return a provider by id (happy path)', () => {
      const result = service.findOne(1);
      expect(result).toBeDefined();
      expect(result.id).toEqual(1);
    });

    it('should throw NotFoundException if provider not found (sad path)', () => {
      expect(() => service.findOne(999)).toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a provider (happy path)', () => {
      const updateDto: UpdateProviderDto = { name: 'Updated Name' };
      const result = service.update(1, updateDto);
      expect(result).toBeDefined();
      expect(result.name).toEqual('Updated Name');
    });

    it('should throw NotFoundException if provider to update not found (sad path)', () => {
      expect(() => service.update(999, { name: 'Test' })).toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a provider (happy path)', () => {
      const result = service.remove(1);
      expect(result).toBeDefined();
      expect(result.id).toEqual(1);
      expect(() => service.findOne(1)).toThrow(NotFoundException);
    });

    it('should throw NotFoundException if provider to remove not found (sad path)', () => {
      expect(() => service.remove(999)).toThrow(NotFoundException);
    });
  });
});
