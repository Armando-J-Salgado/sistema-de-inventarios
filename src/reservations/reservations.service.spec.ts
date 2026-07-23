import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsService } from './reservations.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { StocksService } from '../stocks/stocks.service';
import { Stock } from '../stocks/entities/stock.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReservationStatus } from './enums/reservation-status.enum';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let mockRepository: any;
  let mockStocksService: any;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    mockStocksService = {
      getAvailable: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Stock),
          useValue: mockRepository,
        },
        {
          provide: StocksService,
          useValue: mockStocksService,
        },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a reservation successfully if stock is available', async () => {
      mockStocksService.getAvailable.mockResolvedValue(100);
      const dto = { sourceStockId: 1, quantity: 10, fromDate: '2026-07-25T10:00:00Z', toDate: '2026-07-26T10:00:00Z' };
      const createdReservation = { id: 1, ...dto, status: ReservationStatus.ACTIVE };
      
      mockRepository.create.mockReturnValue(createdReservation);
      mockRepository.save.mockResolvedValue(createdReservation);

      const result = await service.create(dto, {});
      expect(mockStocksService.getAvailable).toHaveBeenCalledWith(1);
      expect(mockRepository.create).toHaveBeenCalledWith({
        stock: { id: dto.sourceStockId },
        quantity: dto.quantity,
        fromDate: new Date(dto.fromDate),
        toDate: new Date(dto.toDate),
        status: ReservationStatus.ACTIVE,
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(createdReservation);
    });

    it('should throw BadRequestException if stock is insufficient', async () => {
      mockStocksService.getAvailable.mockResolvedValue(5); // Only 5 available
      const dto = { sourceStockId: 1, quantity: 10, fromDate: '2026-07-25T10:00:00Z', toDate: '2026-07-26T10:00:00Z' };
      
      await expect(service.create(dto, {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all reservations', async () => {
      const reservations = [{ id: 1 }];
      mockRepository.find.mockResolvedValue(reservations);
      const result = await service.findAll({});
      expect(result).toEqual(reservations);
    });
  });

  describe('findOne', () => {
    it('should return a reservation if found', async () => {
      const reservation = { id: 1 };
      mockRepository.findOne.mockResolvedValue(reservation);
      const result = await service.findOne(1, {});
      expect(result).toEqual(reservation);
    });

    it('should throw NotFoundException if not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne(1, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should allow changing status from ACTIVE to COMPLETED', async () => {
      const existing = { id: 1, status: ReservationStatus.ACTIVE, quantity: 10, stock: { id: 1 } };
      mockRepository.findOne.mockResolvedValue(existing);
      const updated = { ...existing, status: ReservationStatus.COMPLETED };
      mockRepository.save.mockResolvedValue(updated);

      const result = await service.update(1, { status: ReservationStatus.COMPLETED }, {});
      expect(result.status).toEqual(ReservationStatus.COMPLETED);
    });

    it('should throw BadRequestException if changing from COMPLETED', async () => {
      const existing = { id: 1, status: ReservationStatus.COMPLETED };
      mockRepository.findOne.mockResolvedValue(existing);
      await expect(service.update(1, { status: ReservationStatus.CANCELLED }, {})).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if changing from CANCELLED', async () => {
      const existing = { id: 1, status: ReservationStatus.CANCELLED };
      mockRepository.findOne.mockResolvedValue(existing);
      await expect(service.update(1, { status: ReservationStatus.ACTIVE }, {})).rejects.toThrow(BadRequestException);
    });

    it('should re-validate stock if quantity increases', async () => {
      const existing = { id: 1, status: ReservationStatus.ACTIVE, quantity: 10, stock: { id: 1 } };
      mockRepository.findOne.mockResolvedValue(existing);
      // It currently has 10, wants 15. The getAvailable might return what's available BEFORE the change or AFTER.
      // Assuming getAvailable computes based on current DB state, if we want 5 more, we need getAvailable >= 5.
      // But standard way: available = getAvailable(1). New total required = 15. If available + existing.quantity < newQuantity => error.
      mockStocksService.getAvailable.mockResolvedValue(2); // Has 10, available 2 => max 12. Wants 15 => fails.
      
      await expect(service.update(1, { quantity: 15 }, {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should set status to CANCELLED and soft delete', async () => {
      const existing = { id: 1, status: ReservationStatus.ACTIVE };
      mockRepository.findOne.mockResolvedValue(existing);
      
      const saved = { ...existing, status: ReservationStatus.CANCELLED };
      mockRepository.save.mockResolvedValue(saved);
      
      // Assume we use a softRemove method or just save and then softRemove
      mockRepository.softRemove = jest.fn().mockResolvedValue(saved);

      const result = await service.remove(1, {});
      expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining({ status: ReservationStatus.CANCELLED }));
      expect(mockRepository.softRemove).toHaveBeenCalledWith(expect.objectContaining({ status: ReservationStatus.CANCELLED }));
    });
  });
});

