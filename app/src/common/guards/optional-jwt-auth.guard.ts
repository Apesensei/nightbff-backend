import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  canActivate(context: ExecutionContext) {
    // Don't throw an error if no token is provided
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // If authentication fails, return null instead of throwing an error
    if (err || !user) {
      return null;
    }
    return user;
  }
}
