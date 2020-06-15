export enum Environment {
  NodeJS,
  Browser,
}

export function guessEnvironment(): Environment {
  return typeof window === "undefined"
    ? Environment.NodeJS
    : Environment.Browser;
}
