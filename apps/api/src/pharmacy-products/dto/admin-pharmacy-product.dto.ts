/** Query params for the admin "Pharmacy Products" review list. */
export class AdminPharmacyProductQueryDto {
  /** all | unique | similar */
  type?: string;

  /** Restrict the list to a single pharmacy. */
  pharmacyId?: string;

  /** Free text match on the uploaded product name / SKU. */
  search?: string;

  limit?: string | number;
  offset?: string | number;
}

/** Body for the "Push to Global Catalog" admin action. */
export class SyncToCatalogDto {
  /** PharmacyProduct ids selected by the admin. */
  productIds: string[];

  /** Create a new Product even when a similar catalog item already exists. */
  forceCreateNew?: boolean;
}

/** Body for the admin "adopt into an existing catalog item" action. */
export class AdoptOfferDto {
  /** PharmacyProduct id (one uploaded offer). */
  pharmacyProductId: string;
}

/** Body for the admin "publish this uploaded offer" action. */
export class PublishOfferDto extends AdoptOfferDto {
  /** Create a new Product even when the catalog already holds the same normalized name. */
  forceCreateNew?: boolean;
}

/** Body for the admin publish / unpublish toggle of a catalog item. */
export class SetPublicationDto {
  isActive: boolean;
}