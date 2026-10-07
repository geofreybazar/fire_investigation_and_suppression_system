import { PartialType } from '@nestjs/mapped-types';
import { CreateFireIncidentDto } from './create-fire-incident.dto.js';

export class UpdateFireIncidentDto extends PartialType(CreateFireIncidentDto) {}
