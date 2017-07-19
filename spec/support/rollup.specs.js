import buble from 'rollup-plugin-buble';

export default {
	entry: 'spec/index.js',
	dest: 'spec/index.es5.js',
	format: 'iife',
	plugins: [buble()]
};
