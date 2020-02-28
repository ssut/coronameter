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

  public static async getLatestStatsByProvinces() {
    const stats = await sequelize.query(`SELECT * FROM corona.stats
    JOIN (
      SELECT id, province, "basedAt", RANK() over (PARTITION BY "basedAt" ORDER BY "basedAt" DESC) AS "rank" FROM corona.stats
    ) ranked ON ranked.id = stats.id
    WHERE rank = 1;
    `, {
      model: this,
      mapToModel: true,
    });

    return stats;
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
