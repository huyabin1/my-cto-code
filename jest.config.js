module.exports = {
  preset: '@vue/cli-plugin-unit-jest',
  moduleFileExtensions: ['js', 'json', 'vue'],
  transform: {
    '^.+\\.vue$': 'vue-jest',
    '^.+\\.js$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/unit/__mocks__/styleMock.js',
    '\\.(gif|jpg|jpeg|png|svg)$': '<rootDir>/tests/unit/__mocks__/fileMock.js',
  },
  testEnvironment: 'jsdom',
};
