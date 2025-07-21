import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterCustomerDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CustomerService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private formatCustomer(customer: any) {
    if (!customer) return null;
    const { password, ...result } = customer;
    return result;
  }

  private async findExistingCustomer(email: string) {
    return this.prisma.customer.findUnique({
      where: {
        email,
      },
    });
  }

  async validateCustomer(email: string, password: string) {
    const customer = await this.findExistingCustomer(email);

    if (!customer) {
      throw new Error('Invalid customer credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, customer.password);

    if (!isPasswordValid) {
      throw new Error('Invalid customer credentials');
    }

    return customer;
  }

  async login(customer: any) {
    const payload = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
    };
    return {
      access_token: this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '3d',
      }),
    };
  }

  async register(registerCustomerDto: RegisterCustomerDto) {
    const { name, email, phone, password, address } = registerCustomerDto;
    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = await this.prisma.customer.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        address,
      },
    });
    return this.formatCustomer(customer);
  }

  async getCustomer(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: {
        id,
      },
    });
    return this.formatCustomer(customer);
  }

  async getCustomerByEmail(email: string) {
    const customer = await this.prisma.customer.findUnique({
      where: {
        email,
      },
    });
    return this.formatCustomer(customer);
  }

  async getAllCustomers() {
    const customers = await this.prisma.customer.findMany();
    return customers.map((c) => this.formatCustomer(c));
  }

  async editCustomer(
    id: string,
    editCustomerDto: Partial<RegisterCustomerDto>,
  ) {
    const { password } = editCustomerDto;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      editCustomerDto.password = hashedPassword;
    }

    const customer = await this.prisma.customer.update({
      where: {
        id,
      },
      data: {
        ...editCustomerDto,
      },
    });
    return this.formatCustomer(customer);
  }

  async deleteCustomer(id: string) {
    const customer = await this.prisma.customer.delete({
      where: {
        id,
      },
    });
    return this.formatCustomer(customer);
  }
}
