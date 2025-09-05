module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier'
  ],
  rules: {
    'react/prop-types': 'off', // 禁用 prop-types 检查，因为我们使用 TypeScript
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': 'allow-with-description' }],
    'no-empty': ['error', { 'allowEmptyCatch': true }]
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.node.json', './tsconfig.web.json'],
    tsconfigRootDir: __dirname
  },
  ignorePatterns: [
    'dist',
    'out',
    'node_modules',
    '.eslintrc.cjs',
    '*.md',
    '*.json',
    'package-lock.json',
    'commitlint.config.js',
    'postcss.config.js',
    'tailwind.config.js',
    'vitest.config.ts'
  ],
  settings: {
    react: {
      version: 'detect'
    }
  }
}
