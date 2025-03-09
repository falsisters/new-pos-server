import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalCashierAuthGuard extends AuthGuard('local-cashier') {}
