import { Controller, Get, Param } from '@nestjs/common';
import { JamsService } from './jams.service';

@Controller('public/jams')
export class PublicJamsController {
  constructor(private readonly jamsService: JamsService) {}

  @Get(':id')
  async getPublicJamById(@Param('id') id: string) {
    // Call the service without userId to get public jam details
    return this.jamsService.getJamById(id);
  }

  @Get(':id/participants')
  async getPublicJamParticipants(@Param('id') id: string) {
    // Get public participant information (no sensitive data)
    return this.jamsService.getPublicJamParticipants(id);
  }
}
