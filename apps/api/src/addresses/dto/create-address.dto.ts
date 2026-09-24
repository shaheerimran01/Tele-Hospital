export class CreateAddressDto {
  label: string;
  recipientName: string;
  phone: string;

  addressLine1: string;
  addressLine2?: string;
  area?: string;
  city: string;
  province?: string;
  postalCode?: string;
  country: string;

  latitude?: number;
  longitude?: number;

  isDefault?: boolean;
}