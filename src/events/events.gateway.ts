import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/sales',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients = 0;

  handleConnection(_client: Socket) {
    this.connectedClients++;
  }

  handleDisconnect(_client: Socket) {
    this.connectedClients--;
  }

  getConnectedCount(): number {
    return this.connectedClients;
  }

  emitSaleCreated(sale: unknown) {
    this.server.emit('sale:created', sale);
  }

  emitSaleUpdated(sale: unknown) {
    this.server.emit('sale:updated', sale);
  }

  emitSaleVoided(sale: unknown) {
    this.server.emit('sale:voided', sale);
  }
}
