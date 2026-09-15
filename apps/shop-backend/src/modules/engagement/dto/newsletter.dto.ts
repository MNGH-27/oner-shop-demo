import { IsEmail, MaxLength } from 'class-validator';

export class NewsletterDto {
  @IsEmail()
  @MaxLength(254)
  email: string;
}
