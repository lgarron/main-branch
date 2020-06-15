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

const GITHUB_HTTPS_PREFIX = "https://github.com/"
export function parseRepo(s: string): RepoSpec {
  if (s.startsWith(GITHUB_HTTPS_PREFIX)) {
    s = s.slice(GITHUB_HTTPS_PREFIX.length);
    const [owner, repo] = s.split("/", 2);
    return {owner, repo}
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

export interface PRSearchResult {
  // `null` means no PR was found.
  // A string will be a link to the first PR found by the search.
  firstFoundPRLink: string | null;
  numOpenPRsChecked: number;
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

  async anyPullRequestWithBaseBranch(
    branchName: string
  ): Promise<PRSearchResult> {
    // Octokit includes a snazzy paginator to get all PRs. But chances are that
    // we'll find it in the first page, if any. So we optimistically look at the
    // first page, then all pages. (That's duplicate work for the first page,
    // but it keeps the code simple for now.)
    const paginated = async (allPRs: boolean): Promise<PRSearchResult> => {
      const octokit = await getOctokit();
      const fn: any = allPRs ? octokit.paginate : octokit.request; // TODO: `any` type
      let pullRequests = (await fn("GET /repos/:owner/:repo/pulls", {
        ...this.repoSpec,
        state: "open",
      }));
      if (!allPRs) {
        pullRequests = pullRequests.data;
      }
      console.log("pullRequests", pullRequests, allPRs)
      for (const pullRequest of pullRequests) {
        if (pullRequest.base.ref === branchName) {
          return {
            firstFoundPRLink: pullRequest.html_url,
            numOpenPRsChecked: pullRequests.length,
          };
        }
      }
      return {
        firstFoundPRLink: null,
        numOpenPRsChecked: pullRequests.length,
      };
    };
    const shortlist = await paginated(false);
    if (!!shortlist.firstFoundPRLink) {
      return shortlist;
    }
    return await paginated(true);
  }
}
