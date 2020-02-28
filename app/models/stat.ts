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
