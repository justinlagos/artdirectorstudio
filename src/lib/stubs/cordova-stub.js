// Stub for cordova/modulemapper - not needed in web environment
// browser-image-compression has conditional cordova imports that break in web
export default {
  getOriginalSymbol: () => null,
  getOriginalSymbolSync: () => null,
};

// Provide a require function that returns an object with getOriginalSymbol
export const require = (module) => {
  if (module === 'cordova/modulemapper') {
    return {
      getOriginalSymbol: () => null,
      getOriginalSymbolSync: () => null,
    };
  }
  return {};
};
