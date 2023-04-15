export const tap =
  <T>(f: (t: T) => unknown) =>
  (t: T): T => {
    f(t);
    return t;
  };

export const log = <T>() => tap<T>(console.log);
