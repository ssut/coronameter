import { IsInt, IsString } from 'class-validator';

export class ExchangeMessage {
  @IsString()
  public k!: string;

  @IsString()
  public s!: string;
}
