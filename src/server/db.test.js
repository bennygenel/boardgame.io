/*
 * Copyright 2017 The boardgame.io Authors
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { InMemory, Mongo, Firebase } from './db';
import * as MongoDB from 'mongo-mock';
import firebasemock from 'firebase-mock';

const mockdatabase = new firebasemock.MockFirebase();
const mockfirestore = new firebasemock.MockFirestore();
var mocksdk = new firebasemock.MockFirebaseSdk(
  // use null if your code does not use RTDB
  path => {
    return path ? mockdatabase.child(path) : mockdatabase;
  },
  // use null if your code does not use AUTHENTICATION
  () => null,
  // use null if your code does not use FIRESTORE
  () => {
    return mockfirestore;
  },
  // use null if your code does not use STORAGE
  () => null,
  // use null if your code does not use MESSAGING
  () => null
);

test('basic', async () => {
  const db = new InMemory();
  await db.connect();

  // Must return undefined when no game exists.
  let state = await db.get('gameID');
  expect(state).toEqual(undefined);

  // Create game.
  await db.set('gameID', { a: 1 });
  // Must return created game.
  state = await db.get('gameID');
  expect(state).toEqual({ a: 1 });

  // Must return true if game exists
  const has = await db.has('gameID');
  expect(has).toEqual(true);
});

test('Mongo', async () => {
  const mockClient = MongoDB.MongoClient;
  const db = new Mongo({ mockClient, url: 'a' });
  await db.connect();

  // Must return undefined when no game exists.
  let state = await db.get('gameID');
  expect(state).toEqual(undefined);

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
    const db = new Mongo({ mockClient, cacheSize: 1, url: 'a' });
    await db.connect();
    await db.set('gameID', { a: 1 });
    await db.set('another', { b: 1 });
    state = await db.get('gameID');
    // Check that it came from Mongo and not the cache.
    expect(state._id).toBeDefined();
  }

  {
    const db = new Mongo({ url: 'a', dbname: 'test' });
    expect(db.client).toBeDefined();
    expect(db.dbname).toBe('test');
  }
});

test('Mongo - race conditions', async () => {
  const mockClient = MongoDB.MongoClient;
  const db = new Mongo({ mockClient, url: 'a' });
  await db.connect();

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

test('Firestore', async () => {
  const mockConfig = {
    engine: 'Firestore',
    apiKey: 'apikey',
    authDomain: 'authDomain',
    databaseURL: 'databaseURL',
    projectId: 'projectId',
  };
  mocksdk.initializeApp();
  const mockFirebase = mocksdk.firestore();
  mockFirebase.autoFlush();
  const db = new Firebase({ config: mockConfig, mockFirebase });
  await db.connect();

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
    const db = new Firebase({ config: mockConfig, mockFirebase, cacheSize: 1 });
    await db.connect();
    await db.set('gameID', { a: 1 });
    await db.set('another', { b: 1 });
    state = await db.get('gameID');
    // Check that it came from Mongo and not the cache.
    expect(state._id).toBeDefined();
  }
});

test('Firebase', async () => {
  const mockConfig = {
    engine: 'RTDB',
    apiKey: 'apikey',
    authDomain: 'authDomain',
    databaseURL: 'databaseURL',
    projectId: 'projectId',
  };
  mocksdk.initializeApp();
  const mockFirebase = mocksdk.database();
  mockFirebase.ref().autoFlush();
  const db = new Firebase({
    config: mockConfig,
    mockFirebase: mockFirebase.ref(),
  });
  await db.connect();

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
      mockFirebase: mockFirebase.ref(),
      cacheSize: 1,
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
    engine: 'Firestore',
    apiKey: 'apikey',
    authDomain: 'authDomain',
    databaseURL: 'databaseURL',
    projectId: 'projectId',
  };
  mocksdk.initializeApp();
  const mockFirebase = mocksdk.firestore();
  mockFirebase.autoFlush();
  const db = new Firebase({ config: mockConfig, mockFirebase });
  await db.connect();

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

test('Firebase - race conditions', async () => {
  const mockConfig = {
    engine: 'RTDB',
    apiKey: 'apikey',
    authDomain: 'authDomain',
    databaseURL: 'databaseURL',
    projectId: 'projectId',
  };
  mocksdk.initializeApp();
  const mockFirebase = mocksdk.database();
  mockFirebase.ref().autoFlush();
  const db = new Firebase({
    config: mockConfig,
    mockFirebase: mockFirebase.ref(),
  });
  await db.connect();

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
