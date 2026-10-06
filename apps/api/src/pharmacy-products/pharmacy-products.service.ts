import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Readable } from 'stream';
import csvParser from 'csv-parser';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePharmacyProductDto } from './dto/create-pharmacy-product.dto.js';
import { UpdatePharmacyProductDto } from './dto/update-pharmacy-product.dto.js';
import {
  AdminPharmacyProductQueryDto,
  SyncToCatalogDto,
} from './dto/admin-pharmacy-product.dto.js';

/** CSV row with normalized (lowercase, alphanumeric only) column keys. */
type CsvRow = Record<string, string>;

/** Catalog details a seller uploaded, before any admin approval. */
type DraftDetails = {
  name: string;
  slug?: string;
  genericName: string | null;
  brandName: string | null;
  category: string | null;
  subCategory: string | null;
  description: string | null;
  imageUrl: string | null;
};

/** Catalog shape handed to both portals - draft values until an admin syncs the offer. */
export type CatalogDetailsView = {
  id: string | null;
  name: string;
  slug: string;
  genericName: string | null;
  brandName: string | null;
  category: string | null;
  subCategory: string | null;
  systemOfMedicine: string | null;
  description: string | null;
  uses: string | null;
  benefits: string | null;
  sideEffects: string | null;
  howToUse: string | null;
  storage: string | null;
  imageUrl: string | null;
  dosageForm: string | null;
  strength: string | null;
  packSize: string | null;
  manufacturer: string | null;
  healthConditions: string[];
  ingredients: string[];
  tags: string[];
  prescriptionRequired: boolean;
  isFeatured: boolean;
  price: number | null;
  originalPrice: number | null;
};

/** PharmacyProduct joined with its (optional) catalog product and matched product. */
type PharmacyProductRow = {
  id: string;
  pharmacyId: string;
  productId: string | null;
  sku: string | null;
  price: unknown;
  mrp: unknown;
  stock: number;
  discount: number | null;
  isAvailable: boolean;
  approvalStatus: string;
  createdAt: Date;
  updatedAt: Date;
  draftName: string | null;
  draftSlug: string | null;
  draftGenericName: string | null;
  draftBrandName: string | null;
  draftCategory: string | null;
  draftSubCategory: string | null;
  draftDescription: string | null;
  draftImageUrl: string | null;
  product?: CatalogDetailsView | null;
  matchedProduct?: { id: string; name: string; slug: string } | null;
};

export type PharmacyProductView = {
  id: string;
  pharmacyId: string;
  productId: string | null;
  sku: string | null;
  price: number;
  mrp: number | null;
  stock: number;
  discount: number | null;
  isAvailable: boolean;
  approvalStatus: string;
  matchedProductName: string | null;
  createdAt: Date;
  updatedAt: Date;
  product: CatalogDetailsView;
};

export type AdminPharmacyProductView = PharmacyProductView & {
  pharmacyName: string;
  /** UNIQUE = representative of its normalized-key cluster, SIMILAR = duplicate in the cluster. */
  matchStatus: 'UNIQUE' | 'SIMILAR';
  /** Brand + core name + volume, used to cluster the same product across uploads. */
  normalizedKey: string;
  groupSize: number;
  isRepresentative: boolean;
  duplicateOf: { id: string; name: string; pharmacyName: string } | null;
  matchedProduct: { id: string; name: string; slug: string } | null;
  /** Global catalog product this offer already matches (independent of the cluster). */
  catalogMatch: { id: string; name: string; slug: string; exact: boolean } | null;
};

// Flexible header aliases: keys are matched after normalization
// (lowercase + alphanumeric only), so "Product Name", "product_name" and "PRODUCTNAME" all match.
const CSV_HEADERS = {
  name: ['productname', 'name', 'product', 'itemname', 'medicinename', 'drugname', 'title'],
  slug: ['slug', 'productslug', 'urlslug'],
  generic: ['genericname', 'generic', 'salt', 'formula', 'molecule'],
  brand: ['brand', 'brandname', 'manufacturer', 'marketer', 'company', 'companyname'],
  category: ['category', 'productcategory', 'type'],
  subCategory: ['subcategory', 'subcat', 'subtype'],
  description: ['description', 'details', 'about'],
  imageUrl: ['imageurl', 'image', 'photo', 'picture'],
  price: ['price', 'sellingprice', 'saleprice', 'rate', 'ourprice', 'offerprice', 'discountprice'],
  mrp: ['mrp', 'originalprice', 'listprice', 'retailprice', 'regularprice'],
  stock: ['stock', 'stockqty', 'quantity', 'qty', 'inventory', 'units', 'availablequantity'],
  sku: ['sku', 'barcode', 'itemcode', 'code', 'itemid'],
  isAvailable: ['isavailable', 'available', 'isactive', 'active', 'instock', 'status'],
} as const;

const TRUE_TOKENS = new Set([
  'true',
  't',
  'yes',
  'y',
  '1',
  'active',
  'available',
  'enabled',
  'on',
  'instock',
  'in stock',
]);

const FALSE_TOKENS = new Set([
  'false',
  'f',
  'no',
  'n',
  '0',
  'inactive',
  'unavailable',
  'disabled',
  'off',
  'outofstock',
  'out of stock',
  'delisted',
  'discontinued',
]);

const EMPTY_TOKENS = new Set(['n/a', 'na', 'null', 'nil', 'none', 'undefined', '-', '--']);

/**
 * Dosage form words are dropped while normalizing a product name: the same medicine is
 * listed as "Calpol 120ml" by one pharmacy and "Calpol Syrup 5mg/120ml" by another.
 */
const DOSAGE_FORM_WORDS = new Set([
  'tablet',
  'tablets',
  'tab',
  'capsule',
  'capsules',
  'cap',
  'caps',
  'pill',
  'pills',
  'tabletstrip',
  'strip',
  'strips',
  'syrup',
  'syrups',
  'suspension',
  'suspensions',
  'sYR',
  'elixir',
  'syr',
  'drop',
  'drops',
  'ointment',
  'cream',
  'creams',
  'gel',
  'lotion',
  'lotions',
  'oil',
  'powder',
  'sachet',
  'sachets',
  'spray',
  'inhaler',
  'injection',
  'vial',
  'ampoule',
  'ampule',
  'solution',
  'tonic',
  'soap',
  'shampoo',
  'mask',
  'serum',
  'sunscreen',
]);

/** Marketing/boilerplate words that never identify a product. */
const FILLER_WORDS = new Set([
  'with',
  'and',
  'for',
  'of',
  'the',
  'a',
  'an',
  'free',
  'plus',
  'new',
  'best',
  'original',
  'premium',
  'xl',
  'sp',
  'pack',
  'packed',
  'size',
  'box',
  'medicine',
  'med',
  'medicines',
  'generic',
  'brand',
  'company',
  'pharmacy',
  'product',
  'products',
]);

/** Offers inspected per admin query before the unique/similar grouping is applied. */
const ADMIN_SCAN_LIMIT = 5000;
const CSV_INSERT_CHUNK = 200;

