import { Repo, getOctokit } from "./repo";
import { formatBranch } from "./print";

export class Branch {
  constructor(private repo: Repo, public readonly name: string) {
    // TODO: validate branch name?
  }

  toString() {
    return formatBranch(this.name);
  }

  ref(): string {
    return `heads/${this.name}`;
  }

  fullRef(): string {
    return `refs/${this.ref()}`;
  }

  matchesNameIn(branches: Branch[]): boolean {
    for (const branch of branches) {
      if (branch.name == this.name) {
        return true;
      }
    }
    false;
  }

  async SHA(): Promise<string | null> {
    try {
      const ref = (
        await (await getOctokit()).git.getRef({
          ...this.repo.spec,
          ref: this.ref(),
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

  async exists() {
    return (await this.SHA()) !== null;
  }

  async create(sha: string): Promise<void> {
    (await getOctokit()).git.createRef({
      ...this.repo.spec,
      ref: this.fullRef(),
      sha,
    });
  }

  async delete(): Promise<void> {
    await (await getOctokit()).git.deleteRef({
      ...this.repo.spec,
      ref: this.ref(),
    });
  }

  async isDefault(): Promise<boolean> {
    const currentDefaultBranch = await this.repo.getDefaultBranch();
    return this.name === currentDefaultBranch.name;
  }

  // TODO: Turn into a single iterator.
  private async getPullsWithBase(): Promise<any> {
    const octokit = await getOctokit();
    return octokit.paginate.iterator(octokit.pulls.list, {
      ...this.repo.spec,
      state: "open",
      base: this.name,
    });
  }

  // Returns a PR link if there is one, else returns `null`.
  async firstPRLink(): Promise<string | null> {
    for await (const response of await this.getPullsWithBase()) {
      for (const pull of response.data) {
        return pull.html_url;
      }
    }
    return null;
  }

  async allPRLinks(): Promise<string[]> {
    const prLinks: string[] = [];
    for await (const response of await this.getPullsWithBase()) {
      for (const pull of response.data) {
        prLinks.push(pull.html_url);
      }
    }
    return prLinks;
  }

  private async adoptPull(pull_number: number): Promise<void> {
    await (await getOctokit()).pulls.update({
      ...this.repo.spec,
      pull_number,
      base: this.name,
      // // Workaround for a long caching time in the browser.
      // // https://github.com/octokit/rest.js/issues/890#issuecomment-392193948
      // headers: {
      //   "If-None-Match": "",
      // },
    });
  }

  async adoptPulls(
    oldBaseBranch: Branch,
    processingCallback: (prLink: string) => void
  ): Promise<void> {
    for await (const response of await oldBaseBranch.getPullsWithBase()) {
      for (const pull of response.data) {
        processingCallback(pull.html_url);
        await this.adoptPull(pull.number);
      }
    }
  }
}
