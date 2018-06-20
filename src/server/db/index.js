import { InMemory } from './inmemory';
import { Mongo } from './mongo';
import { Firebase } from './firebase';
import { MySQL } from './mysql';
import { SQLite } from './sqlite';
import { PostgreSQL } from './postgre';
const DBFromEnv = () => {
  if (process.env.MONGO_URI) {
    return new Mongo({ url: process.env.MONGO_URI });
  } else if (
    process.env.FIREBASE_APIKEY &&
    process.env.FIREBASE_AUTHDOMAIN &&
    process.env.FIREBASE_DATABASEURL &&
    process.env.FIREBASE_PROJECTID
  ) {
    const config = {
      apiKey: process.env.FIREBASE_APIKEY,
      authDomain: process.env.FIREBASE_AUTHDOMAIN,
      databaseURL: process.env.FIREBASE_DATABASEURL,
      projectId: process.env.FIREBASE_PROJECTID,
    };
    return new Firebase({ config, engine: process.env.FIREBASE_ENGINE });
  } else if (process.env.MYSQL_URL) {
    return new MySQL({ url: process.env.MYSQL_URL });
  } else if (process.env.SQLite_URL) {
    return new SQLite({ url: process.env.SQLite_URL });
  } else if (process.env.POSTGRE_URL) {
    return new PostgreSQL({ url: process.env.POSTGRE_URL });
  } else {
    return new InMemory();
  }
};

export { InMemory, Mongo, Firebase, MySQL, SQLite, PostgreSQL, DBFromEnv };
