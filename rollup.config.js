import buble from 'rollup-plugin-buble';

export default {
	entry: 'src/secrethitler.js',
	dest: 'static/js/secrethitler.js',
	format: 'iife',
	moduleName: 'SecretHitler',
	sourceMap: 'inline',
	plugins: [buble()]
};
