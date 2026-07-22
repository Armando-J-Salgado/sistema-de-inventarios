import { Test, TestingModule } from '@nestjs/testing';
import { WarehousesController } from './warehouses.controller';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { JwtAuthGuard } from '../jwt/jwt.guard';
import { RolesGuard } from '../jwt/roles/roles.guard';

describe('WarehousesController', () => {
  let controller: WarehousesController;
  let service: WarehousesService;

  const mockWarehousesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WarehousesController],
      providers: [
        {
          provide: WarehousesService,
          useValue: mockWarehousesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WarehousesController>(WarehousesController);
    service = module.get<WarehousesService>(WarehousesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate create warehouse dto to service', async () => {
      const dto: CreateWarehouseDto = { name: 'Central', maximumCapacity: 1000 };
      const expectedResult = { id: 1, name: 'Central', maximumCapacity: 1000, availableCapacity: 1000, active: true };
      mockWarehousesService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should pass undefined to service when no query param is provided', async () => {
      mockWarehousesService.findAll.mockResolvedValue([]);

      await controller.findAll(undefined as any);

      expect(service.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should pass true to service when active query is "true"', async () => {
      mockWarehousesService.findAll.mockResolvedValue([]);

      await controller.findAll('true');

      expect(service.findAll).toHaveBeenCalledWith(true);
    });

    it('should pass false to service when active query is "false"', async () => {
      mockWarehousesService.findAll.mockResolvedValue([]);

      await controller.findAll('false');

      expect(service.findAll).toHaveBeenCalledWith(false);
    });

    it('should pass undefined to service for unrecognised active query value', async () => {
      mockWarehousesService.findAll.mockResolvedValue([]);

      await controller.findAll('invalid');

      expect(service.findAll).toHaveBeenCalledWith(undefined);
    });
  });

  describe('findOne', () => {
    it('should convert id param to number and delegate to service findOne', async () => {
      const warehouse = { id: 1, name: 'Central' };
      mockWarehousesService.findOne.mockResolvedValue(warehouse);

      const result = await controller.findOne('1');

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(warehouse);
    });
  });

  describe('update', () => {
    it('should convert id param to number and delegate update to service', async () => {
      const dto: UpdateWarehouseDto = { name: 'Central 2' };
      const updatedWarehouse = { id: 1, name: 'Central 2' };
      mockWarehousesService.update.mockResolvedValue(updatedWarehouse);

      const result = await controller.update('1', dto);

      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(updatedWarehouse);
    });
  });

  describe('remove', () => {
    it('should convert id param to number and delegate remove to service', async () => {
      const removedWarehouse = { id: 1, name: 'Central', active: false };
      mockWarehousesService.remove.mockResolvedValue(removedWarehouse);

      const result = await controller.remove('1');

      expect(service.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual(removedWarehouse);
    });
  });
});
