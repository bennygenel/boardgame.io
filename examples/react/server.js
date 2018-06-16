/*
 * Copyright 2017 The boardgame.io Authors
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import path from 'path';
import KoaStatic from 'koa-static';
import KoaHelmet from 'koa-helmet';
import KoaWebpack from 'koa-webpack';

import WebpackConfig from './webpack.dev.js';
import { Server } from 'boardgame.io/server';
import TicTacToe from './modules/tic-tac-toe/game';
import Chess from './modules/chess/game';
import TurnExample from './modules/turnorder/game';

const PORT = process.env.PORT || 8000;
const DEV = process.env.NODE_ENV === 'development';
const PROD = !DEV;

const server = Server({ games: [TicTacToe, Chess, TurnExample] });
// server.db.connect();
// console.log(server);
if (DEV) {
  // console.log('1');
  server.app.use(
    KoaWebpack({
      config: WebpackConfig,
    })
  );
  // console.log('2');
}

if (PROD) {
  server.app.use(KoaStatic(path.join(__dirname, 'dist')));
  server.app.use(KoaHelmet());
}
// console.log('3', server.run);
server.run(PORT, () => {
  console.log(`Serving at: http://localhost:${PORT}/`);
});
