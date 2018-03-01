export default {
  input: 'src/index.js',
  output: [{
    file: 'dist/bundle.js',
    format: 'umd',
    name: 'x-unoverride',
  }, {
    file: 'dist/bundle.mjs',
    format: 'es',
  }],
};
