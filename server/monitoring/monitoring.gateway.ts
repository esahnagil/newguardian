import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { log } from '../vite';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class MonitoringGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  handleConnection(client: Socket) {
    log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    log(`Client disconnected: ${client.id}`);
  }

  // Method to broadcast monitoring data to all connected clients
  broadcastMetrics(metrics: any) {
    this.server.emit('metrics', metrics);
  }

  // Method to broadcast device status updates
  broadcastDeviceStatus(deviceStatus: any) {
    this.server.emit('deviceStatus', deviceStatus);
  }
}
