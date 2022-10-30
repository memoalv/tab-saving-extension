import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import html from '@web/rollup-plugin-html';
import copy from 'rollup-plugin-copy'

const production = !process.env.ROLLUP_WATCH;

function serve() {
  let server;

  function toExit() {
    if (server) server.kill(0);
  }

  return {
    writeBundle() {
      if (server) return;
      server = require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
        stdio: ['ignore', 'inherit', 'inherit'],
        shell: true
      });

      process.on('SIGTERM', toExit);
      process.on('exit', toExit);
    }
  };
}

export default [
  {
    input: "src/popup.js",
    output: {
      sourcemap: true,
      format: "iife",
      file: "build/popup.js"
    },
    include: ['source/popup.html'],
    plugins: [
      resolve(),
      commonjs(),
      copy({
        targets: [
          {
            src: [
              "src/manifest.json",
            ],
            dest: "build"
          },
          {
            src: [
              'src/assets/images/16x16.png',
              'src/assets/images/48x48.png',
              'src/assets/images/128x128.png'
            ],
            dest: 'build/assets'
          }
        ]
      })
    ]
  },
  {
    input: 'src/popup.html',
    output: { dir: 'build' },
    plugins: [
      html({
        minify: true
      })
    ],
  }
]
