import { ICoronaStats } from './../scrappers/interface';
import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../database';

export class Stat extends Model {
  public id!: number;
  public province!: string;
  public confirmed!: number;
  public inpatient!: number;
  public discharged!: number;
  public fatality!: number;
  public quarantine!: number;
  public basedAt!: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static async getLatestStatsByProvincesWithCorrections() {
    const stats = await sequelize.query(`
      WITH stat AS (
        (select distinct ON (type, "isLocal", country, province) province, confirmed, fatality, "basedAt", 'cdc' as source FROM corona.cdc_infos WHERE "type" = 'PROVINCE' AND "isLocal" = true AND "country" = '대한민국' ORDER BY type, "isLocal", "country", "province", "basedAt" DESC)
        UNION
        (select distinct ON (province) province, confirmed, fatality, "basedAt", 'province' as source FROM corona.stats ORDER BY "province", "basedAt" DESC)
      )
      SELECT distinct ON (province) province, confirmed, fatality, "basedAt", source FROM stat ORDER BY "province", "confirmed" DESC;
    `);

    return stats[0] as any as {
      province: string;
      confirmed: number;
      fatality: number;
      basedAt: Date;
      source: 'province' | 'cdc';
    }[];
  }

  public static async getYesterdayStatsByProvincesWithCorrections() {
    const stats = await sequelize.query(`
      WITH stat AS (
        (select distinct ON (type, "isLocal", country, province) province, confirmed, fatality, "basedAt", 'cdc' as source FROM corona.cdc_infos WHERE "type" = 'PROVINCE' AND "isLocal" = true AND "country" = '대한민국' AND "basedAt" < CURRENT_DATE ORDER BY type, "isLocal", "country", "province", "basedAt" DESC)
        UNION
        (select distinct ON (province) province, confirmed, fatality, "basedAt", 'province' as source FROM corona.stats WHERE "basedAt" < CURRENT_DATE ORDER BY "province", "basedAt" DESC)
      )
      SELECT distinct ON (province) province, confirmed, fatality, "basedAt", source FROM stat ORDER BY "province", "confirmed" DESC;
    `);

    return stats[0] as any as {
      province: string;
      confirmed: number;
      fatality: number;
      basedAt: Date;
      source: 'province' | 'cdc';
    }[];
  }

  public static async updateStats(province: string, stats: ICoronaStats) {
    if (!stats?.updatedAt?.isValid) {
      return null;
    }

    // province & stats.updatedAt으로 같은 게 없는지 확인
    const { rows, count } = await this.findAndCountAll({
      where: {
        province,
        basedAt: stats.updatedAt.toJSDate(),
      },
      limit: 1,
    });
    if (count > 0) {
      return rows[0];
    }

    const toDBNumber = (num: number) => isNaN(Number(num)) ? -1 : Number(num);
    const stat = await Stat.create({
      province,
      confirmed: toDBNumber(stats.확진자),
      inpatient: toDBNumber(stats.입원환자),
      discharged: toDBNumber(stats.퇴원자),
      fatality: toDBNumber(stats.사망자),
      quarantine: toDBNumber(stats.자가격리),
      basedAt: stats.updatedAt.toJSDate(),
    });
    return stat;
  }

  public static async getDistinctProvinces() {
    const results: any[] = await this.aggregate('province', 'DISTINCT', { plain: false });

    return results?.map(({ DISTINCT }) => DISTINCT) as string[];
  }
}

Stat.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  province: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  confirmed: {
    type: DataTypes.INTEGER,
  },
  inpatient: {
    type: DataTypes.INTEGER,
  },
  discharged: {
    type: DataTypes.INTEGER,
  },
  fatality: {
    type: DataTypes.INTEGER,
  },
  quarantine: {
    type: DataTypes.INTEGER,
  },
  basedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  sequelize,
  tableName: 'stats',
  indexes: [
    {
      fields: ['province'],
    },
    {
      fields: ['basedAt'],
    },
  ],
});
