import { ServerMessageType } from './server-message-type.enum';

export interface Message {
  ts: number;
  type: ServerMessageType;
  data: any;
}
