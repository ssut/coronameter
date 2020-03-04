import { Model, DataTypes, Op, literal } from 'sequelize';
import { sequelize } from '../database';
import { ICoronaStats } from '../scrappers/interface';
import scrapCDC from '../scrappers/cdc';

type PromiseReturnType<T> = T extends () => Promise<infer U> ? U : T;

export enum CDCInfoType {
  Summary = 'SUMMARY',
  Province = 'PROVINCE',
}

export class CDCInfo extends Model {
  public id!: number;
  public type!: CDCInfoType;
  public isLocal!: boolean;
  public country!: string;
  public province!: string;
  public confirmed!: number;
  public fatality!: number;
  public discharged!: number;
  public testing!: number;
  public dailyTesting!: number;
  public basedAt!: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static getSummary(country: string, before?: Date) {
    return this.findOne({
      where: {
        type: CDCInfoType.Summary,
        isLocal: country === '대한민국',
        country,
        ...(
          before
            ? { basedAt: { [Op.lt]: before } }
            : {}
        ),
      },
      order: literal('"basedAt" DESC'),
      limit: 1,
    });
  }

  public static getOverseasSummaries(before?: Date) {
    return this.findAll({
      where: {
        type: CDCInfoType.Summary,
        isLocal: false,
        country: { [Op.ne]: '*' },
        province: null,
        ...(
          before
            ? { basedAt: { [Op.lt]: before } }
            : {}
        ),
      },
      order: literal('"basedAt" DESC'),
    });
  }

  public static getOverseasTotal(before?: Date) {
    return this.findOne({
      where: {
        type: CDCInfoType.Summary,
        isLocal: false,
        country: '*',
        province: null,
        ...(
          before
            ? { basedAt: { [Op.lt]: before } }
            : {}
        ),
      },
      order: literal('"basedAt" DESC'),
      limit: 1,
    });
  }

  private static async checkExists(record: Partial<CDCInfo>) {
    const count = await this.count({
      where: {
        isLocal: record.isLocal,
        country: record.country,
        province: record.province,
        basedAt: record.basedAt,
      },
    });

    return count > 0;
  }

  public static async tryUpdate(data: PromiseReturnType<typeof scrapCDC>) {
    const {
      summaries,
      korea,
    } = data;

    const promises = [] as Promise<Partial<CDCInfo>>[];

    // 이거 먼저
    for (const [province, data] of Object.entries(korea)) {
      const record = {
        type: CDCInfoType.Province,
        isLocal: true,
        country: '대한민국',
        province,
        confirmed: data.확진자,
        fatality: data.사망자,
        testing: data.검사중,
        dailyTesting: data.일일검사건수,
        basedAt: data.updatedAt.toJSDate(),
      };

      promises.push((async () => {
        if (!(await this.checkExists(record))) {
          return record;
        }

        return null;
      })());
    }

    const { korea: koreaSummary, overseas: overseasSummary } = summaries;

    // 다음 이것들
    const koreaSummaryRecord = {
      type: CDCInfoType.Summary,
      isLocal: true,
      country: '대한민국',
      province: '*',
      confirmed: koreaSummary.summary.확진환자,
      fatality: koreaSummary.summary.사망자,
      testing: koreaSummary.summary.검사진행,
      discharged: koreaSummary.summary['확진환자 격리해제'],
      basedAt: koreaSummary.updatedAt.toJSDate(),
    } as Partial<CDCInfo>;
    promises.push((async () => {
      if (!(await this.checkExists(koreaSummaryRecord))) {
        return koreaSummaryRecord;
      }

      return null;
    })());

    const overseasTotalRecord = {
      type: CDCInfoType.Summary,
      isLocal: false,
      country: '*',
      province: null,
      confirmed: overseasSummary.total.확진환자,
      fatality: overseasSummary.total.사망자,
      basedAt: overseasSummary.updatedAt.toJSDate(),
    } as Partial<CDCInfo>;
    promises.push((async () => {
      if (!(await this.checkExists(overseasTotalRecord))) {
        return overseasTotalRecord;
      }

      return null;
    })());

    for (const [country, data] of Object.entries(overseasSummary.summary)) {
      const record = {
        type: CDCInfoType.Summary,
        isLocal: false,
        country,
        province: null,
        confirmed: data.confirmed,
        fatality: data.deaths,
        basedAt: overseasSummary.updatedAt.toJSDate(),
      } as Partial<CDCInfo>;

      promises.push((async () => {
        if (!(await this.checkExists(record))) {
          return record;
        }

        return null;
      })());
    }

    const all = await Promise.all(promises);
    const items = all.filter(x => x !== null);

    await this.bulkCreate(items);
  }
}

CDCInfo.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  type: {
    type: DataTypes.ENUM(...Object.values(CDCInfoType)),
  },
  isLocal: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  province: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  confirmed: { type: DataTypes.INTEGER },
  fatality: { type: DataTypes.INTEGER },
  discharged: { type: DataTypes.INTEGER },
  testing: { type: DataTypes.INTEGER },
  dailyTesting: { type: DataTypes.INTEGER },
  basedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
    sequelize,
    tableName: 'cdc_infos',
    indexes: [
      { fields: ['type', 'isLocal', 'country', 'province', 'basedAt'] },
      { fields: ['confirmed'] },
      { fields: ['basedAt'] },
    ],
});
