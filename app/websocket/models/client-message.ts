import { ClientMessageOperation } from './client-message-operation.enum';
import { IsEnum, IsNumber } from 'class-validator';

export class ClientMessage<T = any> {
  @IsEnum(ClientMessageOperation)
  public op!: ClientMessageOperation;

  @IsNumber()
  public ts!: number;

  public data?: T;
}
