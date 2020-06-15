import { RepoSpec, Repo, getOctokit } from "./repo";
import { LogType } from "./log";
import { Branch } from "./branch";
import { LoggingValidator, isValidationError } from "./Validator";
import { formatLink, formatSHA } from "./print";
import { waitForDebugger } from "inspector";
import { guessEnvironment, Environment } from "./env";

const { Plan, Info, Good, OK, Err, Warn, Look, NewLine } = LogType;

export enum Outcome {
  NoOp,
  Success,
  Failure,
}

export function isOutcomeAnError(outcome: Outcome): boolean {
  switch (outcome) {
    case Outcome.Success:
    case Outcome.NoOp:
      return false;
    default:
      return true;
  }
}

async function wait(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 1000));
}

class API {
  private repo: Repo;
  private commandStack: string[] = [];
  private preBranch: Branch;
  private postBranch: Branch;
  private validator: LoggingValidator;
  constructor(
    repoSpec: RepoSpec,
    preBranchName: string,
    postBranchName: string
  ) {
    this.repo = new Repo(repoSpec);
    this.preBranch = new Branch(this.repo, preBranchName);
    this.postBranch = new Branch(this.repo, postBranchName);
    this.validator = new LoggingValidator(
      this.repo,
      this.log.bind(this),
      this.preBranch,
      this.postBranch
    );
  }

  log(logType: LogType, ...args: any[]) {
    const cmd = this.commandStack[this.commandStack.length - 1];
    this.repo.log(cmd, logType, ...args);
  }

  private popCommand(cmd: string): void {
    const popped = this.commandStack.pop();
    if (popped !== cmd) {
      throw new Error(
        `Command stack is out of sync (expected: ${cmd}, saw: ${popped}).`
      );
    }
  }

  private async wrap(
    cmd: string,
    impl: () => Promise<Outcome>
  ): Promise<Outcome> {
    this.commandStack.push(cmd);
    try {
      await this.validator.preAndPostMustNotHaveSameName();
      return await impl();
    } catch (e) {
      if (isValidationError(e)) {
        return Outcome.Failure;
      }
      throw e;
    } finally {
      this.popCommand(cmd);
    }
  }

  async info(): Promise<Outcome> {
    return this.wrap("info", this.infoImpl.bind(this));
  }

  private async infoImpl(): Promise<Outcome> {
    const prInfo = async (branch: Branch): Promise<void> => {
      const prLink = await branch.firstPRLink();
      if (!!prLink) {
        this.log(Look, `🔃 ${branch} has open PRs with it as a base.`);
        this.log(Look, `Link to an example PR with ${branch} as the base:`);
        this.log(Look, `${formatLink(prLink)}`);
      } else {
        this.log(Look, `${branch} has no open PRs with it as a base.`);
      }
    };
    const branchInfo = async (branch: Branch): Promise<void> => {
      this.log(NewLine, ``);
      const branchSHA = await branch.SHA();
      if (!branchSHA) {
        this.log(Info, `Branch ${branch} does not exist.`);
        return;
      }
      this.log(Info, `SHA for ${branch}: ${formatSHA(branchSHA)}`);
      const isProtected: boolean = await branch.isProtected();
      this.log(
        Look,
        `${isProtected ? "🔒 " : ""}${branch} ${
          isProtected ? "is" : "is not"
        } protected.`
      );
      const isGHPagesBranch: boolean = await branch.isGHPagesBranch();
      this.log(
        Look,
        `${isGHPagesBranch ? "📜 " : ""}${branch} ${
          isGHPagesBranch ? "is" : "is not"
        } a GitHub Pages branch.`
      );
      await prInfo(branch);
    };
    this.log(Plan, `Planning to get info about the repo.`);
    await branchInfo(this.preBranch);
    await branchInfo(this.postBranch);
    const defaultBranch = await this.repo.getDefaultBranch();
    this.log(NewLine, ``);
    this.log(Info, `Default branch: ${defaultBranch}`);
    if (!defaultBranch.matchesNameIn([this.preBranch, this.postBranch])) {
      await branchInfo(defaultBranch);
    }
    return Outcome.NoOp;
  }

  async create(): Promise<Outcome> {
    return this.wrap("create", this.createImpl.bind(this));
  }

