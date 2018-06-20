/*
 * Copyright 2017 The boardgame.io Authors
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */
const LRU = require('lru-cache');
const Sequelize = require('sequelize');

import { SQL } from './sql';

const GameModel = {
  id: {
    type: Sequelize.STRING,
    unique: true,
    primaryKey: true,
  },
  ctx: {
    // can be JSONB for PostgreSQL
    // but I'm not sure if this simple usage would benefit
    type: Sequelize.JSON,
  },
};

export class MySQL extends SQL {
  /**
   * Creates a new SQL connector object.
   */
  constructor({ url, config, cacheSize }) {
    super();
    if (cacheSize === undefined) cacheSize = 1000;
    if (url) this.db = new Sequelize(url);
    else if (config) {
      const { database, username, password, host, port, pool } = config;
      this.db = new Sequelize(database, username, password, {
        host,
        port,
        dialect: 'mysql',
        pool: Object.assign({ max: 5, idle: 10000, acquire: 30000 }, pool),
      });
    }
    this.game = this.db.define('game', GameModel);
    this.cache = new LRU({ max: cacheSize });
  }
}
