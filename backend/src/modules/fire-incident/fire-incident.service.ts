import { Injectable } from '@nestjs/common';
import { CreateFireIncidentDto } from './dto/create-fire-incident.dto.js';
import { UpdateFireIncidentDto } from './dto/update-fire-incident.dto.js';

@Injectable()
export class FireIncidentService {
  create(createFireIncidentDto: CreateFireIncidentDto) {
    return 'This action adds a new fireIncident';
  }

  findAll() {
    return `This action returns all fireIncident`;
  }

  findOne(id: number) {
    return `This action returns a #${id} fireIncident`;
  }

  update(id: number, updateFireIncidentDto: UpdateFireIncidentDto) {
    return `This action updates a #${id} fireIncident`;
  }

  remove(id: number) {
    return `This action removes a #${id} fireIncident`;
  }
}
