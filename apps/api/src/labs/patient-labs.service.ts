import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { brandText, cleanTests } from '../lab-tests/lab-catalog.js';
import { LabsForTestQueryDto } from './dto/patient-labs.dto.js';
import { distanceKm, loadOfferLabs, masterPrice, offerOf } from './lab-offers.js';

const round1 = (n: number) => Math.round(n * 10) / 10;

@Injectable()
export class PatientLabsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /patient/labs-for-test: approved labs that offer this test / package,
   * with their price, home sample collection and nearest branch.
   * With the patient's location, nearest labs come first; otherwise cheapest first.
   */
  async labsForTest(q: LabsForTestQueryDto) {
    const hasLat = q.userLat != null;
    const hasLng = q.userLng != null;
    if (hasLat !== hasLng) throw new BadRequestException('Send both userLat and userLng, or neither.');
    const here = hasLat && hasLng ? { lat: q.userLat!, lng: q.userLng! } : null;

    const item = await this.prisma.labPackage.findUnique({
      where: { id: q.labPackageId },
      select: { id: true, title: true, itemType: true, basePrice: true, discountPrice: true, isActive: true, testsIncluded: true, totalTestsCount: true },
    });
    if (!item || !item.isActive) throw new NotFoundException('This test or package is no longer available.');
    const subTests = new Set(item.itemType === 'PACKAGE' ? cleanTests(item.testsIncluded ?? []) : []);

    const labs = await loadOfferLabs(this.prisma, [item.id]);
    const data = labs
      .map((lab) => {
        const offer = offerOf(lab, item);
        if (!offer) return null;
        const branches = lab.branches
          .map((b) => ({
            id: b.id,
            name: b.name,
            address: b.address,
            phone: b.phone,
            isMainCenter: b.isMainCenter,
            latitude: b.latitude,
            longitude: b.longitude,
            distanceKm: here && b.latitude != null && b.longitude != null ? round1(distanceKm(here.lat, here.lng, b.latitude, b.longitude)) : null,
          }))
          .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || Number(b.isMainCenter) - Number(a.isMainCenter));
        const nearest = branches[0];
        return {
          laboratoryId: lab.id,
          labName: lab.name,
          logoUrl: lab.logoUrl,
          offeredPrice: offer.offeredPrice,
          originalPrice: offer.originalPrice,
          discountPercent: offer.discountPercent,
          hasHomeSample: lab.hasHomeSample,
          homeSampleFee: lab.hasHomeSample ? Math.round(lab.homeSampleFee ?? 0) : null,
          /** package tests this lab does not perform */
          unavailableTests: offer.disabledSubTests.filter((t) => subTests.has(t)),
          nearestBranch: { id: nearest.id, name: nearest.name, address: nearest.address, distanceKm: nearest.distanceKm },
          branches,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) =>
        here
          ? (a.nearestBranch.distanceKm ?? Infinity) - (b.nearestBranch.distanceKm ?? Infinity) || a.offeredPrice - b.offeredPrice
          : a.offeredPrice - b.offeredPrice || a.labName.localeCompare(b.labName),
      );

    return {
      success: true,
      item: {
        id: item.id,
        title: brandText(item.title) ?? item.title,
        itemType: item.itemType === 'INDIVIDUAL_TEST' ? 'INDIVIDUAL_TEST' : 'PACKAGE',
        totalTestsCount: item.totalTestsCount,
        masterPrice: masterPrice(item),
      },
      sortedBy: here ? 'distance' : 'price',
      data,
    };
  }
}
