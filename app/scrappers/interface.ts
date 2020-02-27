import { DateTime } from 'luxon';

export interface ICoronaStats {
  확진자: number;
  입원환자: number;
  퇴원자: number;
  사망자: number;

  updatedAt: DateTime;
}
