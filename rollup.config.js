const path = require('path')

const resolve = require('rollup-plugin-node-resolve')
const commonjs = require('rollup-plugin-commonjs')
const babel = require('rollup-plugin-babel')

module.exports = {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
    },
    {
      file: 'dist/index.mjs',
      format: 'esm',
    }
  ],
  watch: {},
  plugins: [
    babel({
      presets: [
        '@babel/preset-env'
      ],
      plugins: [
        '@babel/plugin-proposal-object-rest-spread'
      ],
      exclude: 'node_modules/**'
    }),
    commonjs({}),
  ]
}
