import { DataSource } from "typeorm";
import { AppDataSource } from "../src/data-source.cli";

(async () => {
  try {
    const ds: DataSource = await AppDataSource.initialize();
    console.log("✅ DataSource initialized – running migrations …");
    const result = await ds.runMigrations();
    console.log(`✅ Migrations finished. Applied: ${result.length}`);
    await ds.destroy();
    process.exit(0);
  } catch (e) {
    console.error("❌ Migration runner failed", e);
    process.exit(1);
  }
})(); 