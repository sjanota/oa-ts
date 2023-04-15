export const tap =
  <T>(f: (t: T) => unknown) =>
  (t: T): T => {
    f(t);
    return t;
  };

export const log = <T>(prefix = '') => tap<T>((v) => console.log(prefix, v));
