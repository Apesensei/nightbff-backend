import { Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity("scanned_areas")
export class ScannedArea {
  @PrimaryColumn({ type: "varchar" }) // Geohash is a string
  geohashPrefix: string;

  // Use UpdateDateColumn for simplicity if the timestamp should always reflect the last save
  // Or use a regular Column if you need more explicit control
  @UpdateDateColumn({
    type: "timestamp with time zone",
    name: "lastScannedAt", // Match migration column name
  })
  lastScannedAt: Date;

  // Optional: If you want to track creation time separately
  // @CreateDateColumn({ type: "timestamp with time zone", name: "createdAt" })
  // createdAt: Date;
}
