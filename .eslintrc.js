module.exports = {
    root: true,
    env: {
      node: true,
    },
    extends: [
      "plugin:vue/vue3-essential",
      "eslint:recommended",
    ],
    parserOptions: {
      parser: "@babel/eslint-parser",
      requireConfigFile: false,
    },
    rules: {
      "no-console": "warn",//console.log 사용 시 경고
      "no-unused-vars": "warn",//할당되지 않은 변수 있을 시 경고
      "vue/multi-word-component-names": "off"//eslint의 기본 규칙이 컴포넌트 이름을 정할 땐 두 개 이상의 단어를 사용하는 규칙이어서 컴파일 에러      
    },
  }