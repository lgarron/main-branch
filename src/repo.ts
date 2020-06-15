import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import { getPAT } from "./auth";
import { log, LogType } from "./log";
import { Branch } from "./branch";

export const getOctokit: () => Promise<Octokit> = ((): (() => Promise<
  Octokit
>) => {
  let octokit: Octokit | null = null;
  return async function (): Promise<Octokit> {
    if (!octokit) {
      octokit = new Octokit({ auth: await getPAT() });
    }
    return octokit;
  };
})();
export interface RepoSpec {
  owner: string;
  repo: string;
}

export function parseRepoSpec(s: string): RepoSpec {
  const parts = s.split("/");
  if (parts.length !== 2) {
    throw `Invalid repo specification (expected \`owner/repo\` format): ${s}`;
  }
  const [owner, repo] = parts;
  return { owner, repo };
}

const GITHUB_HTTPS_PREFIX = "https://github.com/";
export function parseRepo(s: string): RepoSpec {
  if (s.startsWith(GITHUB_HTTPS_PREFIX)) {
    s = s.slice(GITHUB_HTTPS_PREFIX.length);
    const [owner, repo] = s.split("/", 2);
    return { owner, repo };
  } else {
    return parseRepoSpec(s);
  }
}

export class Repo {
  constructor(public readonly spec: RepoSpec) {}

  public static fromName(s: string): Repo {
    return new Repo(parseRepoSpec(s));
  }

  log(cmd: string, logType: LogType, ...args) {
    log(this.getName(), cmd, logType, args);
  }

  getName(): string {
    return `${this.spec.owner}/${this.spec.repo}`;
  }

  async getDefaultBranch(): Promise<Branch> {
    const repo = (await (await getOctokit()).repos.get({ ...this.spec })).data;
    return new Branch(this, repo.default_branch);
  }

  async setDefaultBranch(branch: Branch): Promise<void> {
    await (await getOctokit()).repos.update({
      ...this.spec,
      default_branch: branch.name,
    });
  }
}
