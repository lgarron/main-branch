import { Repo } from "./repo";
import { LogType } from "./log";
import { Branch } from "./branch";

const { Plan, Info, Good, OK, Err, Warn, NewLine } = LogType;

function throwValidationError() {
  const e = new Error();
  (e as any).validationError = true; // TODO: type
  throw e;
}

export function isValidationError(e: Error) {
  return !!(e as any).validationError; // TODO: type
}

export class LoggingValidator {
  constructor(
    private repo: Repo,
    private log: (logType: LogType, ...args: any[]) => void,
    private preBranch: Branch,
    private postBranch: Branch
  ) {}

  async preAndPostMustNotHaveSameName(): Promise<void> {
    if (this.preBranch.name === this.postBranch.name) {
      this.log(
        LogType.Err,
        `Pre-branch and post-branch do not have the same name (both are ${this.preBranch})`
      );
      throwValidationError();
    }
    return;
  }
  // Success also means that the pre-branch exists.
  async preBranchMustBeDefault(): Promise<void> {
    if (!(await this.preBranch.isDefault())) {
      this.log(Err, `Pre-branch ${this.preBranch} is not the default branch.`);
      throwValidationError();
    }
    this.log(Good, `Pre-branch ${this.preBranch} is the default.`);
    return;
  }

  // Success also means that the post-branch exists.
  async postBranchMustBeDefault(): Promise<void> {
    if (!(await this.postBranch.isDefault())) {
      this.log(
        Err,
        `Post-branch ${this.postBranch} is not the default branch.`
      );
      throwValidationError();
    }
    this.log(Good, `Post-branch ${this.postBranch} is the default.`);
    return;
  }

  async preOrPostMustBeDefault(): Promise<void> {
    const currentDefaultBranch = await this.repo.getDefaultBranch();
    if (
      !currentDefaultBranch.matchesNameIn([this.preBranch, this.postBranch])
    ) {
      this.log(
        Err,
        `Default branch ${currentDefaultBranch} is not the pre-branch or post-branch.`
      );
      throwValidationError();
    }
    return;
  }

  async preBranchMustExist(): Promise<void> {
    if (this.preBranch.exists()) {
      this.log(LogType.Good, `Pre-branch exists: ${this.preBranch}`);
      return;
    }
    this.log(LogType.Err, `Pre-branch does not exist: ${this.preBranch}`);
    throwValidationError();
  }

  async postBranchMustExist(): Promise<void> {
    if (this.postBranch.exists()) {
      this.log(LogType.Good, `Post-branch exists: ${this.postBranch}`);
      return;
    }
    this.log(LogType.Err, `Post-branch does not exist: ${this.postBranch}`);
    throwValidationError();
  }

  // Precondition: the pre-branch and post-branch exist.
  async preAndPostSHAMustMatch(): Promise<void> {
    const preBranchSHA = await this.preBranch.SHA();
    const postBranchSHA = await this.postBranch.SHA();
    if (!preBranchSHA || !postBranchSHA) {
      throw new Error(
        `\`preAndPostSHAMustMatch()\` was called, but one of the branches does not have a SHA (pre: ${preBranchSHA}, post: ${postBranchSHA}).`
      );
    }
    if (preBranchSHA === postBranchSHA) {
      this.log(
        LogType.Good,
        `Pre-branch and post-branch SHAs match ${preBranchSHA}.`
      );
      return;
    }
    this.log(LogType.Err, `Pre-branch and post-branch SHAs do not match.`);
    this.log(LogType.Err, `Pre-branch SHA: ${preBranchSHA}`);
    this.log(LogType.Err, `Post-branch SHA: ${postBranchSHA}`);
    throwValidationError();
  }

  async postBranchMustHaveSHA(expectedSHA: string): Promise<void> {
    const postBranchSHA = await this.postBranch.SHA();
    if (postBranchSHA !== expectedSHA) {
      this.log(LogType.Err, `Post-branch SHA does not match expected value.`);
      this.log(LogType.Err, `Expected: ${expectedSHA}`);
      this.log(LogType.Err, `Actual: ${postBranchSHA}`);
      throwValidationError();
    }
    return;
  }

  async preBranchMustNotBeProtected(): Promise<void> {
    if (await this.preBranch.isProtected()) {
      this.log(LogType.Err, `Pre-branch is protected: ${this.preBranch}`);
      throwValidationError();
    }
    this.log(LogType.Good, `Pre-branch is not protected: ${this.preBranch}`);
  }
}
