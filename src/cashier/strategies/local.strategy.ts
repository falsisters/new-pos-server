import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CashierService } from '../cashier.service';

@Injectable()
export class LocalCashierStrategy extends PassportStrategy(
  Strategy,
  'local-cashier',
) {
  constructor(private cashierService: CashierService) {
    super({ usernameField: 'name', passwordField: 'accessKey' });
  }

  async validate(name: string, accessKey: string): Promise<any> {
    const cashier = await this.cashierService.validateCashier(name, accessKey);
    if (!cashier) {
      throw new UnauthorizedException('Invalid cashier credentials');
    }
    return cashier;
  }
}
