import { Injectable } from '@nestjs/common';

@Injectable()
export class FireIncidentService {
  addFireIncident(createFireIncidentDto: any) {
    return 'This action adds a new fireIncident';
  }

  // findAll() {
  //   return `This action returns all fireIncident`;
  // }

  // findOne(id: number) {
  //   return `This action returns a #${id} fireIncident`;
  // }

  // update(id: number, updateFireIncidentDto: UpdateFireIncidentDto) {
  //   return `This action updates a #${id} fireIncident`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} fireIncident`;
  // }
}
