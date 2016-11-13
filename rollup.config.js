import buble from 'rollup-plugin-buble';

export default {
	entry: 'src/client/secrethitler.js',
	dest: 'static/js/secrethitler.js',
	format: 'iife',
	moduleName: 'SecretHitler',
	sourceMap: 'inline',
	plugins: [buble()]
};
