import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../jwt/jwt.guard';
import { RolesGuard } from '../jwt/roles/roles.guard';
import { Roles } from '../jwt/roles/roles.decorator';

@ApiTags('employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @ApiOperation({ summary: 'Create an employee' })
  @ApiResponse({ status: 201, description: 'Employee created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @Roles('ADMINISTRATOR')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeesService.create(createEmployeeDto);
  }

  @ApiOperation({ summary: 'Find all employees' })
  @ApiQuery({ name: 'active', required: false, type: String, description: 'Filter employees by active state' })
  @ApiQuery({ name: 'role', required: false, type: String, description: 'Filter employees by role' })
  @ApiResponse({ status: 200, description: 'Employee list returned successfully' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('active') active?: string, @Query('role') role?: string) {
    const normalizedActive =
      active === undefined
        ? undefined
        : active.toLowerCase() === 'true'
          ? true
          : active.toLowerCase() === 'false'
            ? false
            : undefined;

    return this.employeesService.findAll(normalizedActive, role);
  }

  @ApiOperation({ summary: 'Find a single employee' })
  @ApiParam({ name: 'id', type: Number, description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Employee returned successfully' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(+id);
  }

  @ApiOperation({ summary: 'Update an employee' })
  @ApiParam({ name: 'id', type: Number, description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Employee updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @Roles('ADMINISTRATOR')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEmployeeDto: UpdateEmployeeDto) {
    return this.employeesService.update(+id, updateEmployeeDto);
  }

  @ApiOperation({ summary: 'Deactivate an employee' })
  @ApiParam({ name: 'id', type: Number, description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Employee deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @ApiResponse({ status: 409, description: 'Employee has an active warehouse assigned' })
  @Roles('ADMINISTRATOR')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeesService.remove(+id);
  }
}
