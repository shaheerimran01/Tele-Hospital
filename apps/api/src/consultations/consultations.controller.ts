import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ConsultationsService, CHAT_UPLOAD_PREFIX, type Requester } from './consultations.service.js';
import { ConsultationsGateway } from './consultations.gateway.js';
import { verifyRoomTicket } from './room-ticket.js';

class EndConsultationDto {
  /** quick clinical notes from the doctor */
  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Notes can be at most 5000 characters' })
  notes?: string;
}

const ALLOWED_CHAT_FILES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
const MAX_CHAT_FILE_BYTES = 10 * 1024 * 1024;

const chatUploadOptions = {
  storage: diskStorage({
    destination: './uploads/consultation-chat',
    filename: (_req, file, callback) => {
      callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: MAX_CHAT_FILE_BYTES, files: 1 },
  fileFilter: (_req: unknown, file: Express.Multer.File, callback: (e: Error | null, ok: boolean) => void) => {
    if (!ALLOWED_CHAT_FILES.includes(file.mimetype.split(';')[0].trim().toLowerCase())) {
      return callback(new BadRequestException('Only PNG, JPG, WEBP images or PDF files can be shared'), false);
    }
    callback(null, true);
  },
};

/**
 * Online consultation rooms (video and text).
 * The patient is identified like the rest of the patient API (?userId= / x-user-id);
 * the doctor by the doctor login token (Authorization: Bearer <doctor_token>, with ?as=doctor).
 */
@Controller('consultations')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ConsultationsController {
  constructor(
    private readonly consultations: ConsultationsService,
    private readonly gateway: ConsultationsGateway,
  ) {}

  // GET /consultations/:appointmentId/access-check
  @Get(':appointmentId/access-check')
  accessCheck(
    @Param('appointmentId', new ParseUUIDPipe()) appointmentId: string,
    @Query('userId') userId: string | undefined,
    @Query('as') as: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-user-id') userHeader: string | undefined,
  ) {
    return this.consultations.accessCheck(appointmentId, this.requester(authorization, userId ?? userHeader, as));
  }

  // GET /consultations/:appointmentId/messages
  @Get(':appointmentId/messages')
  messages(
    @Param('appointmentId', new ParseUUIDPipe()) appointmentId: string,
    @Query('userId') userId: string | undefined,
    @Query('as') as: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-user-id') userHeader: string | undefined,
  ) {
    return this.consultations.messages(appointmentId, this.requester(authorization, userId ?? userHeader, as));
  }

  // POST /consultations/:appointmentId/attachments  (multipart "file"; header x-room-ticket from access-check)
  @Post(':appointmentId/attachments')
  @UseInterceptors(FileInterceptor('file', chatUploadOptions))
  async upload(
    @Param('appointmentId', new ParseUUIDPipe()) appointmentId: string,
    @Headers('x-room-ticket') ticketHeader: string | undefined,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const ticket = verifyRoomTicket(ticketHeader);
    if (!ticket || ticket.aid !== appointmentId) {
      throw new ForbiddenException('Your access to this consultation room has expired. Please reopen the room.');
    }
    await this.consultations.assertRoomOpen(appointmentId);
    if (!file) throw new BadRequestException('Please choose a file');
    return {
      fileUrl: `${CHAT_UPLOAD_PREFIX}${file.filename}`,
      fileName: file.originalname,
      fileType: file.mimetype,
      size: file.size,
    };
  }

  // POST /consultations/:appointmentId/end  { notes? }  (doctor only)
  @Post(':appointmentId/end')
  async end(
    @Param('appointmentId', new ParseUUIDPipe()) appointmentId: string,
    @Body() dto: EndConsultationDto,
    @Query('as') as: string | undefined,
    @Headers('authorization') authorization: string | undefined,
  ) {
    const result = await this.consultations.endConsultation(appointmentId, this.requester(authorization, undefined, as ?? 'doctor'), dto.notes);
    this.gateway.notifyEnded(appointmentId, result.appointment.doctor.name);
    return result;
  }

  private requester(authorization: string | undefined, userId: string | undefined, as: string | undefined): Requester {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : null;
    return { doctorToken: token, userId: userId?.trim() || null, as: as ?? null };
  }
}
