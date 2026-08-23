module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Ennek a sornak MINDIG a plugins tömb legvégén kell lennie!
      'react-native-reanimated/plugin',
    ],
  };
};