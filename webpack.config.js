
const { resolve } = require('path');

const ROOT = resolve(__dirname)

module.exports = {
    context: ROOT,
    mode: 'development',
    entry: {
        index: resolve('index.ts'),
        test0: resolve('test0.ts'),
    },

    output: {
        path: resolve('./js'),
        publicPath: '/',
        filename: '[name].js',
    },

    resolve: {
        // proj4 module declaration is not consistent with its ditribution
        mainFields: ["browser", "main", /* "module" */],
        extensions: ['.ts', '.js'],
    },

    module: {
        rules: [
            {
                enforce: 'pre',
                test: /\.js$/,
                exclude: resolve(ROOT, 'node_modules/'),
                loader: 'source-map-loader',
            },
            {
                enforce: 'pre',
                test: /\.ts$/,
                use: "source-map-loader"
            },
            {
                test: /\.ts$/,
                loaders: [
                    {
                        loader: 'ts-loader',
                    }
                ],
            },
        ]
    },

    devtool: 'source-map',
}
