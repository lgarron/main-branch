import { Octokit } from "@octokit/rest";
import { getPAT } from "./auth";
import { log, LogType } from "./log";

const getOctokit: () => Promise<Octokit> = (() => {
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

function refForBranch(branchName: string): string {
  // TODO: validate branch name?
  return `heads/${branchName}`;
}

function fullRefForBranch(branchName: string): string {
  return `refs/${refForBranch(branchName)}`;
}

export class Repo {
  constructor(private repoSpec: RepoSpec) {}

  public static fromName(s: string): Repo {
    return new Repo(parseRepoSpec(s));
  }

  log(cmd: string, logType: LogType, ...args) {
    log(this.getName(), cmd, logType, args);
  }

  getSpec(): RepoSpec {
    return this.repoSpec;
  }

  getName(): string {
    return `${this.repoSpec.owner}/${this.repoSpec.repo}`;
  }

  async getBranchSHA(branchName: string): Promise<string | null> {
    try {
      const ref = (
        await (await getOctokit()).git.getRef({
          ...this.repoSpec,
          ref: refForBranch(branchName),
        })
      ).data;
      return ref.object.sha;
    } catch (e) {
      if (e.status === 404) {
        return null;
      }
      throw e;
    }
  }

  async branchExists(branchName: string) {
    return (await this.getBranchSHA(branchName)) !== null;
  }

  async createBranch(branchName: string, sha: string): Promise<void> {
    (await getOctokit()).git.createRef({
      ...this.repoSpec,
      ref: fullRefForBranch(branchName),
      sha,
    });
  }

  async setDefaultBranch(branchName: string): Promise<void> {
    await (await getOctokit()).repos.update({
      ...this.repoSpec,
      default_branch: branchName,
    });
  }

  async getDefaultBranch(): Promise<string> {
    const repo = (await (await getOctokit()).repos.get({ ...this.repoSpec }))
      .data;
    return repo.default_branch;
  }

  async deleteBranch(branchName: string): Promise<void> {
    await (await getOctokit()).git.deleteRef({
      ...this.repoSpec,
      ref: refForBranch(branchName),
    });
  }

  private async getPullsWithBase(branchName: string): Promise<any> {
    const octokit = await getOctokit();
    return octokit.paginate.iterator(octokit.pulls.list, {
      ...this.repoSpec,
      state: "open",
      base: branchName,
    });
  }

  // Returns a PR link if there is one, else returns `null`.
  async anyPRLinkWithBaseBranch(branchName: string): Promise<string | null> {
    for await (const response of await this.getPullsWithBase(branchName)) {
      for (const pull of response.data) {
        return pull.html_url;
      }
    }
    return null;
  }
}
