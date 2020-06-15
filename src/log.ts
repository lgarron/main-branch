import { guessEnvironment, Environment } from "./env";

export enum LogType {
  Plan,
  Info,
  Good,
  OK,
  Err,
  Warn,
  Look,
  NewLine,
}

type LogFn = (...args: any[]) => void;
const logListeners: LogFn[] = [];
export function addLogListener(listener: LogFn) {
  logListeners.push(listener);
}

export function log(repoName, cmd: string, logType: LogType, ...args): void {
  const consoleFn: LogFn = ((): LogFn => {
    switch (logType) {
      case LogType.Err:
        return console.error.bind(console);
      case LogType.Info:
        return console.info.bind(console);
      default:
        return console.log.bind(console);
    }
  })();

  const emojiPrefix: string | null = ((): string | null => {
    switch (logType) {
      case LogType.Plan:
        return "🌐";
      case LogType.Info:
        return "ℹ️" + (guessEnvironment() === Environment.NodeJS ? " " : ""); // The extra space is needed on macOS, at least.
      case LogType.Good:
        return "✅";
      case LogType.OK:
        return "🆗";
      case LogType.Err:
        return "❌";
      case LogType.Warn:
        return "⚠️";
      case LogType.Look:
        return "🔎";
      case LogType.NewLine:
        return null;
    }
  })();

  let formattedArgs = [`[${repoName}]`, `[${cmd}]`];
  if (emojiPrefix) {
    formattedArgs.push(emojiPrefix);
  }
  formattedArgs = formattedArgs.concat(...args);

  consoleFn(...formattedArgs);
  for (const logListener of logListeners) {
    logListener(...formattedArgs);
  }
}
