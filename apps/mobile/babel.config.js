module.exports = (api) => {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Reanimated 4 — plugin worklets musi być ostatni.
    plugins: ["react-native-worklets/plugin"],
  };
};
