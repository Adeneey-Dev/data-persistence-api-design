import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  async createProfile(@Body() body: any) {
    if (body.name === undefined || body.name === null) {
      throw new BadRequestException({ status: 'error', message: 'Name is required' });
    }
    if (typeof body.name !== 'string') {
      throw new UnprocessableEntityException({ status: 'error', message: 'Name must be a string' });
    }
    if (body.name.trim() === '') {
      throw new BadRequestException({ status: 'error', message: 'Name cannot be empty' });
    }
    return this.profilesService.createProfile(body.name);
  }

  @Get()
  async getAllProfiles(
    @Query('gender') gender?: string,
    @Query('country_id') country_id?: string,
    @Query('age_group') age_group?: string,
  ) {
    return this.profilesService.getAllProfiles({ gender, country_id, age_group });
  }

  @Get(':id')
  async getProfile(@Param('id') id: string) {
    return this.profilesService.getProfile(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProfile(@Param('id') id: string) {
    await this.profilesService.deleteProfile(id);
  }
}