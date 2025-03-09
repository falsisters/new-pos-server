import { ConflictException, UnauthorizedException } from '@nestjs/common';

export class UserExistsException extends ConflictException {
  constructor() {
    super('User already exists');
  }
}

export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super('Invalid credentials');
  }
}
