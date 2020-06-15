import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import {stdin, stdout} from "process";
import {createInterface} from "readline";
import { join } from "path";
import { homedir } from "os";
import { Environment, guessEnvironment } from "./env";

// This is a function instead of a `const`, so that we don't use `node` packages unless needed.
function patFilePath(): string {
  return join(patFileDir(), "github-personal-access-token");
}

function patFileDir(): string {
  // TODO: Use proper XDG lib
  return join(homedir(), ".config/main-branch");
}

function readPATFromFile(): string {
  return readFileSync(patFilePath(), "utf8").split("\n", 1)[0];
}

async function readAndStorePATFromCommandline(): Promise<string> {
  const pat: string = await new Promise((resolve, reject) => {
    try {
      const rlInterface = createInterface({
        input: stdin,
        output: stdout
      });
      
      rlInterface.question("Personal Access Token: ", (pat: string) => {
        rlInterface.close();
        resolve(pat);
      });
    } catch (e) {
      reject(e);
    }
  })

  console.log(`Saving personal access token at: ${patFilePath()}`);
  mkdirSync(patFileDir(), {recursive: true});
  writeFileSync(patFilePath(), pat, "utf8");
  return pat;
}

async function getPATFromXDG(): Promise<string> {
  if (existsSync(patFilePath())) {
    return readPATFromFile();
  }
  console.log(``)
  console.log(`No personal access token found.`)
  console.log(`Please create a personal access token with \`repo\` scope at:`)
  console.log(`https://github.com/settings/tokens`)
  console.log(``)
  console.log(`\`main-branch\` uses a personal access token for:`)
  console.log(``)
  console.log(`• Edit access to repositories.`)
  console.log(`• Higher rate limits.`)
  console.log(`• Access to private repositories.`)
  console.log(``)
  console.log(`(At the moment, \`main-branch\` also requires a personal access token to work for public operations.)`)
  console.log(``)
  console.log(`This token will be saved in plain text at: ${patFilePath()}`)
  console.log(`You can revoke the personal access token in GitHub or delete the file at any time.`)
  console.log(``)
  const pat = await readAndStorePATFromCommandline();
  console.log(``)
  return pat;
}

const LOCAL_STORAGE_KEY = "github-personal-access-token";
function getPATFromLocalStorage(): string {
  if (LOCAL_STORAGE_KEY in localStorage) {
    return localStorage[LOCAL_STORAGE_KEY];
  } else {
    const pat = prompt("Please enter a personal access token from GitHub:");
    if (!pat) {
      throw new Error("Could not find or get personal acess token.");
    }
    localStorage[LOCAL_STORAGE_KEY] = pat;
    return pat;
  }
}

export enum AuthStorage {
  LocalStorage,
  XDG
}

let authStorage: AuthStorage;
switch (guessEnvironment()) {
  case Environment.NodeJS:
    authStorage = AuthStorage.XDG;
    break;
  case Environment.Browser:
    authStorage = AuthStorage.LocalStorage;
    break;
  default:
    throw new Error("Unknown environment while trying to set auth storage at startup.");
}

export function setAuthStorage(newAuthStorage: AuthStorage) {
  authStorage = newAuthStorage;
}

// TODO: replace with prompt/OAuth
export async function getPAT(): Promise<string> {
  switch (authStorage) {
    case AuthStorage.LocalStorage:
      return getPATFromLocalStorage();
    case AuthStorage.XDG:
      return getPATFromXDG();
    default:
      throw new Error("Auth storage not specified");
  }
}
