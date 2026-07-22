import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Employee } from '../employees/entities/employee.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly jwtService: JwtService,
  ) {}

  async validateEmployee(email: string, pass: string): Promise<Employee | null> {
    const employee = await this.employeeRepo
      .createQueryBuilder('employee')
      .addSelect('employee.password')
      .where('employee.email = :email', { email })
      .getOne();

    if (!employee || !employee.active) {
      return null;
    }

    const passwordMatches = await bcrypt.compare(pass, employee.password);
    if (passwordMatches) {
      return employee;
    }
    return null;
  }

  async login(employee: Employee) {
    const payload = { sub: employee.id, email: employee.email, roles: employee.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
