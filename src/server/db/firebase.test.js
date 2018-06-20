/*
 * Copyright 2017 The boardgame.io Authors
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { Firebase } from './firebase';
import firebasemock from 'firebase-mock';

const mockdatabase = new firebasemock.MockFirebase();
const mockfirestore = new firebasemock.MockFirestore();
var mocksdk = new firebasemock.MockFirebaseSdk(
  // use null if your code does not use RTDB
  () => mockdatabase,
  // use null if your code does not use AUTHENTICATION
  () => null,
  // use null if your code does not use FIRESTORE
  () => mockfirestore,
  // use null if your code does not use STORAGE
  () => null,
  // use null if your code does not use MESSAGING
  () => null
);

test('construction', () => {
  const db = new Firebase({
    mockFirebase: mocksdk,
    dbname: 'a',
    engine: 'Firestore',
  });
  expect(db.dbname).toBe('a');
  expect(db.config).toMatchObject({});
});

test('Firestore', async () => {
  const mockConfig = {
    apiKey: 'apikey',
    authDomain: 'authDomain',
    databaseURL: 'databaseURL',
    projectId: 'projectId',
  };
  const db = new Firebase({
    config: mockConfig,
    mockFirebase: mocksdk,
    engine: 'Firestore',
  });
  await db.connect();
  db.db.autoFlush();

  // Must return undefined when no game exists.
  let state = await db.get('gameID');
  expect(state).toEqual(null);

  // Create game.
  await db.set('gameID', { a: 1 });

  // Cache hits.
  {
    // Must return created game.
    state = await db.get('gameID');
    expect(state).toMatchObject({ a: 1 });

    // Must return true if game exists
    const has = await db.has('gameID');
    expect(has).toBe(true);
  }

  // Cache misses.
  {
    // Must return created game.
    db.cache.reset();
    state = await db.get('gameID');
    expect(state).toMatchObject({ a: 1 });

    // Must return true if game exists
    db.cache.reset();
    const has = await db.has('gameID');
    expect(has).toBe(true);
  }

  // Cache size.
  {
    const db = new Firebase({
      config: mockConfig,
      mockFirebase: mocksdk,
      cacheSize: 1,
      engine: 'Firestore',
    });
    await db.connect();
    await db.set('gameID', { a: 1 });
    await db.set('another', { b: 1 });
    state = await db.get('gameID');
    // Check that it came from Mongo and not the cache.
    expect(state._id).toBeDefined();
  }
});

test('RTDB', async () => {
  const mockConfig = {
    apiKey: 'apikey',
    authDomain: 'authDomain',
    databaseURL: 'databaseURL',
    projectId: 'projectId',
  };
  // mocksdk.initializeApp();
  // const mockFirebase = mocksdk.database();
  // mockFirebase.ref().autoFlush();
  const db = new Firebase({
    config: mockConfig,
    mockFirebase: mocksdk,
    engine: 'RTDB',
  });
  await db.connect();
  db.db.autoFlush();

  // Must return undefined when no game exists.
  let state = await db.get('gameID');
  expect(state).toEqual(null);

  // Create game.
  await db.set('gameID', { a: 1 });

  // Cache hits.
  {
    // Must return created game.
    state = await db.get('gameID');
    expect(state).toMatchObject({ a: 1 });

    // Must return true if game exists
    const has = await db.has('gameID');
    expect(has).toBe(true);
  }

  // Cache misses.
  {
    // Must return created game.
    db.cache.reset();
    state = await db.get('gameID');
    expect(state).toMatchObject({ a: 1 });

    // Must return true if game exists
    db.cache.reset();
    const has = await db.has('gameID');
    expect(has).toBe(true);
  }

  // Cache size.
  {
    const db = new Firebase({
      config: mockConfig,
      mockFirebase: mocksdk,
      cacheSize: 1,
      engine: 'RTDB',
    });
    await db.connect();
    await db.set('gameID', { a: 1 });
    await db.set('another', { b: 1 });
    state = await db.get('gameID');
    // Check that it came from Mongo and not the cache.
    expect(state._id).toBeDefined();
  }
});

test('Firestore - race conditions', async () => {
  const mockConfig = {
    apiKey: 'apikey',
    authDomain: 'authDomain',
    databaseURL: 'databaseURL',
    projectId: 'projectId',
  };
  // mocksdk.initializeApp();
  // const mockFirebase = mocksdk.firestore();
  // mockFirebase.autoFlush();
  const db = new Firebase({
    config: mockConfig,
    mockFirebase: mocksdk,
    engine: 'Firestore',
  });
  await db.connect();
  db.db.autoFlush();
  // Out of order set()'s.
  await db.set('gameID', { _stateID: 1 });
  await db.set('gameID', { _stateID: 0 });
  expect(await db.get('gameID')).toEqual({ _stateID: 1 });

  // Do not override cache on get() if it is fresher than Mongo.
  await db.set('gameID', { _stateID: 0 });
  db.cache.set('gameID', { _stateID: 1 });
  await db.get('gameID');
  expect(db.cache.get('gameID')).toEqual({ _stateID: 1 });

  // Override if it is staler than Mongo.
  await db.set('gameID', { _stateID: 1 });
  db.cache.reset();
  expect(await db.get('gameID')).toMatchObject({ _stateID: 1 });
  expect(db.cache.get('gameID')).toMatchObject({ _stateID: 1 });
});

test('RTDB - race conditions', async () => {
  const mockConfig = {
    apiKey: 'apikey',
    authDomain: 'authDomain',
    databaseURL: 'databaseURL',
    projectId: 'projectId',
  };
  // mocksdk.initializeApp();
  // const mockFirebase = mocksdk.database();
  // mockFirebase.ref().autoFlush();
  const db = new Firebase({
    config: mockConfig,
    mockFirebase: mocksdk,
    engine: 'RTDB',
  });
  await db.connect();
  db.db.autoFlush();
  // Out of order set()'s.
  await db.set('gameID', { _stateID: 1 });
  await db.set('gameID', { _stateID: 0 });
  expect(await db.get('gameID')).toEqual({ _stateID: 1 });

  // Do not override cache on get() if it is fresher than Mongo.
  await db.set('gameID', { _stateID: 0 });
  db.cache.set('gameID', { _stateID: 1 });
  await db.get('gameID');
  expect(db.cache.get('gameID')).toEqual({ _stateID: 1 });

  // Override if it is staler than Mongo.
  await db.set('gameID', { _stateID: 1 });
  db.cache.reset();
  expect(await db.get('gameID')).toMatchObject({ _stateID: 1 });
  expect(db.cache.get('gameID')).toMatchObject({ _stateID: 1 });
});