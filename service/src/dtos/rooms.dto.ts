import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class RoomIdParamDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId!: number;
}

class SlotIdParamDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  slotId!: number;
}

class BookingIdParamDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bookingId!: number;
}

class CreateRoomDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  center_id?: number;

  @IsString()
  @IsNotEmpty()
  room_number!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  class_id?: number | null;

  @IsString()
  @IsNotEmpty()
  day!: string;

  @IsString()
  @IsNotEmpty()
  time!: string;

  @IsOptional()
  @IsString()
  end_time?: string;
}

class UpdateRoomDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  center_id?: number;

  @IsString()
  @IsNotEmpty()
  room_number!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  class_id?: number | null;

  @IsString()
  @IsNotEmpty()
  day!: string;

  @IsString()
  @IsNotEmpty()
  time!: string;

  @IsOptional()
  @IsString()
  end_time?: string;
}

class CreateRoomSlotDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  center_id?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  room_id!: number;

  @IsDateString()
  slot_date!: string;

  @IsString()
  @IsNotEmpty()
  start_time!: string;

  @IsString()
  @IsNotEmpty()
  end_time!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration_minutes?: number;
}

class RoomSlotEntryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  room_id!: number;

  @IsDateString()
  slot_date!: string;

  @IsString()
  @IsNotEmpty()
  start_time!: string;

  @IsString()
  @IsNotEmpty()
  end_time!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration_minutes?: number;
}

class CreateMultipleRoomSlotsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  center_id?: number;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => RoomSlotEntryDto)
  slots!: RoomSlotEntryDto[];
}

class SlotConfigDto {
  @IsString()
  @IsNotEmpty()
  day!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  slots!: string[];
}

class GenerateRoomSlotsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  center_id?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  room_id!: number;

  @IsDateString()
  start_date!: string;

  @IsDateString()
  end_date!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SlotConfigDto)
  slot_configs!: SlotConfigDto[];
}

class UpdateRoomSlotDto {
  @IsOptional()
  @IsString()
  start_time?: string;

  @IsOptional()
  @IsString()
  end_time?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration_minutes?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_available?: boolean;
}

class CreateRoomBookingDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  center_id?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  slot_id!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  class_id!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  session_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teacher_id?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

class UpdateRoomBookingDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  booking_status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class UpdatePhysicalRoomDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsString()
  operating_start_time?: string;

  @IsOptional()
  @IsString()
  operating_end_time?: string;
}

module.exports = {
  RoomIdParamDto,
  SlotIdParamDto,
  BookingIdParamDto,
  CreateRoomDto,
  UpdateRoomDto,
  CreateRoomSlotDto,
  CreateMultipleRoomSlotsDto,
  GenerateRoomSlotsDto,
  UpdateRoomSlotDto,
  CreateRoomBookingDto,
  UpdateRoomBookingDto,
  UpdatePhysicalRoomDto,
};

export {};