  private async createImpl(): Promise<Outcome> {
    this.log(Plan, `Planning to create branch ${this.postBranch}`);
    if (await this.postBranch.exists()) {
      this.log(Info, `Branch ${this.postBranch} already exists.`);
      if (!(await this.preBranch.exists())) {
        this.log(
          Info,
          `Pre-branch ${this.preBranch} does not exists (perhaps it's already deleted).`
        );
        return Outcome.NoOp;
      }
      await this.validator.preAndPostSHAMustMatch(); // TODO: is this desired?
      return Outcome.NoOp;
    }

    // This also implies that the pre-branch exists.
    await this.validator.preBranchMustBeDefault();

    this.log(NewLine, ``);
    // TODO: cache and reuse value from above.
    const preBranchSHA = await this.preBranch.SHA();
    this.log(
      Info,
      `Planning to create new branch ${this.postBranch} with SHA ${preBranchSHA}.`
    );
    this.postBranch.create(preBranchSHA);
    this.log(Good, `Created branch ${this.postBranch}`);

    this.log(NewLine, ``);
    this.log(Info, `Validating new branch ${this.postBranch}.`);
    this.log(Info, `Waiting 1000ms before validating.`);
    await wait();
    await this.validator.postBranchMustHaveSHA(preBranchSHA);
    this.log(Good, `New branch has been created!`);
    return Outcome.Success;
  }

  async set(): Promise<Outcome> {
    return this.wrap("set", this.setImpl.bind(this));
  }

  private async setImpl(): Promise<Outcome> {
    this.log(
      Plan,
      `Planning to change the default branch from ${this.preBranch} to ${this.postBranch}.`
    );

    await this.validator.postBranchMustExist();
    if (await this.postBranch.isDefault()) {
      this.log(OK, `Post-branch ${this.postBranch} is already the default`);
      return Outcome.NoOp;
    }

    // This also implies that the pre-branch exists.
    await this.validator.preBranchMustBeDefault();

    this.log(NewLine, ``);
    this.log(Plan, `Setting ${this.postBranch} as the default.`);
    await this.repo.setDefaultBranch(this.postBranch);
    this.log(Good, `Set ${this.postBranch} as the default.`);

    this.log(NewLine, ``);
    this.log(Plan, `Verifying new default.`);
    await this.validator.postBranchMustBeDefault();
    return Outcome.Success;
  }

  async listPulls(): Promise<Outcome> {
    return this.wrap("list-pulls", this.listPullsImpl.bind(this));
  }

  private async listPullsImpl(): Promise<Outcome> {
    this.log(
      Plan,
      `Planning to list pull request for with the base branch ${this.preBranch}.`
    );
    await this.validator.preBranchMustExist();
    const prLinks = await this.preBranch.allPRLinks();
    if (prLinks.length === 0) {
      this.log(OK, `No PRs with the base branch ${this.preBranch}.`);
      return Outcome.NoOp;
    }
    this.log(
      Info,
      `Found ${prLinks.length} PR${
        prLinks.length === 1 ? "" : "s"
      } with the base branch ${this.preBranch}.`
    );
    for (const prLink of prLinks) {
      this.log(Info, prLink);
    }
    return Outcome.NoOp;
  }

  async updatePulls(): Promise<Outcome> {
    return this.wrap("update-pulls", this.updatePullsImpl.bind(this));
  }

  private async updatePullsImpl(): Promise<Outcome> {
    this.log(Plan, `Planning to update pull requests.`);
    await this.validator.preBranchMustExist();
    await this.validator.postBranchMustExist();
    await this.validator.preOrPostMustBeDefault();

    this.log(NewLine, ``);
    this.log(Plan, `Updating any pull requests.`);
    let anyPRs = false;
    await this.postBranch.adoptPulls(this.preBranch, (prLink: string): void => {
      this.log(Info, prLink);
      anyPRs = true;
    });
    if (!anyPRs) {
      this.log(OK, `No pull requests to update.`);
    } else {
      this.log(Good, `Pull requests updated.`);
    }

    // TODO: The PR list appears to be cached for much longer than a second in browsers.
    if (guessEnvironment() === Environment.Browser) {
      this.log(
        Info,
        `Skipping verification for pull request updates because we're running in the browser.`
      );
      this.log(
        Info,
        `Please check that this list is empty: https://github.com/${this.repo.getName()}/pulls?q=is%3Apr+is%3Aopen+base%3A${
          this.preBranch
        }`
      );
    } else {
      this.log(NewLine, ``);
      this.log(Plan, `Verifying that there are no PRs left.`);
      const verificationPRLink = await this.preBranch.firstPRLink();
      this.log(Plan, `Waiting 1000ms before verifying.`);
      await wait();
      if (verificationPRLink !== null) {
        this.log(Err, `Failed to update some PRs.`);
        this.log(Err, `Example: ${verificationPRLink}`);
        return Outcome.Failure;
      } else {
        this.log(
          Good,
          `All PRs that had a base of ${this.preBranch} now have a base of ${this.postBranch}!`
        );
      }
    }
    return Outcome.Success;
  }

  async delete(): Promise<Outcome> {
    return this.wrap("delete", this.deleteImpl.bind(this));
  }

