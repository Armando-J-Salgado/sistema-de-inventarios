import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { SeederService } from './seeder.service';

@Injectable()
export class SeederRunnerService implements OnApplicationBootstrap {
  constructor(
    private readonly seederService: SeederService,
  ) {}

  async onApplicationBootstrap() {
    await this.seederService.seed();
  }
}