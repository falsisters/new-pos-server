import { ConflictException, UnauthorizedException } from '@nestjs/common';

export class CashierExistsException extends ConflictException {
  constructor() {
    super('Cashier already exists');
  }
}

export class CashierInvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super('Invalid credentials');
  }
}
