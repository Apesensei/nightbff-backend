import { Pact } from "@pact-foundation/pact";
import * as path from "path";

export const provider = new Pact({
  consumer: "nightbff-frontend",
  provider: "nightbff-backend",
  port: 1234,
  log: path.resolve(process.cwd(), "logs", "pact.log"),
  dir: path.resolve(process.cwd(), "pacts"),
  logLevel: "warn",
  spec: 2,
});
