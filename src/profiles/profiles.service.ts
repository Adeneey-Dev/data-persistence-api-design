import {
  Injectable,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './profile.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
  ) {}

  // ---------- helpers ----------

  private getAgeGroup(age: number): string {
    if (age <= 12) return 'child';
    if (age <= 19) return 'teenager';
    if (age <= 59) return 'adult';
    return 'senior';
  }

  private async fetchExternal(url: string, apiName: string): Promise<any> {
    const res = await fetch(url);
    if (!res.ok) {
      throw new HttpException(
        { status: 'error', message: `${apiName} returned an invalid response` },
        HttpStatus.BAD_GATEWAY,
      );
    }
    return res.json();
  }

  // ---------- endpoints ----------

  async createProfile(name: string): Promise<{ status: string; message?: string; data: Profile }> {
    if (!name || name.trim() === '') {
      throw new BadRequestException({ status: 'error', message: 'Name is required' });
    }

    const cleanName = name.trim().toLowerCase();

    // Idempotency: return existing profile if name already stored
    const existing = await this.profileRepo.findOne({ where: { name: cleanName } });
    if (existing) {
      return { status: 'success', message: 'Profile already exists', data: existing };
    }

    // Call all three APIs in parallel
    const [genderData, ageData, nationData] = await Promise.all([
      this.fetchExternal(`https://api.genderize.io?name=${cleanName}`, 'Genderize'),
      this.fetchExternal(`https://api.agify.io?name=${cleanName}`, 'Agify'),
      this.fetchExternal(`https://api.nationalize.io?name=${cleanName}`, 'Nationalize'),
    ]);

    // Validate responses
    if (!genderData.gender || genderData.count === 0) {
      throw new HttpException(
        { status: 'error', message: 'Genderize returned an invalid response' },
        HttpStatus.BAD_GATEWAY,
      );
    }
    if (ageData.age === null || ageData.age === undefined) {
      throw new HttpException(
        { status: 'error', message: 'Agify returned an invalid response' },
        HttpStatus.BAD_GATEWAY,
      );
    }
    if (!nationData.country || nationData.country.length === 0) {
      throw new HttpException(
        { status: 'error', message: 'Nationalize returned an invalid response' },
        HttpStatus.BAD_GATEWAY,
      );
    }

    // Pick top country
    const topCountry = nationData.country.reduce((a: any, b: any) =>
      a.probability > b.probability ? a : b,
    );

    // Build and save profile
    const profile = this.profileRepo.create({
      id: uuidv4(),
      name: cleanName,
      gender: genderData.gender,
      gender_probability: genderData.probability,
      sample_size: genderData.count,
      age: ageData.age,
      age_group: this.getAgeGroup(ageData.age),
      country_id: topCountry.country_id,
      country_probability: topCountry.probability,
    });

    const saved = await this.profileRepo.save(profile);
    return { status: 'success', data: saved };
  }

  async getProfile(id: string): Promise<{ status: string; data: Profile }> {
    const profile = await this.profileRepo.findOne({ where: { id } });
    if (!profile) {
      throw new NotFoundException({ status: 'error', message: 'Profile not found' });
    }
    return { status: 'success', data: profile };
  }

  async getAllProfiles(filters: {
    gender?: string;
    country_id?: string;
    age_group?: string;
  }): Promise<{ status: string; count: number; data: Partial<Profile>[] }> {
    const qb = this.profileRepo.createQueryBuilder('profile');

    if (filters.gender) {
      qb.andWhere('LOWER(profile.gender) = :gender', {
        gender: filters.gender.toLowerCase(),
      });
    }
    if (filters.country_id) {
      qb.andWhere('LOWER(profile.country_id) = :country_id', {
        country_id: filters.country_id.toLowerCase(),
      });
    }
    if (filters.age_group) {
      qb.andWhere('LOWER(profile.age_group) = :age_group', {
        age_group: filters.age_group.toLowerCase(),
      });
    }

    const profiles = await qb.getMany();

    const data = profiles.map(({ id, name, gender, age, age_group, country_id }) => ({
      id, name, gender, age, age_group, country_id,
    }));

    return { status: 'success', count: data.length, data };
  }

  async deleteProfile(id: string): Promise<void> {
    const profile = await this.profileRepo.findOne({ where: { id } });
    if (!profile) {
      throw new NotFoundException({ status: 'error', message: 'Profile not found' });
    }
    await this.profileRepo.remove(profile);
  }
}