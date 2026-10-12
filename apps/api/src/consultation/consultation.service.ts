import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { IntakeStatus, PatientType } from '../generated/prisma/enums.js';
import { CreateFamilyMemberDto } from './dto/create-family-member.dto.js';
import { CreateIntakeDto } from './dto/create-intake.dto.js';
import { GetSpecialitiesDto } from './dto/get-specialities.dto.js';

/**
 * Default specialities used to seed an empty `specialities` table.
 * `iconUrl` holds an icon key (not a URL) that the web app maps to an icon;
 * replace it with a real image URL later if needed.
 */
const DEFAULT_SPECIALITIES = [
  { name: 'General Physician', slug: 'general-physician', category: 'General', iconUrl: 'stethoscope', description: 'Fever, cold, cough, infections and everyday health problems' },
  { name: 'Dermatologist', slug: 'dermatologist', category: 'Specialist', iconUrl: 'skin', description: 'Skin, hair and nail problems like acne, rashes and hair fall' },
  { name: 'Gynecologist', slug: 'gynecologist', category: 'Specialist', iconUrl: 'female', description: "Women's health, periods, pregnancy and PCOS" },
  { name: 'Pediatrician', slug: 'pediatrician', category: 'Specialist', iconUrl: 'baby', description: 'Health of infants, children and teenagers' },
  { name: 'Cardiologist', slug: 'cardiologist', category: 'Specialist', iconUrl: 'heart', description: 'Heart health, blood pressure and chest pain' },
  { name: 'ENT Specialist', slug: 'ent-specialist', category: 'Specialist', iconUrl: 'ear', description: 'Ear, nose and throat problems, sinus and tonsils' },
  { name: 'Neurologist', slug: 'neurologist', category: 'Specialist', iconUrl: 'brain', description: 'Headache, migraine, seizures and nerve problems' },
  { name: 'Orthopedic', slug: 'orthopedic', category: 'Surgery', iconUrl: 'bone', description: 'Bone, joint and back pain, fractures and sports injuries' },
  { name: 'Psychiatrist', slug: 'psychiatrist', category: 'Specialist', iconUrl: 'mind', description: 'Stress, anxiety, depression and sleep problems' },
  { name: 'Gastroenterologist', slug: 'gastroenterologist', category: 'Specialist', iconUrl: 'stomach', description: 'Acidity, stomach pain, constipation and liver problems' },
];

@Injectable()
export class ConsultationService {
  private readonly logger = new Logger(ConsultationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Specialities
  // ---------------------------------------------------------------------------

  async getSpecialities(query: GetSpecialitiesDto) {
    await this.ensureDefaultSpecialities();

    const search = query.search?.trim();
    const category = query.category?.trim();

    return this.prisma.speciality.findMany({
      where: {
        isActive: true,
        ...(category && category.toLowerCase() !== 'all'
          ? { category: { equals: category, mode: 'insensitive' } }
          : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  /** Seeds the default specialities once, when the table is completely empty. */
  private async ensureDefaultSpecialities() {
    const count = await this.prisma.speciality.count();
    if (count > 0) return;

    await this.prisma.speciality.createMany({
      data: DEFAULT_SPECIALITIES.map((s) => ({ ...s, isActive: true })),
      skipDuplicates: true,
    });
    this.logger.log(`Seeded ${DEFAULT_SPECIALITIES.length} default specialities`);
  }

  // ---------------------------------------------------------------------------
  // Family members
  // ---------------------------------------------------------------------------

  async getFamilyMembers(userId: string) {
    return this.prisma.familyMember.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createFamilyMember(userId: string, dto: CreateFamilyMemberDto) {
    await this.assertUserExists(userId);

    return this.prisma.familyMember.create({
      data: {
        userId,
        fullName: dto.fullName,
        relation: dto.relation,
        gender: dto.gender,
        age: dto.age,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Intake
  // ---------------------------------------------------------------------------

  async createIntake(userId: string, dto: CreateIntakeDto) {
    await this.assertUserExists(userId);

    // Speciality must exist and be active
    const speciality = await this.prisma.speciality.findFirst({
      where: { id: dto.specialityId, isActive: true },
    });
    if (!speciality) {
      throw new NotFoundException('Selected speciality was not found');
    }

    // Family member must belong to the logged-in user
    let familyMemberId: string | null = null;
    if (dto.patientType === PatientType.FAMILY_MEMBER) {
      const member = await this.prisma.familyMember.findFirst({
        where: { id: dto.familyMemberId, userId },
      });
      if (!member) {
        throw new NotFoundException('Selected family member was not found');
      }
      familyMemberId = member.id;
    }

    const patientAddress = await this.getAddressSnapshot(userId);

    return this.prisma.consultationIntake.create({
      data: {
        userId,
        patientType: dto.patientType,
        familyMemberId,
        specialityId: speciality.id,
        symptoms: dto.symptoms,
        symptomDuration: dto.symptomDuration || null,
        description: dto.description?.trim() || null,
        attachments: dto.attachments ?? [],
        // Prisma Json fields take undefined (not null) to leave the column empty
        patientAddress: patientAddress ?? undefined,
        status: IntakeStatus.DRAFT,
      },
      include: {
        speciality: true,
        familyMember: true,
      },
    });
  }

  async getIntake(userId: string, intakeId: string) {
    const intake = await this.prisma.consultationIntake.findFirst({
      where: { id: intakeId, userId },
      include: { speciality: true, familyMember: true },
    });
    if (!intake) {
      throw new NotFoundException('Consultation intake not found');
    }
    return intake;
  }

  // ---------------------------------------------------------------------------
  // Attachments
  // ---------------------------------------------------------------------------

  buildAttachmentResponse(file: Express.Multer.File) {
    return {
      fileName: file.originalname,
      fileUrl: `/uploads/consultations/${file.filename}`,
      fileType: file.mimetype,
      fileSize: file.size,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Snapshot of the user's default address (or most recent one if none is
   * marked default). Returns null when the user has no saved address.
   */
  private async getAddressSnapshot(userId: string) {
    const address = await this.prisma.address.findFirst({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    if (!address) return null;

    return {
      addressId: address.id,
      label: address.label,
      recipientName: address.recipientName,
      phone: address.phone,
      street: [address.addressLine1, address.addressLine2]
        .filter(Boolean)
        .join(', '),
      area: address.area,
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      country: address.country,
      latitude: address.latitude,
      longitude: address.longitude,
    };
  }

  private async assertUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException('User not found. Please log in again.');
    }
  }
}
