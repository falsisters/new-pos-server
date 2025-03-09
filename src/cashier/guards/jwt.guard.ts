import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtCashierAuthGuard extends AuthGuard('jwt-cashier') {}
