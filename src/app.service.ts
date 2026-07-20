import { Injectable } from '@nestjs/common';
import { json } from 'stream/consumers';

@Injectable()
export class AppService {
  getHealthCheck(): string {
    const status = {"status": "ok", "timestamp": new Date()}
    return JSON.stringify(status);
  }
}
