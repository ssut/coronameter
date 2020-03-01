import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../database';
import { ICoronaStats } from '../scrappers/interface';

export class CDCStat extends Model {
  public id!: number;
  public province!: string;
  public confirmed!: number;
  public inpatient!: number;
  public discharged!: number;
  public fatality!: number;
  public quarantine!: number;
  public testing!: number;
  public negative!: number;
  public basedAt!: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

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
    const stat = await this.create({
      province,
      confirmed: toDBNumber(stats.확진자),
      inpatient: toDBNumber(stats.입원환자),
      discharged: toDBNumber(stats.퇴원자),
      fatality: toDBNumber(stats.사망자),
      testing: toDBNumber(stats.검사중),
      negative: toDBNumber(stats.음성),
      basedAt: stats.updatedAt.toJSDate(),
    });
    return stat;
  }
}

CDCStat.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  province: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  confirmed: { type: DataTypes.INTEGER },
  inpatient: { type: DataTypes.INTEGER },
  discharged: { type: DataTypes.INTEGER },
  fatality: { type: DataTypes.INTEGER },
  quarantine: { type: DataTypes.INTEGER },
  testing: { type: DataTypes.INTEGER },
  negative: { type: DataTypes.INTEGER },
  basedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  sequelize,
  tableName: 'cdc_stats',
  indexes: [
    { fields: ['province'] },
    { fields: ['basedAt'] },
  ],
});
