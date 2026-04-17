import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryColumn,
} from 'typeorm';

@Entity('profiles')
export class Profile {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  gender: string;

  @Column('float', { nullable: true })
  gender_probability: number;

  @Column('int', { nullable: true })
  sample_size: number;

  @Column('int', { nullable: true })
  age: number;

  @Column({ nullable: true })
  age_group: string;

  @Column({ nullable: true })
  country_id: string;

  @Column('float', { nullable: true })
  country_probability: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}