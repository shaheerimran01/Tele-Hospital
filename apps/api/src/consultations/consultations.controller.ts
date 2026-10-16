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
import { ConsultationsService, type Requester } from './consultations.service.js';
import {
  CHAT_UPLOAD_PREFIX,
  MAX_CHAT_FILE_BYTES,
  MAX_VOICE_SECONDS,
  mediaTypeOfUpload,
  storedFileName,
  displayFileName,
} from './chat-media.js';
import { ConsultationsGateway } from './consultations.gateway.js';
import { verifyRoomTicket } from './room-ticket.js';

class EndConsultationDto {
  /** quick clinical notes from the doctor */
  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Notes can be at most 5000 characters' })
  notes?: string;
}

const chatUploadOptions = {
  storage: diskStorage({
    destination: './uploads/consultation-chat',
    filename: (_req, file, callback) => callback(null, storedFileName(file.originalname)),
  }),
  limits: { fileSize: MAX_CHAT_FILE_BYTES, files: 1 },
  fileFilter: (_req: unknown, file: Express.Multer.File, callback: (e: Error | null, ok: boolean) => void) => {
    if (!mediaTypeOfUpload(file.originalname, file.mimetype)) {
      return callback(
        new BadRequestException(
          'This file type is not supported. Send voice notes (WEBM, MP3, M4A, OGG), images (JPG, PNG, WEBP) or documents (PDF, DOC, DOCX).',
        ),
        false,
      );
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

  // POST /consultations/:appointmentId/upload-attachment
  //   multipart: file (voice note, image or document), audioDuration? (seconds, voice notes)
  //   header x-room-ticket: the ticket from access-check
  @Post(':appointmentId/upload-attachment')
  @UseInterceptors(FileInterceptor('file', chatUploadOptions))
  uploadAttachment(
    @Param('appointmentId', new ParseUUIDPipe()) appointmentId: string,
    @Headers('x-room-ticket') ticketHeader: string | undefined,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('audioDuration') audioDuration: string | undefined,
  ) {
    return this.handleUpload(appointmentId, ticketHeader, file, audioDuration);
  }

  // POST /consultations/:appointmentId/attachments  (earlier name, used by the video room's chat drawer)
  @Post(':appointmentId/attachments')
  @UseInterceptors(FileInterceptor('file', chatUploadOptions))
  upload(
    @Param('appointmentId', new ParseUUIDPipe()) appointmentId: string,
    @Headers('x-room-ticket') ticketHeader: string | undefined,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.handleUpload(appointmentId, ticketHeader, file, undefined);
  }

  // GET /consultations/:appointmentId/summary  (after the consultation: notes, transcript, voice notes, files)
  @Get(':appointmentId/summary')
  summary(
    @Param('appointmentId', new ParseUUIDPipe()) appointmentId: string,
    @Query('userId') userId: string | undefined,
    @Query('as') as: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-user-id') userHeader: string | undefined,
  ) {
    return this.consultations.summary(appointmentId, this.requester(authorization, userId ?? userHeader, as));
  }

  private async handleUpload(
    appointmentId: string,
    ticketHeader: string | undefined,
    file: Express.Multer.File | undefined,
    audioDuration: string | undefined,
  ) {
    const ticket = verifyRoomTicket(ticketHeader);
    if (!ticket || ticket.aid !== appointmentId) {
      throw new ForbiddenException('Your access to this consultation room has expired. Please reopen the room.');
    }
    await this.consultations.assertRoomOpen(appointmentId);
    if (!file) throw new BadRequestException('Please choose a file');
    const messageType = mediaTypeOfUpload(file.originalname, file.mimetype)!;
    const fileUrl = `${CHAT_UPLOAD_PREFIX}${file.filename}`;

    let duration: number | undefined;
    if (messageType === 'VOICE') {
      const d = Number(audioDuration);
      if (Number.isFinite(d) && d > 0) duration = Math.min(MAX_VOICE_SECONDS, Math.round(d));
    }
    return {
      fileUrl,
      fileName: displayFileName(fileUrl),
      messageType,
      ...(duration !== undefined ? { audioDuration: duration } : {}),
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

  // POST /consultations/:appointmentId/no-show  (doctor only, after waiting 10 minutes for the patient)
  @Post(':appointmentId/no-show')
  async noShow(
    @Param('appointmentId', new ParseUUIDPipe()) appointmentId: string,
    @Query('as') as: string | undefined,
    @Headers('authorization') authorization: string | undefined,
  ) {
    const waiting = await this.gateway.waitingSnapshot(appointmentId);
    const result = await this.consultations.markNoShow(appointmentId, this.requester(authorization, undefined, as ?? 'doctor'), waiting);
    this.gateway.notifyEnded(appointmentId, result.appointment.doctor.name, 'NO_SHOW');
    return result;
  }

  private requester(authorization: string | undefined, userId: string | undefined, as: string | undefined): Requester {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : null;
    return { doctorToken: token, userId: userId?.trim() || null, as: as ?? null };
  }
}
