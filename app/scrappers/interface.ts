import { DateTime } from 'luxon';

export interface ICoronaStats {
  확진자: number;
  입원환자: number;
  퇴원자: number;
  사망자: number;
  자가격리?: number;
  검사중?: number;
  음성?: number;
  일일검사건수?: number;
  전일대비?: number;

  updatedAt: DateTime;
}
