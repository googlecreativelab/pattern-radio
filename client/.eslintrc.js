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

module.exports = {
    env: {
        browser: true,
        es6: true,
    },
    plugins: ['lit', 'prettier'],
    extends: ['plugin:lit/recommended'],
    globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
    },
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
    },
    rules: {
        semi: ['warn', 'never'],
        'object-curly-spacing': ['error', 'always'],
        'require-jsdoc': 'off',
        // 'indent': ['error', 4],
        'max-len': [
            'error',
            120,
            {
                ignoreTemplateLiterals: true,
            },
        ],
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        'no-underscore-dangle': ['error', { allowAfterThis: true }],
        'prettier/prettier': 'warn',
    },
}