/** Catalog entries the admin review flow matches uploads against. */
type CatalogEntry = { id: string; name: string; slug: string };

/** Size units that describe a bottle/tube rather than a single dose. */
const VOLUME_SUFFIXES = new Set(['ml', 'g']);
const MAX_SYNC_IDS = 500;

@Injectable()
export class PharmacyProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------
  // PARSING HELPERS
  // -------------------------------------------------------------

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /** Column key normalization so headers match regardless of case/spacing/underscores/BOM. */
  private normalizeColumnKey(key: string): string {
    return key.replace(/^\uFEFF/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private normalizeCsvRow(row: Record<string, unknown>): CsvRow {
    const normalized: CsvRow = {};

    for (const [key, value] of Object.entries(row)) {
      const columnKey = this.normalizeColumnKey(key);
      if (!columnKey) continue;

      const text = value === null || value === undefined ? '' : String(value).trim();
      const current = normalized[columnKey];
      if (current === undefined || (current === '' && text !== '')) {
        normalized[columnKey] = text;
      }
    }

    return normalized;
  }

  /** First non-empty, non-placeholder value found for the given column aliases. */
  private pickColumn(row: CsvRow, columns: readonly string[]): string | undefined {
    for (const column of columns) {
      const raw = row[column];
      if (raw === undefined) continue;

      const value = raw.trim();
      if (!value) continue;
      if (EMPTY_TOKENS.has(value.toLowerCase())) continue;

      return value;
    }

    return undefined;
  }

  /** Accepts numbers and messy strings such as "Rs. 35.00" / "PKR 1,250.00". */
  private parseNumber(raw?: number | string | null): number | undefined {
    if (raw === null || raw === undefined) return undefined;
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : undefined;
    if (typeof raw === 'boolean') return undefined;

    const text = String(raw).trim();
    if (!text) return undefined;

    // First real number in the cell - ignores currency labels and thousand separators.
    const match = text.match(/-?\d[\d,]*(?:\.\d+)?/);
    if (!match) return undefined;

    const parsed = Number.parseFloat(match[0].replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private parseBoolean(raw?: boolean | string | null): boolean | undefined {
    if (raw === null || raw === undefined) return undefined;
    if (typeof raw === 'boolean') return raw;

    const value = String(raw).trim().toLowerCase();
    if (TRUE_TOKENS.has(value)) return true;
    if (FALSE_TOKENS.has(value)) return false;

    return undefined;
  }

  /** Trimmed text, or undefined when the column is blank (blank means "leave unchanged"). */
  private parseText(raw?: string | null): string | undefined {
    if (raw === null || raw === undefined) return undefined;

    const value = String(raw).trim();
    if (!value) return undefined;
    if (EMPTY_TOKENS.has(value.toLowerCase())) return undefined;

    return value;
  }

  private toMoney(value: number): number {
    return Number(value.toFixed(2));
  }

  /** Prisma returns Decimal objects which serialize as strings - normalize to numbers. */
  private toMoneyNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;

    const parsed = typeof value === 'number' ? value : Number(value.toString());
    return Number.isFinite(parsed) ? parsed : null;
  }

  private nameKey(name?: string | null): string {
    return (name ?? '').trim().toLowerCase();
  }

  /**
   * Strict key used to cluster the same product across CSV uploads and pharmacies.
   *
   * "Calpol 120ml" and "Calpol Syrup 5mg/120ml" both resolve to "calpol-120ml":
   * lowercase, punctuation/whitespace collapsed, dosage-form and marketing words dropped,
   * pack counts dropped ("10 tablets"), sizes canonicalized (120 ml -> 120ml, 1l -> 1000ml),
   * and the remaining tokens sorted so word order does not matter.
   *
   * Strength stays in the key on purpose: "Ossopan 800mg" is not "Ossopan 200mg". When a
   * volume is present the per-dose strengths are dropped instead, so "Calpol Syrup
   * 5mg/120ml" and "Calpol 120ml" still land on "calpol-120ml" while a syrup keeps its pack
   * identity. Spellings that omit the unit ("Dolo 650" vs "Dolo 650mg Tablet") are
   * reconciled by getLooseProductKey.
   *
   * The result is the value grouped by in the admin review list, which is why
   * `COUNT(DISTINCT normalizedKey)` stays stable when the same CSV is re-uploaded.
   */
  getNormalizedProductKey(name: string): string {
    return this.buildProductKey(name, true);
  }

  /**
   * Same key with the size units removed so "Dolo 650" and "Dolo 650mg Tablet" agree. Only
   * used as a matching fallback, and only when the loose key is unique in the catalog.
   */
  getLooseProductKey(name: string): string {
    return this.buildProductKey(name, false);
  }

  private buildProductKey(name: string, keepUnit: boolean): string {
    // "120 ml" / "5 mg" -> "120ml" / "5mg" before tokenizing.
    const compact = this.nameKey(name).replace(
      /(\d+(?:\.\d+)?)\s*(ml|gm|mcg|mg|ug|ui|iu|g|l)\b/g,
      '$1$2',
    );

    const tokens = compact
      .split(/[^a-z0-9.]+/)
      .map((token) => token.replace(/\.+$/, ''))
      .filter(Boolean);

    const words: string[] = [];
    const sizes: Array<{ value: number; suffix: string }> = [];

    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];

      // Pack counts describe the strip, not the medicine ("10 tablets" -> nothing).
      if (/^\d+(?:\.\d+)?$/.test(token) && DOSAGE_FORM_WORDS.has(tokens[index + 1] ?? '')) {
        index += 1;
        continue;
      }

      const size = token.match(/^(\d+(?:\.\d+)?)(ml|l|g|gm|mg|mcg|ug|ui|iu|%)?$/);
      if (size) {
        const amount = Number.parseFloat(size[1]);
        const unit = size[2] ?? '';
        const isLitre = unit === 'l';
        const suffix = isLitre
          ? 'ml'
          : unit === 'gm'
            ? 'g'
            : unit === 'ug'
              ? 'mcg'
              : unit === 'ui'
                ? 'iu'
                : unit;

        sizes.push({
          value: Number((isLitre ? amount * 1000 : amount).toFixed(3)),
          suffix,
        });
        continue;
      }

      if (DOSAGE_FORM_WORDS.has(token) || FILLER_WORDS.has(token)) continue;

      words.push(token);
    }

    // In "Calpol Syrup 5mg/120ml" the volume identifies the pack and the 5mg only describes
    // one dose, so the strengths are dropped whenever a volume is present.
    const hasVolume = sizes.some((size) => VOLUME_SUFFIXES.has(size.suffix));
    const keptSizes = hasVolume
      ? sizes.filter((size) => VOLUME_SUFFIXES.has(size.suffix))
      : sizes;

    if (words.length === 0 && keptSizes.length === 0) return this.slugify(this.nameKey(name));

    const sizeTokens = keptSizes
      .map((size) => `${size.value}${keepUnit ? size.suffix : ''}`)
      .sort();

    // Brand/core words first, sizes last: "calpol-120ml", independent of word order.
    return [...words.sort(), ...sizeTokens].join('-');
  }

  // -------------------------------------------------------------
  // VIEW MAPPING
  // -------------------------------------------------------------

  /** Draft columns shared by CSV imports and the seller "Add Product" form. */
  private draftColumns(draft: DraftDetails) {
    return {
      draftName: draft.name,
      draftSlug: draft.slug ? this.slugify(draft.slug) : this.slugify(draft.name),
      draftGenericName: draft.genericName,
      draftBrandName: draft.brandName,
      draftCategory: draft.category,
      draftSubCategory: draft.subCategory,
      draftDescription: draft.description,
      draftImageUrl: draft.imageUrl,
    };
  }

  private draftFromDto(data: CreatePharmacyProductDto | UpdatePharmacyProductDto): DraftDetails {
    const name = this.parseText(data.name) ?? '';

    return {
      name,
      slug: this.parseText(data.slug),
      genericName: this.parseText(data.genericName) ?? null,
      brandName: this.parseText(data.brandName) ?? null,
      category: this.parseText(data.category) ?? null,
      subCategory: this.parseText(data.subCategory) ?? null,
      description: this.parseText(data.description) ?? null,
      imageUrl: this.parseText(data.imageUrl) ?? null,
    };
  }

  /** Catalog details of an offer: the synced Product, or the uploaded draft while pending. */
  private buildCatalogView(
    row: PharmacyProductRow,
    price: number,
    mrp: number | null,
  ): CatalogDetailsView {
    if (row.product) return row.product;

    return {
      id: null,
      name: row.draftName || 'Unnamed Medicine',
      slug: row.draftSlug || '',
      genericName: row.draftGenericName,
      brandName: row.draftBrandName,
      category: row.draftCategory,
      subCategory: row.draftSubCategory,
      systemOfMedicine: null,
      description: row.draftDescription,
      uses: null,
      benefits: null,
      sideEffects: null,
      howToUse: null,
      storage: null,
      imageUrl: row.draftImageUrl,
      dosageForm: null,
      strength: null,
      packSize: null,
      manufacturer: row.draftBrandName,
      healthConditions: [],
      ingredients: [],
      tags: [],
      prescriptionRequired: false,
      isFeatured: false,
      price,
      originalPrice: mrp,
    };
  }

  private buildPharmacyProductView(row: PharmacyProductRow): PharmacyProductView {
    const price = this.toMoneyNumber(row.price) ?? 0;
    const mrp = this.toMoneyNumber(row.mrp);

    return {
      id: row.id,
      pharmacyId: row.pharmacyId,
      productId: row.productId,
      sku: row.sku,
      price,
      mrp,
      stock: row.stock,
      discount: row.discount,
      isAvailable: row.isAvailable,
      approvalStatus: row.approvalStatus,
      matchedProductName: row.matchedProduct?.name ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      product: this.buildCatalogView(row, price, mrp),
    };
  }

/** Global catalog lookups for a batch of uploaded names (admin review only). */
private async loadCatalogByName(names: Array<string | null | undefined>) {
    const wanted = [...new Set(names.map((name) => this.nameKey(name)).filter(Boolean))];
    if (wanted.length === 0) return new Map<string, CatalogEntry>();

    const products = await this.prisma.product.findMany({
      where: { name: { in: wanted, mode: 'insensitive' } },
      select: { id: true, name: true, slug: true },
    });

    return new Map(products.map((product) => [this.nameKey(product.name), product]));
  }

  /**
   * Whole catalog indexed by normalized key, so an upload can be matched against catalog
   * items even when the wording differs ("Calpol 120ml" vs "Calpol Syrup 5mg/120ml").
   */
  private async loadCatalogByNormalizedKey() {
    const products = await this.prisma.product.findMany({
      select: { id: true, name: true, slug: true },
    });

    const byKey = new Map<string, CatalogEntry>();
    for (const product of products) {
      const key = this.getNormalizedProductKey(product.name);
      if (key && !byKey.has(key)) byKey.set(key, product);
    }

    return byKey;
  }

  /**
   * Catalog indexed by the loose key (size units dropped) so "Dolo 650" can still reach
   * "Dolo 650mg Tablet". A loose key shared by more than one catalog item is stored as null,
   * so an ambiguous spelling is never linked to the wrong medicine.
   */
  private async loadCatalogByLooseKey() {
    const products = await this.prisma.product.findMany({
      select: { id: true, name: true, slug: true },
    });

    const byKey = new Map<string, CatalogEntry | null>();
    for (const product of products) {
      const key = this.getLooseProductKey(product.name);
      if (!key) continue;

      const existing = byKey.get(key);
      if (existing === undefined) byKey.set(key, product);
      else if (existing && existing.id !== product.id) byKey.set(key, null);
    }

    return byKey;
  }

  /**
   * Exact name, then strict key, then an unambiguous loose key. The last step is what keeps
   * "Dolo 650" from creating a second catalog item, without letting a strength-less name
   * pick the wrong strength.
   */
  private resolveCatalogMatch(
    name: string,
    catalogByName: Map<string, CatalogEntry>,
    catalogByKey: Map<string, CatalogEntry> | null,
    catalogByLooseKey: Map<string, CatalogEntry | null> | null = null,
  ) {
    const exact = catalogByName.get(this.nameKey(name));
    if (exact) return { product: exact, exact: true, matchedBy: 'name' as const };

    if (catalogByKey) {
      const strict = catalogByKey.get(this.getNormalizedProductKey(name));
      if (strict) return { product: strict, exact: false, matchedBy: 'key' as const };
    }

    const loose = catalogByLooseKey?.get(this.getLooseProductKey(name)) ?? null;
    return loose ? { product: loose, exact: false, matchedBy: 'loose' as const } : null;
  }

  private async assertPharmacyExists(pharmacyId: string) {
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { id: true, name: true },
    });

    if (!pharmacy) {
      throw new NotFoundException(`Pharmacy with ID ${pharmacyId} not found.`);
    }

    return pharmacy;
  }

  // -------------------------------------------------------------
  // SELLER SIDE
  // -------------------------------------------------------------

  // GET All Offers for a Pharmacy
  async getProductsByPharmacy(pharmacyId: string) {
    const pharmacy = await this.assertPharmacyExists(pharmacyId);

    const rows = await this.prisma.pharmacyProduct.findMany({
      where: { pharmacyId },
      include: {
        product: true,
        matchedProduct: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const products = rows.map((row) => this.buildPharmacyProductView(row));

    return {
      success: true,
      pharmacyId,
      pharmacyName: pharmacy.name,
      totalCount: products.length,
      pendingCount: products.filter((item) => item.approvalStatus === 'PENDING').length,
      products,
    };
  }

  // CREATE a single offer (portal "Add Product") - stays a draft until admin approval
  async createPharmacyProduct(pharmacyId: string, data: CreatePharmacyProductDto) {
    await this.assertPharmacyExists(pharmacyId);

    const name = this.parseText(data.name);
    if (!name) {
      throw new BadRequestException('Product name is required.');
    }

    const price = this.parseNumber(data.price);
    if (price === undefined || price < 0) {
      throw new BadRequestException('A valid non-negative price is required.');
    }

    const stock = this.parseNumber(data.stock);
    const mrp = this.parseNumber(data.mrp ?? data.originalPrice) ?? price;
    const sku = this.parseText(data.sku);

    const created = await this.prisma.pharmacyProduct.create({
      data: {
        pharmacy: { connect: { id: pharmacyId } },
        price: this.toMoney(price),
        mrp: this.toMoney(mrp),
        stock: stock === undefined ? 0 : Math.max(0, Math.trunc(stock)),
        isAvailable:
          this.parseBoolean(data.isActive ?? data.isAvailable) ??
          (stock === undefined ? true : stock > 0),
        approvalStatus: 'PENDING',
        ...(sku ? { sku } : {}),
        ...this.draftColumns({ ...this.draftFromDto(data), name }),
      },
      include: {
        product: true,
        matchedProduct: { select: { id: true, name: true, slug: true } },
      },
    });

    return {
      success: true,
      message: 'Product added and sent for admin approval.',
      product: this.buildPharmacyProductView(created),
    };
  }

  // UPDATE an offer - drafts are edited in place, synced offers also update the catalog
  async updatePharmacyProduct(
    pharmacyId: string,
    pharmacyProductId: string,
    data: UpdatePharmacyProductDto,
  ) {
    const existing = await this.prisma.pharmacyProduct.findFirst({
      where: { id: pharmacyProductId, pharmacyId },
      include: {
        product: true,
        matchedProduct: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException('Product record not found for this pharmacy.');
    }

    const patch: Prisma.PharmacyProductUpdateWithoutProductInput = {};

    const price = this.parseNumber(data.price);
    if (price !== undefined) {
      if (price < 0) throw new BadRequestException('Price cannot be negative.');
      patch.price = this.toMoney(price);
    }

    const mrp = this.parseNumber(data.mrp ?? data.originalPrice);
    if (mrp !== undefined) patch.mrp = mrp === null ? null : this.toMoney(mrp);

    const discount = this.parseNumber(data.discount);
    if (discount !== undefined) patch.discount = discount ?? null;

    const stock = this.parseNumber(data.stock);
    if (stock !== undefined) patch.stock = Math.max(0, Math.trunc(stock));

    const sku = this.parseText(data.sku);
    if (sku) patch.sku = sku;

    const isAvailable = this.parseBoolean(data.isActive ?? data.isAvailable);
    if (isAvailable !== undefined) patch.isAvailable = isAvailable;

    // Uploaded draft columns
    const name = this.parseText(data.name);
    if (name) {
      patch.draftName = name;
      patch.draftSlug = this.slugify(name);
    }

    const slug = this.parseText(data.slug);
    if (slug) patch.draftSlug = this.slugify(slug);

    const draftTextFields = [
      ['genericName', 'draftGenericName'],
      ['brandName', 'draftBrandName'],
      ['category', 'draftCategory'],
      ['subCategory', 'draftSubCategory'],
      ['description', 'draftDescription'],
      ['imageUrl', 'draftImageUrl'],
    ] as const;

    for (const [field, column] of draftTextFields) {
      const value = this.parseText(data[field]);
      if (value !== undefined) patch[column] = value;
    }

    // Catalog record - only touched once an admin has synced this offer
    const catalogPatch: Prisma.ProductUpdateWithoutPharmacyProductsInput = {};
    if (name) {
      catalogPatch.name = name;
      catalogPatch.slug = this.slugify(name);
    }
    if (slug) catalogPatch.slug = this.slugify(slug);

    for (const [field] of draftTextFields) {
      const value = this.parseText(data[field]);
      if (value !== undefined) catalogPatch[field] = value;
    }

    const hasCatalogPatch = Object.keys(catalogPatch).length > 0;

    const updated = await this.prisma.pharmacyProduct.update({
      where: { id: pharmacyProductId },
      data: {
        ...patch,
        ...(hasCatalogPatch && existing.productId ? { product: { update: catalogPatch } } : {}),
      },
      include: {
        product: true,
        matchedProduct: { select: { id: true, name: true, slug: true } },
      },
    });

    return {
      success: true,
      message: 'Product updated successfully.',
      updatedProduct: this.buildPharmacyProductView(updated),
    };
  }

  // DELETE Product
  async deletePharmacyProduct(pharmacyId: string, pharmacyProductId: string) {
    const existing = await this.prisma.pharmacyProduct.findFirst({
      where: { id: pharmacyProductId, pharmacyId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Product not found for deletion.');
    }

    await this.prisma.pharmacyProduct.delete({
      where: { id: pharmacyProductId },
    });

    return {
      success: true,
      message: 'Product removed from pharmacy inventory.',
    };
  }

  /**
   * CSV upload: every row lands straight in PharmacyProduct as a pending draft.
   * The global Product table is never read or written here - that only happens when an
   * admin explicitly pushes an offer through syncToGlobalProductCatalog().
   */
  async processProductsCsv(pharmacyId: string, fileBuffer: Buffer) {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException('Valid CSV file is required.');
    }

    await this.assertPharmacyExists(pharmacyId);

    const rows: Record<string, unknown>[] = [];
    const stream = Readable.from(fileBuffer);

    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on('data', (data: Record<string, unknown>) => rows.push(data))
        .on('end', () => resolve())
        .on('error', (err: Error) =>
          reject(new BadRequestException(`CSV Error: ${err.message}`)),
        );
    });

    const payloads: Prisma.PharmacyProductCreateManyInput[] = [];
    const skipped: Array<{ row: number; reason: string }> = [];

    for (const [index, rawRow] of rows.entries()) {
      const row = this.normalizeCsvRow(rawRow);
      const rowNumber = index + 2; // +1 for zero index, +1 for the header line

      if (!Object.values(row).some((value) => value !== '')) continue; // blank line

      const productName = this.parseText(this.pickColumn(row, CSV_HEADERS.name));
      if (!productName) {
        skipped.push({ row: rowNumber, reason: 'Missing product name' });
        continue;
      }

      // "price" falls back to mrp/rate so price-only CSVs still import.
      const price = this.parseNumber(this.pickColumn(row, CSV_HEADERS.price));
      const mrp = this.parseNumber(this.pickColumn(row, CSV_HEADERS.mrp));
      const effectivePrice = price ?? mrp;

      // price is the only hard requirement left - the table has no other NOT NULL column.
      if (effectivePrice === undefined || effectivePrice < 0) {
        skipped.push({ row: rowNumber, reason: 'Missing or invalid price' });
        continue;
      }

      const stock = this.parseNumber(this.pickColumn(row, CSV_HEADERS.stock));
      const isAvailable = this.parseBoolean(this.pickColumn(row, CSV_HEADERS.isAvailable));
      const sku = this.parseText(this.pickColumn(row, CSV_HEADERS.sku));

      payloads.push({
        pharmacyId,
        price: this.toMoney(effectivePrice),
        mrp: this.toMoney(mrp ?? effectivePrice),
        stock: stock === undefined ? 0 : Math.max(0, Math.trunc(stock)),
        isAvailable: isAvailable ?? (stock === undefined ? true : stock > 0),
        approvalStatus: 'PENDING',
        ...(sku ? { sku } : {}),
        ...this.draftColumns({
          name: productName,
          slug: this.parseText(this.pickColumn(row, CSV_HEADERS.slug)),
          genericName: this.parseText(this.pickColumn(row, CSV_HEADERS.generic)) ?? null,
          brandName: this.parseText(this.pickColumn(row, CSV_HEADERS.brand)) ?? null,
          category: this.parseText(this.pickColumn(row, CSV_HEADERS.category)) ?? null,
          subCategory: this.parseText(this.pickColumn(row, CSV_HEADERS.subCategory)) ?? null,
          description: this.parseText(this.pickColumn(row, CSV_HEADERS.description)) ?? null,
          imageUrl: this.parseText(this.pickColumn(row, CSV_HEADERS.imageUrl)) ?? null,
        }),
      });
    }

    let importedCount = 0;
    for (let index = 0; index < payloads.length; index += CSV_INSERT_CHUNK) {
      const chunk = payloads.slice(index, index + CSV_INSERT_CHUNK);
      const result = await this.prisma.pharmacyProduct.createMany({ data: chunk });
      importedCount += result.count;
    }

    return {
      success: true,
      message: `${importedCount} products imported and sent for admin approval.`,
      stats: {
        totalRows: rows.length,
        importedCount,
        skippedCount: skipped.length,
        skipped: skipped.slice(0, 20),
      },
    };
  }

  // -------------------------------------------------------------
  // ADMIN SIDE
  // -------------------------------------------------------------

  /**
   * Admin review list.
   *
   * Every offer is clustered by getNormalizedProductKey(), so the same medicine listed with
   * different wording (or re-uploaded by the same/different pharmacy) lands in one cluster:
   * - UNIQUE  -> one representative row per distinct normalizedKey (COUNT(DISTINCT key)),
   *   which is why re-uploading the same CSV cannot inflate the unique count;
   * - SIMILAR -> the remaining rows of a cluster (duplicates across uploads/pharmacies);
   * - catalogMatch / approvalStatus report whether the offer is already in the global
   *   Product catalog, independently of the cluster it belongs to.
   */
  async getAdminPharmacyProducts(query: AdminPharmacyProductQueryDto) {
    const type = (query?.type ?? 'all').toLowerCase();
    const search = this.parseText(query?.search);
    const limit = Math.min(Math.max(Number(query?.limit) || 50, 1), 200);
    const offset = Math.max(Number(query?.offset) || 0, 0);

    const where: Prisma.PharmacyProductWhereInput = {};
    if (query?.pharmacyId) where.pharmacyId = query.pharmacyId;
    if (search) {
      where.OR = [
        { draftName: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.pharmacyProduct.findMany({
      where,
      include: {
        pharmacy: { select: { id: true, name: true } },
        product: true,
        matchedProduct: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: ADMIN_SCAN_LIMIT,
    });

    const catalogByName = await this.loadCatalogByName(
      rows.map((row) => row.draftName ?? row.product?.name),
    );

    // Normalized catalog index is only needed when some name has no exact match.
    const hasUnresolved = rows.some(
      (row) =>
        !row.productId &&
        row.draftName &&
        !catalogByName.has(this.nameKey(row.draftName)),
    );
    const catalogByKey = hasUnresolved ? await this.loadCatalogByNormalizedKey() : null;
    const catalogByLooseKey = hasUnresolved ? await this.loadCatalogByLooseKey() : null;

    type GroupedRow = {
      view: AdminPharmacyProductView;
      normalizedKey: string;
      isRepresentative: boolean;
      groupSize: number;
    };

    // 1. One entry per offer, tagged with its normalized key.
    const entries = rows.map((row) => {
      const name = row.draftName ?? row.product?.name ?? '';
      const catalogMatch = row.productId
        ? null
        : this.resolveCatalogMatch(name, catalogByName, catalogByKey, catalogByLooseKey);

      const normalizedKey = this.getNormalizedProductKey(name);

      const view: AdminPharmacyProductView = {
        ...this.buildPharmacyProductView({
          ...row,
          matchedProduct: catalogMatch?.product ?? row.matchedProduct ?? null,
        }),
        pharmacyName: row.pharmacy.name,
        matchStatus: 'UNIQUE',
        normalizedKey,
        groupSize: 1,
        isRepresentative: true,
        duplicateOf: null,
        matchedProduct: catalogMatch?.product ?? row.matchedProduct ?? null,
        catalogMatch: catalogMatch
          ? { ...catalogMatch.product, exact: catalogMatch.exact }
          : null,
      };

      return { row, view, normalizedKey, looseKey: this.getLooseProductKey(name) };
    });

    // 2. Cluster by normalized key, then fold together keys that only differ in size units
    //    so "Dolo 650" and "Dolo 650mg Tablet" stay one product.
    const clustersByLooseKey = new Map<string, Map<string, typeof entries>>();
    for (const entry of entries) {
      // A name with no usable tokens must not collapse every nameless row into one cluster.
      const key = entry.normalizedKey || `pharmacy-product:${entry.view.id}`;
      const looseKey = entry.looseKey || key;

      let byKey = clustersByLooseKey.get(looseKey);
      if (!byKey) {
        byKey = new Map<string, typeof entries>();
        clustersByLooseKey.set(looseKey, byKey);
      }

      const bucket = byKey.get(key);
      if (bucket) bucket.push(entry);
      else byKey.set(key, [entry]);
    }

    const clusters = new Map<string, typeof entries>();
    for (const byKey of clustersByLooseKey.values()) {
      for (const [key, members] of byKey) {
        // A folded cluster is listed under the key of its own spelling.
        if (!clusters.has(key)) clusters.set(key, [...members]);
        else clusters.get(key)?.push(...members);
      }
    }

    // 3. Representative per cluster: catalog linked first, then the oldest upload.
    const classified: GroupedRow[] = [];

    for (const [key, members] of clusters) {
      const ordered = [...members].sort((a, b) => {
        const approvedDiff =
          Number(Boolean(b.row.productId)) - Number(Boolean(a.row.productId));
        if (approvedDiff !== 0) return approvedDiff;

        const createdDiff = a.row.createdAt.getTime() - b.row.createdAt.getTime();
        if (createdDiff !== 0) return createdDiff;

        return a.row.id.localeCompare(b.row.id);
      });

      const representative = ordered[0];

      for (const member of ordered) {
        const isRepresentative = member === representative;

        member.view.normalizedKey = key;
        member.view.groupSize = ordered.length;
        member.view.isRepresentative = isRepresentative;
        member.view.matchStatus = isRepresentative ? 'UNIQUE' : 'SIMILAR';
        member.view.duplicateOf = isRepresentative
          ? null
          : {
              id: representative.view.id,
              name: representative.view.product.name,
              pharmacyName: representative.view.pharmacyName,
            };

        classified.push({
          view: member.view,
          normalizedKey: key,
          isRepresentative,
          groupSize: ordered.length,
        });
      }
    }

    // Newest uploads first.
    classified.sort(
      (a, b) =>
        new Date(b.view.createdAt).getTime() - new Date(a.view.createdAt).getTime(),
    );

    const uniqueCountByCluster = clusters.size;

    // "Similar" = the upload already exists in the global catalog (matched by name or key).
    // "Unique"  = the representative of a cluster that is not in the catalog at all.
    const isMatchedProduct = (item: GroupedRow) =>
      Boolean(item.view.productId) || Boolean(item.view.catalogMatch);

    const matchedItems = classified.filter(isMatchedProduct);
    const uniqueItems = classified.filter(
      (item) => item.view.matchStatus === 'UNIQUE' && !isMatchedProduct(item),
    );

    const counts = {
      all: classified.length,
      unique: uniqueItems.length,
      similar: matchedItems.length,
      synced: entries.filter((entry) => entry.row.productId).length,
      pending: entries.filter((entry) => entry.row.approvalStatus === 'PENDING').length,
      local: entries.filter((entry) => !entry.row.productId).length,
      linked: entries.filter((entry) => Boolean(entry.row.productId)).length,
    };

    const filtered =
      type === 'unique'
        ? uniqueItems
        : type === 'similar'
          ? matchedItems
          : type === 'local'
            ? classified.filter((item) => !item.view.productId)
            : type === 'linked'
              ? classified.filter((item) => Boolean(item.view.productId))
              : classified;

    return {
      success: true,
      filters: {
        type,
        pharmacyId: query?.pharmacyId ?? null,
        search: search ?? null,
      },
      totalCount: filtered.length,
      counts,
      products: filtered.slice(offset, offset + limit).map((item) => item.view),
      limit,
      offset,
    };
  }

  /** slugify(name) + timestamp/random suffix, verified against the catalog unique index. */
  private async buildUniqueSlug(base: string): Promise<string> {
    const root = this.slugify(base) || 'product';

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = `${root}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const clash = await this.prisma.product.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });

      if (!clash) return candidate;
    }

    return `${root}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }

  private buildCatalogCreate(row: {
    draftName: string | null;
    draftGenericName: string | null;
    draftBrandName: string | null;
    draftCategory: string | null;
    draftSubCategory: string | null;
    draftDescription: string | null;
    draftImageUrl: string | null;
    price: number;
    mrp: number | null;
    slug: string;
  }): Prisma.ProductCreateWithoutPharmacyProductsInput {
    return {
      name: row.draftName || 'Unnamed Medicine',
      slug: row.slug,
      genericName: row.draftGenericName,
      brandName: row.draftBrandName,
      category: row.draftCategory,
      subCategory: row.draftSubCategory,
      description: row.draftDescription,
      imageUrl: row.draftImageUrl,
      manufacturer: row.draftBrandName,
      price: row.price,
      originalPrice: row.mrp,
      // Lands in the catalog as UNPUBLISHED: only the admin's publish click in the global
      // catalog screen puts it live.
      isActive: false,
      healthConditions: [],
      ingredients: [],
      tags: [],
    };
  }

  /**
   * Admin action: push the chosen PharmacyProduct offers into the global Product catalog.
   * - similar offer -> attaches to the matching existing Product (merging into the pharmacy's
   *   existing offer when one is already linked)
   * - unique offer  -> creates a new Product record
   */
  async syncToGlobalProductCatalog(body: SyncToCatalogDto) {
    const ids = [...new Set((body?.productIds ?? []).filter(Boolean))];

    if (ids.length === 0) {
      throw new BadRequestException('At least one pharmacy product must be selected.');
    }
    if (ids.length > MAX_SYNC_IDS) {
      throw new BadRequestException(`At most ${MAX_SYNC_IDS} products can be synced at once.`);
    }

    const rows = await this.prisma.pharmacyProduct.findMany({
      where: { id: { in: ids } },
      include: {
        pharmacy: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, slug: true } },
        matchedProduct: { select: { id: true, name: true, slug: true } },
      },
    });

    const catalogByName = await this.loadCatalogByName(rows.map((row) => row.draftName));
    const needsNormalizedMatch = !body.forceCreateNew &&
      rows.some(
        (row) =>
          !row.productId &&
          !row.matchedProduct &&
          !catalogByName.has(this.nameKey(row.draftName)),
      );
    const catalogByKey = needsNormalizedMatch ? await this.loadCatalogByNormalizedKey() : null;
    const catalogByLooseKey = needsNormalizedMatch ? await this.loadCatalogByLooseKey() : null;

    const synced: string[] = [];
    const skipped: Array<{ id: string; reason: string }> = [];
    const errors: Array<{ id: string; reason: string }> = [];

    for (const row of rows) {
      if (row.approvalStatus === 'APPROVED' && row.productId) {
        skipped.push({ id: row.id, reason: 'Already synced to the global catalog.' });
        continue;
      }

      const matched = body.forceCreateNew
        ? null
        : (row.matchedProduct ??
          this.resolveCatalogMatch(row.draftName ?? '', catalogByName, catalogByKey, catalogByLooseKey)
            ?.product ??
          null);

      try {
        await this.prisma.$transaction(async (tx) => {
          const targetProductId = row.productId ?? matched?.id ?? null;

          if (targetProductId) {
            // The published catalog is never touched by a push: an offer that matches a live
            // product only links to it. Products created here are unpublished from the start.
            const duplicateOffer = await tx.pharmacyProduct.findFirst({
              where: {
                pharmacyId: row.pharmacyId,
                productId: targetProductId,
                id: { not: row.id },
              },
              select: { id: true },
            });

            if (duplicateOffer) {
              // The pharmacy already sells this product - merge the pricing into that offer.
              await tx.pharmacyProduct.update({
                where: { id: duplicateOffer.id },
                data: {
                  price: row.price,
                  mrp: row.mrp,
                  stock: row.stock,
                  isAvailable: row.isAvailable,
                  approvalStatus: 'APPROVED',
                  matchedProductId: targetProductId,
                  ...(row.sku ? { sku: row.sku } : {}),
                },
              });
              await tx.pharmacyProduct.delete({ where: { id: row.id } });

              return;
            }

            await tx.pharmacyProduct.update({
              where: { id: row.id },
              data: {
                productId: targetProductId,
                matchedProductId: targetProductId,
                approvalStatus: 'APPROVED',
                syncedAt: new Date(),
              },
            });

            return;
          }

          const slug = await this.buildUniqueSlug(row.draftSlug || row.draftName || 'product');

          const createdProduct = await tx.product.create({
            data: this.buildCatalogCreate({
              ...row,
              slug,
              price: this.toMoneyNumber(row.price) ?? 0,
              mrp: this.toMoneyNumber(row.mrp),
            }),
            select: { id: true },
          });

          await tx.pharmacyProduct.update({
            where: { id: row.id },
            data: {
              productId: createdProduct.id,
              approvalStatus: 'APPROVED',
              syncedAt: new Date(),
            },
          });
        });

        synced.push(row.id);
      } catch (error) {
        errors.push({
          id: row.id,
          reason: error instanceof Error ? error.message : 'Unknown database error',
        });
      }
    }

    return {
      success: errors.length === 0,
      message: `${synced.length} product(s) synced to the global catalog.`,
      stats: {
        requested: ids.length,
        syncedCount: synced.length,
        skippedCount: skipped.length,
        errorCount: errors.length,
      },
      synced,
      skipped,
      errors,
    };
  }

  // -------------------------------------------------------------
  // GLOBAL CATALOG - admin publication workflow
  // -------------------------------------------------------------

  /**
   * The published catalog with adoption stats. `unlinkedMatches` are pharmacy uploads that
   * normalize to the same key as the catalog item but were never linked to it, which is
   * exactly what the admin needs to clean up before a launch.
   */
  async getGlobalCatalog(query: {
    search?: string;
    status?: string;
    limit?: string | number;
    offset?: string | number;
  }) {
    const limit = Math.min(Math.max(Number(query?.limit) || 50, 1), 200);
    const offset = Math.max(Number(query?.offset) || 0, 0);
    const search = this.parseText(query?.search);
    const status = (query?.status ?? 'all').toLowerCase();

    const where: Prisma.ProductWhereInput = search
      ? {
          AND: [
            {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { brandName: { contains: search, mode: 'insensitive' } },
                { genericName: { contains: search, mode: 'insensitive' } },
                { slug: { contains: search, mode: 'insensitive' } },
              ],
            },
          ],
        }
      : {};

    if (status === 'published') where.isActive = true;
    else if (status === 'unpublished') where.isActive = false;

    const [totalCount, publishedCount, unpublishedCount, products, unlinkedOffers] =
      await Promise.all([
        this.prisma.product.count({ where }),
        this.prisma.product.count({ where: { isActive: true } }),
        this.prisma.product.count({ where: { isActive: false } }),
        this.prisma.product.findMany({
          where,
          orderBy: [{ isActive: 'asc' }, { updatedAt: 'desc' }],
          skip: offset,
          take: limit,
          select: {
            id: true,
            name: true,
            slug: true,
            brandName: true,
            genericName: true,
            category: true,
            subCategory: true,
            imageUrl: true,
            isActive: true,
            price: true,
            originalPrice: true,
            createdAt: true,
            updatedAt: true,
            pharmacyProducts: {
              select: {
                id: true,
                pharmacyId: true,
                draftName: true,
                stock: true,
                isAvailable: true,
                approvalStatus: true,
                pharmacy: { select: { name: true } },
              },
            },
          },
        }),
        this.prisma.pharmacyProduct.findMany({
          where: { productId: null },
          select: {
            id: true,
            pharmacyId: true,
            draftName: true,
            draftBrandName: true,
            draftCategory: true,
            draftImageUrl: true,
            stock: true,
            price: true,
            mrp: true,
            sku: true,
            isAvailable: true,
            pharmacy: { select: { name: true } },
          },
        }),
      ]);

    const unlinkedByKey = new Map<
      string,
      Array<{
        id: string;
        pharmacyId: string;
        draftName: string | null;
        draftBrandName: string | null;
        draftCategory: string | null;
        draftImageUrl: string | null;
        stock: number;
        price: unknown;
        mrp: unknown;
        sku: string | null;
        isAvailable: boolean;
        pharmacy: { name: string };
      }>
    >();
    for (const offer of unlinkedOffers) {
      const key = this.getNormalizedProductKey(offer.draftName ?? '');
      if (!key) continue;
      const bucket = unlinkedByKey.get(key);
      if (bucket) bucket.push(offer);
      else unlinkedByKey.set(key, [offer]);
    }

    return {
      success: true,
      filters: { search: search ?? null, status },
      totalCount,
      counts: { all: totalCount, published: publishedCount, unpublished: unpublishedCount },
      limit,
      offset,
      products: products.map((product) => {
        const key = this.getNormalizedProductKey(product.name);
        const matches = key ? (unlinkedByKey.get(key) ?? []) : [];
        const pharmacies = new Map(
          product.pharmacyProducts.map((offer) => [offer.pharmacyId, offer.pharmacy.name]),
        );
        const nameVariants = [
          ...new Set(
            product.pharmacyProducts
              .map((offer) => offer.draftName)
              .filter((name): name is string => Boolean(name)),
          ),
        ].filter((name) => this.nameKey(name) !== this.nameKey(product.name));

        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          brandName: product.brandName ?? null,
          genericName: product.genericName ?? null,
          category: product.category ?? null,
          subCategory: product.subCategory ?? null,
          imageUrl: product.imageUrl ?? null,
          isPublished: product.isActive,
          price: this.toMoneyNumber(product.price),
          mrp: this.toMoneyNumber(product.originalPrice),
          normalizedKey: key,
          offerCount: product.pharmacyProducts.length,
          pharmacyCount: pharmacies.size,
          pharmacies: [...pharmacies.values()],
          totalStock: product.pharmacyProducts.reduce((sum, offer) => sum + offer.stock, 0),
          availableOfferCount: product.pharmacyProducts.filter(
            (offer) => offer.isAvailable && offer.stock > 0,
          ).length,
          pendingReviewCount: product.pharmacyProducts.filter(
            (offer) => offer.approvalStatus !== 'APPROVED',
          ).length,
          nameVariants,
          unlinkedMatchCount: matches.length,
          unlinkedMatches: matches.slice(0, 8).map((offer) => ({
            id: offer.id,
            name: offer.draftName,
            pharmacyName: offer.pharmacy.name,
            stock: offer.stock,
            price: this.toMoneyNumber(offer.price),
            mrp: this.toMoneyNumber(offer.mrp),
            brandName: offer.draftBrandName,
            category: offer.draftCategory,
            imageUrl: offer.draftImageUrl,
            sku: offer.sku,
            isAvailable: offer.isAvailable,
          })),
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        };
      }),
    };
  }

  /**
   * Links one uploaded offer to an existing catalog item. When the pharmacy already has an
   * offer for that product the duplicate is merged into it instead of creating a second row.
   */
  async adoptOfferIntoProduct(productId: string, pharmacyProductId: string) {
    const [product, offer] = await Promise.all([
      this.prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, slug: true, isActive: true },
      }),
      this.prisma.pharmacyProduct.findUnique({
        where: { id: pharmacyProductId },
        select: { id: true, pharmacyId: true, draftName: true },
      }),
    ]);

    if (!product) throw new NotFoundException(`Product with ID ${productId} not found.`);
    if (!offer) {
      throw new NotFoundException(`Pharmacy product with ID ${pharmacyProductId} not found.`);
    }

    const result = await this.linkOfferToCatalogProduct({
      pharmacyProductId: offer.id,
      pharmacyId: offer.pharmacyId,
      targetProductId: product.id,
    });

    return {
      success: true,
      message: result.merged
        ? `Merged into the existing offer of ${product.name}.`
        : `"${offer.draftName ?? product.name}" is now linked to ${product.name}.`,
      product: { id: product.id, name: product.name, slug: product.slug },
      ...result,
    };
  }

  /**
   * Publishes a single uploaded offer. Reuses the catalog item with the same normalized key
   * when there is one, otherwise creates the catalog item from the uploaded details.
   */
  async publishOffer(body: { pharmacyProductId?: string; forceCreateNew?: boolean }) {
    const pharmacyProductId = (body?.pharmacyProductId ?? '').trim();
    if (!pharmacyProductId) {
      throw new BadRequestException('A pharmacy product must be selected to publish.');
    }

    const offer = await this.prisma.pharmacyProduct.findUnique({
      where: { id: pharmacyProductId },
      select: {
        id: true,
        pharmacyId: true,
        productId: true,
        draftName: true,
        draftSlug: true,
        draftGenericName: true,
        draftBrandName: true,
        draftCategory: true,
        draftSubCategory: true,
        draftDescription: true,
        draftImageUrl: true,
        price: true,
        mrp: true,
        stock: true,
        isAvailable: true,
        sku: true,
      },
    });

    if (!offer) {
      throw new NotFoundException(`Pharmacy product with ID ${pharmacyProductId} not found.`);
    }

    let targetProductId = offer.productId;
    let created = false;
    let productName = offer.draftName ?? 'Unnamed Medicine';

    if (!targetProductId) {
      const catalogByName = await this.loadCatalogByName([offer.draftName]);
      const catalogByKey = body?.forceCreateNew ? null : await this.loadCatalogByNormalizedKey();
      const catalogByLooseKey = body?.forceCreateNew ? null : await this.loadCatalogByLooseKey();
      const matched = body?.forceCreateNew
        ? null
        : this.resolveCatalogMatch(
            offer.draftName ?? '',
            catalogByName,
            catalogByKey,
            catalogByLooseKey,
          );

      if (matched) {
        targetProductId = matched.product.id;
        productName = matched.product.name;
      }
    }

    const slug = targetProductId
      ? undefined
      : await this.buildUniqueSlug(offer.draftSlug || offer.draftName || 'product');

    const result = await this.prisma.$transaction(async (tx) => {
      if (!targetProductId) {
        const createdProduct = await tx.product.create({
          data: this.buildCatalogCreate({
            draftName: offer.draftName,
            draftGenericName: offer.draftGenericName,
            draftBrandName: offer.draftBrandName,
            draftCategory: offer.draftCategory,
            draftSubCategory: offer.draftSubCategory,
            draftDescription: offer.draftDescription,
            draftImageUrl: offer.draftImageUrl,
            price: this.toMoneyNumber(offer.price) ?? 0,
            mrp: this.toMoneyNumber(offer.mrp),
            slug: slug as string,
          }),
          select: { id: true, name: true, slug: true },
        });

        targetProductId = createdProduct.id;
        productName = createdProduct.name;
        created = true;
      }

      const link = await this.linkOfferToCatalogProduct(
        {
          pharmacyProductId: offer.id,
          pharmacyId: offer.pharmacyId,
          targetProductId: targetProductId as string,
        },
        tx,
      );

      return { ...link, productId: targetProductId as string };
    });

    return {
      success: true,
      created,
      message: created
        ? `${productName} is now part of the global catalog.`
        : `${productName} published.`,
      product: { id: result.productId, name: productName },
      merged: result.merged,
      offerId: result.offerId,
    };
  }

  /**
   * Points an offer at a catalog item. Shared by adopt + publish so both paths merge
   * duplicates the same way. Passing a transaction keeps publish atomic.
   */
  private async linkOfferToCatalogProduct(
    input: { pharmacyProductId: string; pharmacyId: string; targetProductId: string },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    const existingOffer = await client.pharmacyProduct.findFirst({
      where: {
        pharmacyId: input.pharmacyId,
        productId: input.targetProductId,
        id: { not: input.pharmacyProductId },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, price: true, mrp: true, stock: true, sku: true, isAvailable: true },
    });

    const source = await client.pharmacyProduct.findUnique({
      where: { id: input.pharmacyProductId },
      select: { price: true, mrp: true, stock: true, sku: true, isAvailable: true },
    });

    if (existingOffer && source) {
      // The pharmacy already sells this product - keep one offer and take the freshest
      // stock/price snapshot so a re-upload does not inflate inventory.
      await client.pharmacyProduct.update({
        where: { id: existingOffer.id },
        data: {
          price: source.price,
          mrp: source.mrp ?? existingOffer.mrp,
          stock: source.stock,
          isAvailable: source.isAvailable,
          approvalStatus: 'APPROVED',
          matchedProductId: input.targetProductId,
          syncedAt: new Date(),
          ...(source.sku ? { sku: source.sku } : {}),
        },
      });
      await client.pharmacyProduct.delete({ where: { id: input.pharmacyProductId } });

      return { merged: true, offerId: existingOffer.id };
    }

    await client.pharmacyProduct.update({
      where: { id: input.pharmacyProductId },
      data: {
        productId: input.targetProductId,
        matchedProductId: input.targetProductId,
        approvalStatus: 'APPROVED',
        syncedAt: new Date(),
      },
    });

    return { merged: false, offerId: input.pharmacyProductId };
  }

  /** Publishes / unpublishes a catalog item. Unpublishing keeps every offer intact. */
  async setProductPublication(productId: string, isActive: boolean) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true },
    });

    if (!product) throw new NotFoundException(`Product with ID ${productId} not found.`);

    await this.prisma.product.update({ where: { id: productId }, data: { isActive } });

    return {
      success: true,
      message: isActive
        ? `${product.name} is now live in the catalog.`
        : `${product.name} was unpublished. Pharmacy offers were left untouched.`,
      product: { id: product.id, name: product.name, isPublished: isActive },
    };
  }

  /** Removes a catalog item. Linked pharmacy offers are removed by the database cascade. */
  async deleteCatalogProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, _count: { select: { pharmacyProducts: true } } },
    });

    if (!product) throw new NotFoundException(`Product with ID ${productId} not found.`);

    await this.prisma.product.delete({ where: { id: productId } });

    return {
      success: true,
      message: `${product.name} was removed with ${product._count.pharmacyProducts} linked offer(s).`,
      removedOffers: product._count.pharmacyProducts,
    };
  }
}