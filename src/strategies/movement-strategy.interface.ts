import { Movement } from '../movements/entities/movement.entity';

export interface MovementStrategy<TDto = any> {
  execute(dto: TDto): Promise<Movement | Movement[]>;
}