import { IsEnum, IsString, IsUUID } from 'class-validator';
import { Lang } from './lang.enum';

export class HelloMessage {
  @IsString()
  public hello!: string;

  @IsUUID('4')
  public clientId!: string;

  @IsUUID('4')
  public sessionId!: string;

  @IsEnum(Lang)
  public lang!: Lang;

  @IsString()
  public fingerprint!: string;
}
