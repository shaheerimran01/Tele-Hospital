export class CreateAccountDto {
  phone: string;
  firstName: string;
  lastName: string;
  email?: string;
  healthcareProfessional?: boolean;
}
