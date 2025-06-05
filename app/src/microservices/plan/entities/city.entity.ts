import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

// Note: Actual Point type import might depend on driver/library specifics, using string for WKT initially is safer.
// import { Point } from 'geojson'; // Or from TypeORM if supported directly

@Entity("cities")
export class City {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ type: "varchar", length: 100 })
  name: string;

  @Index()
  @Column({ type: "varchar", length: 2 })
  countryCode: string;

  @Index({ spatial: true })
  @Column({
    type: "geometry",
    spatialFeatureType: "Point",
    srid: 4326, // WGS 84
    nullable: true,
  })
  location?: string; // Store as WKT string initially, e.g., 'POINT(-73.935242 40.73061)'
  // Or potentially: location?: Point;

  @Column({ type: "varchar", length: 10, nullable: true })
  flagEmoji?: string;

  @Index()
  @Column({ type: "float", default: 0 })
  trendingScore: number;

  @Column({ type: "integer", default: 0 })
  planCount: number;

  @Column({ type: "varchar", length: 2048, nullable: true })
  imageUrl?: string;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updatedAt: Date;
}
