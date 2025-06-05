import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If a specific property is requested (e.g., "id"), return just that property
    if (data && user && typeof user === "object" && data in user) {
      return user[data];
    }

    // Otherwise return the entire user object
    return user;
  },
);
