import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateBranchDto, UpdateLabDocumentsDto, UpdateLabProfileDto } from './dto/lab-portal.dto.js';
import { LICENSE_DIR, LICENSE_MAX_BYTES, LOGO_DIR, LOGO_MAX_BYTES, LabsService, type LabUploadFiles } from './labs.service.js';

const LAB_SELECT = {
  id: true,
  name: true,
  logoUrl: true,
  email: true,
  phone: true,
  whatsappNumber: true,
  licenseNumber: true,
  regulatoryBody: true,
  licenseDocUrl: true,
  verificationStatus: true,
  isVerified: true,
  rejectionReason: true,
  hasHomeSample: true,
  homeSampleFee: true,
  createdAt: true,
  updatedAt: true,
} as const;

const BRANCH_SELECT = {
  id: true,
  name: true,
  isMainCenter: true,
  medicalDirectorName: true,
  medicalCouncilLicenseNo: true,
  address: true,
  latitude: true,
  longitude: true,
  phone: true,
  isActive: true,
} as const;

export type FixTarget = 'documents' | 'branches' | 'profile';

export interface ReviewIssue {
  id: string;
  text: string;
  /** dashboard page where it can be fixed */
  target: FixTarget;
}

/**
 * Admin notes -> one item per line / sentence list, each pointed at the page that fixes it.
 * e.g. "License photo blurred; Medical Director license expired"
 */
export function parseReviewIssues(reason: string | null | undefined): ReviewIssue[] {
  if (!reason?.trim()) return [];
  return reason
    .split(/\r?\n|;|•/)
    .map((t) => t.replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim())
    .filter((t) => t.length > 0)
    .map((text, i) => ({ id: `issue-${i + 1}`, text, target: fixTargetOf(text) }));
}

export function fixTargetOf(text: string): FixTarget {
  if (/branch|director|patholog|pmdc|\bpmc\b|medical council|address|location|map|pin\b|helpline/i.test(text)) return 'branches';
  if (/licen[cs]e|document|blur|photo|scan|certificate|logo|regulat|commission|\bphc\b|\bshc\b/i.test(text)) return 'documents';
  return 'profile';
}

