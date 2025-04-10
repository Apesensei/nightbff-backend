import { Injectable, PipeTransform } from "@nestjs/common";
import { Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class ParseSocketJwtPipe implements PipeTransform {
  constructor(private readonly jwtService: JwtService) {}

  async transform(socket: Socket): Promise<any> {
    try {
      // Extract token from either query or handshake headers
      const token = this.extractTokenFromSocket(socket);

      if (!token) {
        return null;
      }

      // Verify and decode token
      const decoded = await this.jwtService.verifyAsync(token);

      return decoded;
    } catch (error) {
      console.error("JWT validation error:", error.message);
      return null;
    }
  }

  private extractTokenFromSocket(socket: Socket): string | null {
    // Try to get from query
    if (socket.handshake.query && socket.handshake.query.token) {
      return socket.handshake.query.token as string;
    }

    // Try to get from headers (Authorization: Bearer <token>)
    if (socket.handshake.headers.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      const matches = authHeader.match(/Bearer\s+(\S+)/i);

      if (matches && matches[1]) {
        return matches[1];
      }
    }

    // Try to get from cookie
    if (socket.handshake.headers.cookie) {
      const cookies = socket.handshake.headers.cookie.split(";");
      const tokenCookie = cookies.find((c) => c.trim().startsWith("token="));

      if (tokenCookie) {
        return tokenCookie.split("=")[1];
      }
    }

    return null;
  }
}
