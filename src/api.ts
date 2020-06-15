import { Octokit } from "@octokit/rest";
import { getPAT } from "./auth";

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

const GITHUB_HTTPS_PREFIX = "https://github.com/"
export function parseRepo(s: string): RepoSpec {
  if (s.startsWith(GITHUB_HTTPS_PREFIX)) {
    s = s.slice(GITHUB_HTTPS_PREFIX.length);
    const [repo, owner] = s.split("/", 2);
    return {repo, owner}
  } else {
    return parseRepoSpec(s);
  }
}

export function parseRepoSpec(s: string): RepoSpec {
  const parts = s.split("/");
  if (parts.length !== 2) {
    throw `Invalid repo specification (expected \`owner/repo\` format): ${s}`;
  }
  const [owner, repo] = parts;
  return { owner, repo };
}

export enum LogType {
  Plan,
  Info,
  Checkmark,
  OK,
  Error,
  Warning,
  NewLine,
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

  log(cmd: string, logType: LogType, ...args): void {
    const consoleFn = (() => {
      switch (logType) {
        case LogType.Error:
          return console.error.bind(console);
        case LogType.Info:
          return console.info.bind(console);
        default:
          return console.log.bind(console);
      }
    })();

    const emojiPrefix = (() => {
      switch (logType) {
        case LogType.Plan:
          return " 🌐";
        case LogType.Info:
          return " ℹ️ ";
        case LogType.Checkmark:
          return " ✅";
        case LogType.OK:
          return " 🆗";
        case LogType.Error:
          return " ❌";
        case LogType.Warning:
          return " ⚠️";
        case LogType.NewLine:
          return "";
      }
    })();
    consoleFn(`[${this.getName()}] [${cmd}]${emojiPrefix}`, ...args);
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
      const pullRequests = await fn("GET /repos/:owner/:repo/pulls", {
        ...this.repoSpec,
        state: "open",
      });
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
