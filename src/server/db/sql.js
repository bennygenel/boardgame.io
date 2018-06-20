/*
 * Copyright 2017 The boardgame.io Authors
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */
import Sequelize from 'sequelize';

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

/**
 * SQL connector.
 */
export class SQL {
  /**
   * Creates a new SQL connector object.
   */
  constructor({ url, config, engine }) {
    if (url) this.db = new Sequelize(url);
    else if (config) {
      const {
        database,
        username,
        password,
        host,
        port,
        pool,
        storage,
      } = config;
      this.db = new Sequelize(database, username, password, {
        host,
        port,
        dialect: engine,
        pool: Object.assign({ max: 5, idle: 10000, acquire: 30000 }, pool),
        storage: storage || ':memory:',
      });
    }
    this.game = this.db.define('game', GameModel);
  }

  /**
   * Connect to the instance.
   */
  async connect() {
    const c = await this.db.authenticate();
    if (c) {
      return console.error('Connection error', c);
    }
    return;
  }

  /**
   * Write the game state.
   * @param {string} id - The game id.
   * @param {object} store - A game state to persist.
   */
  async set(id, state) {
    // Don't set a value if the cache has a more recent version.
    // This can occur due a race condition.
    //
    // For example:
    //
    // A --sync--> server | DB => 0 --+
    //                                |
    // A <--sync-- server | DB => 0 --+
    //
    // B --sync--> server | DB => 0 ----+
    //                                  |
    // A --move--> server | DB <= 1 --+ |
    //                                | |
    // A <--sync-- server | DB => 1 --+ |
    //                                  |
    // B <--sync-- server | DB => 0 ----+
    //
    const cacheValue = this.cache.get(id);
    if (cacheValue && cacheValue._stateID >= state._stateID) {
      return;
    }

    this.cache.set(id, state);

    delete state._id;
    await this.game.upsert({ id, ctx: state });

    return;
  }

  /**
   * Read the game state.
   * @param {string} id - The game id.
   * @returns {object} - A game state, or undefined
   *                     if no game is found with this id.
   */
  async get(id) {
    let cacheValue = this.cache.get(id);
    if (cacheValue !== undefined) {
      return cacheValue;
    }

    const doc = await this.db.findOne({ where: { id } });

    let oldStateID = 0;
    cacheValue = this.cache.get(id);
    /* istanbul ignore next line */
    if (cacheValue !== undefined) {
      /* istanbul ignore next line */
      oldStateID = cacheValue._stateID;
    }

    let newStateID = -1;
    if (doc) {
      newStateID = doc._stateID;
    }

    // Update the cache, but only if the read
    // value is newer than the value already in it.
    // A race condition might overwrite the
    // cache with an older value, so we need this.
    if (newStateID >= oldStateID) {
      this.cache.set(id, doc);
    }

    return doc.ctx;
  }

  /**
   * Check if a particular game exists.
   * @param {string} id - The game id.
   * @returns {boolean} - True if a game with this id exists.
   */
  async has(id) {
    const cacheValue = this.cache.get(id);
    if (cacheValue !== undefined) {
      return true;
    }

    const doc = await this.db.findOne({ where: { id } });
    return doc !== null;
  }
}