@Injectable()
export class LabPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly labs: LabsService,
  ) {}

  /** The signed-in lab (by its verified phone) */
  private async myLab(phone: string) {
    const lab = await this.prisma.laboratory.findUnique({ where: { phone }, select: LAB_SELECT });
    if (!lab) throw new NotFoundException('No laboratory is registered with this phone number yet.');
    return lab;
  }

  /** Credential changes on a verified lab send it back for review */
  private reReview(lab: { verificationStatus: string }) {
    return lab.verificationStatus === 'APPROVED' ? { verificationStatus: 'PENDING' as const, isVerified: false } : {};
  }

  /** GET /labs/me/overview */
  async overview(phone: string) {
    const lab = await this.myLab(phone);
    const [branches, customPriced, unavailableItems] = await Promise.all([
      this.prisma.labBranch.findMany({ where: { laboratoryId: lab.id }, select: BRANCH_SELECT, orderBy: [{ isMainCenter: 'desc' }, { createdAt: 'asc' }] }),
      this.prisma.labPackagePrice.count({ where: { laboratoryId: lab.id, customBasePrice: { not: null } } }),
      this.prisma.labPackagePrice.count({ where: { laboratoryId: lab.id, isAvailable: false } }),
    ]);
    return {
      laboratory: lab,
      branches,
      stats: {
        branches: branches.length,
        activeBranches: branches.filter((b) => b.isActive).length,
        customPriced,
        unavailableItems,
        // Patient lab bookings are not in the system yet
        bookings: { tracked: false, revenue: 0, completed: 0, pending: 0 },
      },
      issues: lab.verificationStatus === 'REJECTED' || lab.rejectionReason ? parseReviewIssues(lab.rejectionReason) : [],
      canResubmit: lab.verificationStatus === 'REJECTED' || Boolean(lab.rejectionReason?.trim()),
    };
  }

  /** PATCH /labs/me/profile (the primary phone cannot change) */
  async updateProfile(phone: string, dto: UpdateLabProfileDto) {
    const lab = await this.myLab(phone);
    if (dto.email && dto.email !== lab.email) {
      const taken = await this.prisma.laboratory.findFirst({
        where: { email: { equals: dto.email, mode: 'insensitive' }, NOT: { id: lab.id } },
        select: { id: true },
      });
      if (taken) throw new ConflictException('Another laboratory already uses this email address.');
    }
    if (dto.homeSampleFee !== undefined && dto.hasHomeSample === false) dto.homeSampleFee = 0;
    return this.prisma.laboratory.update({
      where: { id: lab.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.whatsappNumber !== undefined && { whatsappNumber: dto.whatsappNumber }),
        ...(dto.hasHomeSample !== undefined && { hasHomeSample: dto.hasHomeSample }),
        ...(dto.homeSampleFee !== undefined && { homeSampleFee: Math.round(dto.homeSampleFee) }),
      },
      select: LAB_SELECT,
    });
  }

  /** POST /labs/me/documents (multipart: licenseDoc?, logo?, licenseNumber?, regulatoryBody?) */
  async updateDocuments(phone: string, dto: UpdateLabDocumentsDto, files: LabUploadFiles = {}) {
    const lab = await this.myLab(phone);
    const logo = files.logo?.[0];
    const licenseDoc = files.licenseDoc?.[0];
    const licenseChanged = dto.licenseNumber !== undefined && dto.licenseNumber !== lab.licenseNumber;
    const bodyChanged = dto.regulatoryBody !== undefined && dto.regulatoryBody !== lab.regulatoryBody;
    if (!logo && !licenseDoc && !licenseChanged && !bodyChanged) throw new BadRequestException('Nothing to update. Upload a file or change a detail.');

    const logoKind = logo ? this.labs.checkFile(logo, ['png', 'jpg'], LOGO_MAX_BYTES, 'Lab logo') : null;
    const licenseKind = licenseDoc ? this.labs.checkFile(licenseDoc, ['png', 'jpg', 'pdf'], LICENSE_MAX_BYTES, 'License document') : null;
    if (licenseChanged) {
      const taken = await this.prisma.laboratory.findFirst({
        where: { licenseNumber: { equals: dto.licenseNumber!, mode: 'insensitive' }, NOT: { id: lab.id } },
        select: { id: true },
      });
      if (taken) throw new ConflictException('Another laboratory is already registered with this license number.');
    }

    const written: string[] = [];
    try {
      const logoUrl = logo ? await this.labs.saveFile(logo, logoKind!, LOGO_DIR, written) : undefined;
      const licenseDocUrl = licenseDoc ? await this.labs.saveFile(licenseDoc, licenseKind!, LICENSE_DIR, written) : undefined;
      const credentials = Boolean(licenseDoc) || licenseChanged || bodyChanged;
      return await this.prisma.laboratory.update({
        where: { id: lab.id },
        data: {
          ...(logoUrl && { logoUrl }),
          ...(licenseDocUrl && { licenseDocUrl }),
          ...(licenseChanged && { licenseNumber: dto.licenseNumber }),
          ...(bodyChanged && { regulatoryBody: dto.regulatoryBody }),
          ...(credentials ? this.reReview(lab) : {}),
        },
        select: LAB_SELECT,
      });
    } catch (err) {
      await Promise.all(written.map((p) => unlink(p).catch(() => undefined)));
      if ((err as { code?: string })?.code === 'P2002') throw new ConflictException('Another laboratory is already registered with this license number.');
      throw err;
    }
  }

  /** PATCH /labs/me/branches/:branchId */
  async updateBranch(phone: string, branchId: string, dto: UpdateBranchDto) {
    const lab = await this.myLab(phone);
    const branch = await this.prisma.labBranch.findFirst({ where: { id: branchId, laboratoryId: lab.id }, select: BRANCH_SELECT });
    if (!branch) throw new NotFoundException('Branch not found.');
    if (dto.name && dto.name.toLowerCase() !== branch.name.toLowerCase()) {
      const same = await this.prisma.labBranch.findFirst({
        where: { laboratoryId: lab.id, name: { equals: dto.name, mode: 'insensitive' }, NOT: { id: branch.id } },
        select: { id: true },
      });
      if (same) throw new BadRequestException('Another branch already has this name.');
    }
    const credentials =
      (dto.medicalDirectorName !== undefined && dto.medicalDirectorName !== branch.medicalDirectorName) ||
      (dto.medicalCouncilLicenseNo !== undefined && dto.medicalCouncilLicenseNo !== branch.medicalCouncilLicenseNo);

    const updated = await this.prisma.labBranch.update({
      where: { id: branch.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.medicalDirectorName !== undefined && { medicalDirectorName: dto.medicalDirectorName }),
        ...(dto.medicalCouncilLicenseNo !== undefined && { medicalCouncilLicenseNo: dto.medicalCouncilLicenseNo }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
      },
      select: BRANCH_SELECT,
    });
    if (credentials && lab.verificationStatus === 'APPROVED') {
      await this.prisma.laboratory.update({ where: { id: lab.id }, data: this.reReview(lab) });
    }
    return { branch: updated, sentForReview: credentials && lab.verificationStatus === 'APPROVED' };
  }

  /** POST /labs/me/resubmit: after fixing the admin's notes, back to PENDING review */
  async resubmit(phone: string) {
    const lab = await this.myLab(phone);
    if (lab.verificationStatus !== 'REJECTED' && !lab.rejectionReason?.trim()) {
      throw new BadRequestException('There is nothing to resubmit. Your lab is not waiting for corrections.');
    }
    return this.prisma.laboratory.update({
      where: { id: lab.id },
      data: { verificationStatus: 'PENDING', isVerified: false, rejectionReason: null },
      select: LAB_SELECT,
    });
  }
}
