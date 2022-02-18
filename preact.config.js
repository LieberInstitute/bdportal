export default (config, env, helpers) => {
	const css = helpers.getLoadersByName(config, 'css-loader')[0];
	css.loader.options.modules = false;
	//devServer does not exist in production builds
	if (!env.isProd) {
		config.devServer['proxy'] = [
			{
				path:'/**',
				target: 'http://localhost:4000'
				// ...any other stuff...
			}
		]
    }
}
