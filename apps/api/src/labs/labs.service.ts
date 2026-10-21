import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterLabDto } from './dto/register-lab.dto.js';

export interface LabUploadFiles {
  logo?: Express.Multer.File[];
  licenseDoc?: Express.Multer.File[];
}

type FileKind = 'png' | 'jpg' | 'pdf';

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LICENSE_MAX_BYTES = 10 * 1024 * 1024;

/** Public URL prefix and folder (served by main.ts: app.useStaticAssets('uploads', { prefix: '/uploads/' })) */
const UPLOAD_ROOT = join(process.cwd(), 'uploads');
const LOGO_DIR = 'labs/logos';
const LICENSE_DIR = 'labs/licenses';

const CONFLICT_MESSAGE = 'Laboratory with this email or license number already registered.';

/** Real file type from the first bytes (the browser-supplied MIME type can be wrong or spoofed) */
export function sniffFileKind(buffer: Buffer | undefined): FileKind | null {
  if (!buffer || buffer.length < 4) return null;
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  return null;
}

@Injectable()
export class LabsService {
  private readonly logger = new Logger(LabsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registerLaboratory(dto: RegisterLabDto, files: LabUploadFiles = {}) {
    // 1. Files and branch rules (before touching the database or the disk)
    const logo = files.logo?.[0];
    const licenseDoc = files.licenseDoc?.[0];
    const logoKind = logo ? this.checkFile(logo, ['png', 'jpg'], LOGO_MAX_BYTES, 'Lab logo') : null;
    if (!licenseDoc) throw new BadRequestException('Healthcare license document is required (PNG, JPG or PDF).');
    const licenseKind = this.checkFile(licenseDoc, ['png', 'jpg', 'pdf'], LICENSE_MAX_BYTES, 'License document');
    const branches = this.normaliseBranches(dto);

    // 2. Unique email & license number
    const existing = await this.prisma.laboratory.findFirst({
      where: {
        OR: [
          { email: { equals: dto.email, mode: 'insensitive' } },
          { licenseNumber: { equals: dto.licenseNumber, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    if (existing) throw new ConflictException(CONFLICT_MESSAGE);

    // 3. Store the files, then create the lab and all branches in one nested write
    //    (Prisma runs a nested create as a single transaction)
    const written: string[] = [];
    try {
      const logoUrl = logo ? await this.saveFile(logo, logoKind!, LOGO_DIR, written) : null;
      const licenseDocUrl = await this.saveFile(licenseDoc, licenseKind, LICENSE_DIR, written);

      return await this.prisma.laboratory.create({
        data: {
          name: dto.name,
          email: dto.email,
          whatsappNumber: dto.whatsappNumber,
          licenseNumber: dto.licenseNumber,
          regulatoryBody: dto.regulatoryBody,
          logoUrl,
          licenseDocUrl,
          verificationStatus: 'PENDING',
          isVerified: false,
          branches: { create: branches },
        },
        include: { branches: { orderBy: [{ isMainCenter: 'desc' }, { createdAt: 'asc' }] } },
      });
    } catch (err) {
      // Nothing was saved: remove the files written for this request
      await Promise.all(written.map((p) => unlink(p).catch(() => undefined)));
      // Another request registered the same email / license in the meantime
      if ((err as { code?: string })?.code === 'P2002') throw new ConflictException(CONFLICT_MESSAGE);
      if (!(err instanceof BadRequestException)) this.logger.error(`Lab registration failed: ${(err as Error)?.message}`);
      throw err;
    }
  }

  /** Checks type (by content) and size; returns the detected kind */
  private checkFile(file: Express.Multer.File, allowed: FileKind[], maxBytes: number, label: string): FileKind {
    const kind = sniffFileKind(file.buffer);
    const allowedText = allowed.map((k) => k.toUpperCase()).join(', ').replace(/, ([^,]*)$/, ' or $1');
    if (!kind || !allowed.includes(kind)) throw new BadRequestException(`${label} must be a ${allowedText} file.`);
    if (file.size > maxBytes) throw new BadRequestException(`${label} must be ${Math.round(maxBytes / 1024 / 1024)} MB or smaller.`);
    return kind;
  }

  /**
   * - Exactly one main center: the first branch marked isMainCenter, otherwise the first branch.
   * - Branch names must be unique within the lab.
   * - A map pin needs both latitude and longitude.
   */
  private normaliseBranches(dto: RegisterLabDto) {
    const seen = new Map<string, number>();
    dto.branches.forEach((b, i) => {
      const key = b.name.toLowerCase();
      if (seen.has(key)) {
        throw new BadRequestException(`Branch ${i + 1} has the same name as branch ${seen.get(key)! + 1} ("${b.name}"). Use a different name.`);
      }
      seen.set(key, i);
      if ((b.latitude == null) !== (b.longitude == null)) {
        throw new BadRequestException(`Branch ${i + 1}: provide both latitude and longitude, or neither.`);
      }
    });
    const flagged = dto.branches.findIndex((b) => b.isMainCenter === true);
    const mainIndex = flagged >= 0 ? flagged : 0;
    return dto.branches.map((b, i) => ({
      name: b.name,
      isMainCenter: i === mainIndex,
      medicalDirectorName: b.medicalDirectorName,
      medicalCouncilLicenseNo: b.medicalCouncilLicenseNo,
      address: b.address,
      latitude: b.latitude ?? null,
      longitude: b.longitude ?? null,
    }));
  }

  /** Writes the file under uploads/<dir> with a random name; returns its public URL */
  private async saveFile(file: Express.Multer.File, kind: FileKind, dir: string, written: string[]) {
    const folder = join(UPLOAD_ROOT, dir);
    await mkdir(folder, { recursive: true });
    const fileName = `${Date.now()}-${randomUUID()}.${kind}`;
    const fullPath = join(folder, fileName);
    await writeFile(fullPath, file.buffer);
    written.push(fullPath);
    return `/uploads/${dir}/${fileName}`;
  }
}