  private async deleteImpl(): Promise<Outcome> {
    this.log(Plan, `Planning to delete ${this.preBranch}.`);
    await this.validator.postBranchMustBeDefault();
    if (!(await this.preBranch.exists())) {
      this.log(
        Info,
        `Pre-branch ${this.preBranch} doesn't exist (perhaps it was already deleted).`
      );
      return Outcome.NoOp;
    }

    const prLink = await this.preBranch.firstPRLink();
    if (prLink == null) {
      this.log(Good, `No open PRs have ${this.preBranch} branch as the base.`);
    } else {
      this.log(Err, `There are PRs with ${this.preBranch} as the base.`);
      this.log(Err, `Example: ${formatLink(prLink)}`);
      this.log(
        Err,
        `Please change the base for these PRs before deleting ${this.preBranch}.`
      );
      return Outcome.Failure;
    }

    await this.validator.preBranchMustNotBeProtected();
    await this.validator.preBranchMustNotBeGHPagesBranch();

    this.log(NewLine, ``);
    this.log(Plan, `Deleting branch ${this.preBranch}.`);
    await this.preBranch.delete();
    this.log(Good, `Branch deleted.`);

    this.log(NewLine, ``);
    this.log(Plan, `Verifying that ${this.preBranch} is deleted.`);
    this.log(Plan, `Waiting 1000ms before verifying.`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const verificationExists = await this.preBranch.exists();
    if (!verificationExists) {
      this.log(Good, `Branch deletion verified!`);
      return Outcome.Success;
    } else {
      this.log(
        Err,
        `Branch deletion failed. ${this.preBranch} still exists on GitHub.`
      );
      return Outcome.Failure;
    }
  }

  async replace(): Promise<Outcome> {
    return this.wrap("replace", this.replaceImpl.bind(this));
  }

  private async replaceImpl(): Promise<Outcome> {
    this.log(
      Plan,
      `Planning to replace ${this.preBranch} with ${this.postBranch}.`
    );

    if (await this.postBranch.isDefault()) {
      this.log(OK, `The default branch is already ${this.postBranch}.`);
      if (await this.preBranch.exists()) {
        this.log(Info, `The branch ${this.preBranch} also exists.`);
        this.log(
          Info,
          `To delete it, run: main-branch ${this.repo.getName()} delete ${
            this.preBranch
          } ${this.postBranch}`
        );
      }
      return Outcome.NoOp;
    }

    try {
      await this.validator.preBranchMustBeDefault();
    } catch (e) {
      if (isValidationError(e)) {
        const currentDefaultBranch = await this.repo.getDefaultBranch();
        this.log(
          Err,
          `If you'd like to run the \`replace\` like this, please set ${
            this.preBranch
          } branch as default first: main-branch set ${this.repo.getName()} ${currentDefaultBranch} ${
            this.preBranch
          };`
        );
        this.log(
          Err,
          `Note that this will leave the ${currentDefaultBranch} branch intact.`
        );
      }
      throw e;
    }

    if (isOutcomeAnError(await this.create())) {
      return Outcome.Failure;
    }
    if (isOutcomeAnError(await this.set())) {
      return Outcome.Failure;
    }
    if (isOutcomeAnError(await this.updatePulls())) {
      return Outcome.Failure;
    }
    if (isOutcomeAnError(await this.delete())) {
      return Outcome.Failure;
    }
    this.log(Good, `Replaced ${this.preBranch} with ${this.postBranch}`);
    return Outcome.Success;
  }
}

export const info = async (
  repoSpec: RepoSpec,
  preBranchName: string,
  postBranchName: string
): Promise<Outcome> => {
  return await new API(repoSpec, preBranchName, postBranchName).info();
};
export const create = async (
  repoSpec: RepoSpec,
  preBranchName: string,
  postBranchName: string
): Promise<Outcome> => {
  return await new API(repoSpec, preBranchName, postBranchName).create();
};
export const set = async (
  repoSpec: RepoSpec,
  preBranchName: string,
  postBranchName: string
): Promise<Outcome> => {
  return await new API(repoSpec, preBranchName, postBranchName).set();
};
export const listPulls = async (
  repoSpec: RepoSpec,
  preBranchName: string,
  postBranchName: string
): Promise<Outcome> => {
  return await new API(repoSpec, preBranchName, postBranchName).listPulls();
};
export const updatePulls = async (
  repoSpec: RepoSpec,
  preBranchName: string,
  postBranchName: string
): Promise<Outcome> => {
  return await new API(repoSpec, preBranchName, postBranchName).updatePulls();
};
export const deleteBranch = async (
  repoSpec: RepoSpec,
  preBranchName: string,
  postBranchName: string
): Promise<Outcome> => {
  return await new API(repoSpec, preBranchName, postBranchName).delete();
};
export const replace = async (
  repoSpec: RepoSpec,
  preBranchName: string,
  postBranchName: string
): Promise<Outcome> => {
  return await new API(repoSpec, preBranchName, postBranchName).replace();
};
