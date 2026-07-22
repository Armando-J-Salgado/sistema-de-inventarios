import { Test, TestingModule } from '@nestjs/testing';
import { MovementEntityResolverService } from './movement-entity-resolver.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Warehouse } from 'src/warehouses/entities/warehouse.entity';
import { Employee } from 'src/employees/entities/employee.entity';
import { ProductVariant } from '../../product-variants/entities/product-variant.entity';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import { NotFoundException } from '@nestjs/common';

describe('MovementEntityResolverService', () => {
  let service: MovementEntityResolverService;
  let warehouseRepo: any;
  let employeeRepo: any;
  let productVariantRepo: any;
  let reservationRepo: any;

  beforeEach(async () => {
    const mockWarehouseRepo = { findOne: jest.fn() };
    const mockEmployeeRepo = { findOne: jest.fn() };
    const mockProductVariantRepo = { findOne: jest.fn() };
    const mockReservationRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovementEntityResolverService,
        { provide: getRepositoryToken(Warehouse), useValue: mockWarehouseRepo },
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
        { provide: getRepositoryToken(ProductVariant), useValue: mockProductVariantRepo },
        { provide: getRepositoryToken(Reservation), useValue: mockReservationRepo },
      ],
    }).compile();

    service = module.get<MovementEntityResolverService>(MovementEntityResolverService);
    warehouseRepo = module.get(getRepositoryToken(Warehouse));
    employeeRepo = module.get(getRepositoryToken(Employee));
    productVariantRepo = module.get(getRepositoryToken(ProductVariant));
    reservationRepo = module.get(getRepositoryToken(Reservation));
  });

  describe('resolveWarehouseAndEmployee', () => {
    it('returns both when found', async () => {
      warehouseRepo.findOne.mockResolvedValue({ id: 1 });
      employeeRepo.findOne.mockResolvedValue({ id: 2 });
      
      const result = await service.resolveWarehouseAndEmployee(1, 2);
      expect(result).toEqual({ warehouse: { id: 1 }, employee: { id: 2 } });
    });

    it('throws NotFoundException when warehouse not found', async () => {
      warehouseRepo.findOne.mockResolvedValue(null);
      employeeRepo.findOne.mockResolvedValue({ id: 2 });
      
      await expect(service.resolveWarehouseAndEmployee(1, 2)).rejects.toThrow(
        new NotFoundException('The warehouse with ID 1 was not found'),
      );
    });

    it('throws NotFoundException when employee not found', async () => {
      warehouseRepo.findOne.mockResolvedValue({ id: 1 });
      employeeRepo.findOne.mockResolvedValue(null);
      
      await expect(service.resolveWarehouseAndEmployee(1, 2)).rejects.toThrow(
        new NotFoundException('The employee with ID 2 is not found'),
      );
    });
  });

  describe('resolveProductVariant', () => {
    it('returns product variant when found', async () => {
      productVariantRepo.findOne.mockResolvedValue({ id: 1 });
      const result = await service.resolveProductVariant(1);
      expect(result).toEqual({ id: 1 });
    });

    it('throws NotFoundException when not found', async () => {
      productVariantRepo.findOne.mockResolvedValue(null);
      await expect(service.resolveProductVariant(1)).rejects.toThrow(
        new NotFoundException('Product variant 1 was not found'),
      );
    });
  });

  describe('resolveWarehouseFromReservation', () => {
    it('returns reservation, warehouse, and stock when all found', async () => {
      reservationRepo.findOne.mockResolvedValue({
        id: 1,
        stock: {
          id: 1,
          warehouse: { id: 1 }
        }
      });
      const result = await service.resolveWarehouseFromReservation(1);
      expect(result.reservation).toBeDefined();
      expect(result.warehouse).toBeDefined();
      expect(result.stock).toBeDefined();
    });

    it('throws NotFoundException when reservation not found', async () => {
      reservationRepo.findOne.mockResolvedValue(null);
      await expect(service.resolveWarehouseFromReservation(1)).rejects.toThrow(
        new NotFoundException('The reservation with ID 1 was not found'),
      );
    });

    it('throws NotFoundException when reservation stock is null', async () => {
      reservationRepo.findOne.mockResolvedValue({ id: 1, stock: null });
      await expect(service.resolveWarehouseFromReservation(1)).rejects.toThrow(
        new NotFoundException('The reservation with ID 1 has no associated stock'),
      );
    });

    it('throws NotFoundException when stock warehouse is null', async () => {
      reservationRepo.findOne.mockResolvedValue({ id: 1, stock: { id: 1, warehouse: null } });
      await expect(service.resolveWarehouseFromReservation(1)).rejects.toThrow(
        new NotFoundException('The stock associated with reservation 1 has no warehouse'),
      );
    });
  });
});
