import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CustomerService } from '../customer.service';

@Injectable()
export class LocalCustomerStrategy extends PassportStrategy(
  Strategy,
  'local-customer',
) {
  constructor(private customerService: CustomerService) {
    super({ usernameField: 'email', passwordField: 'password' });
  }

  async validate(email: string, password: string): Promise<any> {
    const customer = await this.customerService.validateCustomer(
      email,
      password,
    );
    if (!customer) {
      throw new UnauthorizedException('Invalid customer credentials');
    }
    return customer;
  }
}
