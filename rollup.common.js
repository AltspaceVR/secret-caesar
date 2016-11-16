import buble from 'rollup-plugin-buble';

export default {
	entry: 'src/gameobjects.js',
	dest: 'src/gameobjects.cjs',
	format: 'cjs',
	plugins: [buble()]
};
