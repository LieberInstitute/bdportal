import { DefinePlugin } from 'webpack';

export default (config, env, helpers) => {
	//change this to BASE_URL = '' for the regular case
	const BASE_URL = env.isProd ? '/bdportal/dev' : ''
	config.output.publicPath = `${BASE_URL}/`
	config.plugins.push(
        new DefinePlugin({
            'cfg_APP_BASE_URL': JSON.stringify(BASE_URL),
        }),
	)


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
