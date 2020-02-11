// Copyright 2019 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const LiveReloadPlugin = require("webpack-livereload-plugin");

const config = {
  context: __dirname + "/src",
  entry: {
    index: ["@babel/polyfill", "./index.js"]
  },
  output: {
    path: __dirname + "/build",
    filename: "[name].js"
  },
  resolve: {
    // modules : ['node_modules']
  },
  plugins: [
    new CleanWebpackPlugin(["build"]),
    new CopyWebpackPlugin([
      {
        from: __dirname + "/third_party/**/*",
        to: __dirname + "/build/third_party/"
      }
    ]),
    new HtmlWebpackPlugin({
      title: "Pattern Radio",
      template: __dirname + "/src/index.html",
      inject: "body",
      chunks: ["index"]
    }),
    new LiveReloadPlugin({})
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [
                "@babel/preset-env",
                {
                  targets: {
                    esmodules: true,
                    chrome: 60,
                    safari: 10
                  }
                }
              ]
            ]
          }
        }
      },
      {
        test: /\.scss$/,
        use: ["style-loader", "css-loader", "sass-loader"]
      }
    ]
  },
  devtool: "source-map"
};

module.exports = [config];
