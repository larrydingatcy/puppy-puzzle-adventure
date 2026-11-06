Object.defineProperties(Storage.prototype, {
  getItem: {
    configurable: true,
    value() {
      throw new Error('storage unavailable');
    },
  },
  setItem: {
    configurable: true,
    value() {
      throw new Error('storage unavailable');
    },
  },
});
