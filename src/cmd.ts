import { log, LogType } from "./log";
import { Repo, RepoSpec } from "./repo";

import * as Color from "colors";
import { guessEnvironment, Environment } from "./env";

const MASTER = "master";
const MAIN = "main";

function format(colorName: "blue" | "yellow" | "underline"): (branchName: string) => string {
  return (branchName: string) => {
    switch (guessEnvironment()) {
      case Environment.NodeJS:
        return Color[colorName](branchName);
      case Environment.Browser:
        return branchName
    }
  }
}

// Format branch for printing
const fb = format("blue");
// Format SHA for printing
const fs = format("yellow");
// Format link for printing
const fl = format("underline");

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

export async function info(
  repoSpec: RepoSpec,
  infoBranch?: string
): Promise<Outcome> {
  const cmd = "info";
  const repo = new Repo(repoSpec);

  if (infoBranch) {
    repo.log(cmd, LogType.Plan, `Getting info about the branch ${fb(infoBranch)}.`);
    repo.log(
      cmd,
      LogType.Info,
      `SHA for branch: ${fs(await repo.getBranchSHA(infoBranch))}`
    );
    const defaultBranch = await repo.getDefaultBranch();
    repo.log(
      cmd,
      LogType.Info,
      `${fb(infoBranch)} ${
        defaultBranch === infoBranch ? "IS" : "IS NOT"
      } the default branch.`
    );
    const prLink = await repo.firstPRLink(
      infoBranch
    );
    if (prLink) {
      repo.log(
        cmd,
        LogType.Info,
        `There are open PRs with this branch as a base.`
      );
      repo.log(
        cmd,
        LogType.Info,
        `Link to an example PR with this base: ${fl(prLink)}`
      );
    } else {
      repo.log(
        cmd,
        LogType.Info,
        `There are no open PRs with this branch as a base.`
      );
    }
  } else {
    repo.log(cmd, LogType.Plan, `Getting info about the repo.`);
    repo.log(
      cmd,
      LogType.Info,
      `SHA for master: ${fs(await repo.getBranchSHA(MASTER))}`
    );
    repo.log(
      cmd,
      LogType.Info,
      `SHA for main: ${fs(await repo.getBranchSHA(MAIN))}`
    );
    const defaultBranch = await repo.getDefaultBranch();
    repo.log(cmd, LogType.Info, `Default branch: ${fb(defaultBranch)}`);
    if (defaultBranch !== MASTER && defaultBranch !== MAIN) {
      const defaultBranchSHA = await repo.getBranchSHA(defaultBranch);
      repo.log(
        cmd,
        LogType.Info,
        `SHA for default branch (${fb(defaultBranch)}): ${fs(defaultBranchSHA)}`
      );
    }
  }
  return Outcome.NoOp;
}

export async function create(
  repoSpec: RepoSpec,
  newBranchName: string = MAIN
): Promise<Outcome> {
  const cmd = "create";

  const repo = new Repo(repoSpec);
  repo.log(
    cmd,
    LogType.Plan,
    `Planning to create branch \`${fb(newBranchName)}\` from existing default branch.`
  );
  repo.log(cmd, LogType.Plan, `Getting current default branch name.`);
  const currentDefaultBranchName = await repo.getDefaultBranch();
  repo.log(
    cmd,
    LogType.Info,
    `Current default branch: ${currentDefaultBranchName}.`
  );

  const sourceBranchExistingSHA = await repo.getBranchSHA(
    currentDefaultBranchName
  );
  if (sourceBranchExistingSHA) {
    repo.log(
      cmd,
      LogType.Checkmark,
      `Source branch (${currentDefaultBranchName}) exists on GitHub. SHA: ${fs(sourceBranchExistingSHA)}`
    );
  }
  const newBranchExistingSHA = await repo.getBranchSHA(newBranchName);
  if (newBranchExistingSHA) {
    repo.log(
      cmd,
      LogType.OK,
      `Source branch (${fb(newBranchName)}) already exists on GitHub.`
    );
    if (newBranchExistingSHA === sourceBranchExistingSHA) {
      repo.log(
        cmd,
        LogType.OK,
        `Source branch and new branch have matching SHA.`
      );
      repo.log(cmd, LogType.Info, `No thing new to do.`);
      return Outcome.Success;
    } else {
      repo.log(
        cmd,
        LogType.Error,
        `New branch already exists on GitHub, but has a different SHA: ${fs(newBranchExistingSHA)}`
      );
      repo.log(
        cmd,
        LogType.Error,
        `Please check the branches carefully yourself.`
      );
      return Outcome.Failure;
    }
  }

  repo.log(cmd, LogType.NewLine, ``);
  repo.log(
    cmd,
    LogType.Plan,
    `Creating branch ${fb(newBranchName)} with SHA ${fs(sourceBranchExistingSHA)}`
  );
  try {
    await repo.createBranch(newBranchName, sourceBranchExistingSHA);
    repo.log(
      cmd,
      LogType.Checkmark,
      `Created branch ${fb(newBranchName)} from ${fb(currentDefaultBranchName)}`
    );
  } catch (e) {
    repo.log(cmd, LogType.Error, `Could not create branch ${fb(newBranchName)}`);
    repo.log(cmd, LogType.NewLine, ``);
    return Outcome.Failure;
  }

  repo.log(cmd, LogType.NewLine, ``);
  repo.log(
    cmd,
    LogType.Plan,
    `Verifying that ${fb(newBranchName)} has been created.`
  );
  repo.log(cmd, LogType.Plan, `Waiting 1000ms before verifying.`);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const verificationSHA = await repo.getBranchSHA(newBranchName);
  if (verificationSHA === sourceBranchExistingSHA) {
    repo.log(
      cmd,
      LogType.Checkmark,
      `Verified that the new branch exists on GitHub.`
    );
    return Outcome.Success;
  } else if (!verificationSHA) {
    repo.log(cmd, LogType.Error, `Branch creation failed.`);
    return Outcome.Failure;
  } else {
    repo.log(cmd, LogType.Error, `New branch has the incorrect SHA on GitHub!`);
    repo.log(cmd, LogType.Error, `Expected: ${fs(sourceBranchExistingSHA)}`);
    repo.log(cmd, LogType.Error, `Actual: ${fs(verificationSHA)}`);
    return Outcome.Failure;
  }
}

const DEFAULT_SET_BRANCH_ARG = MAIN;

export async function set(
  repoSpec: RepoSpec,
  newDefaultBranchName: string = DEFAULT_SET_BRANCH_ARG
): Promise<Outcome> {
  const cmd = "set";

  const repo = new Repo(repoSpec);
  repo.log(
    cmd,
    LogType.Plan,
    `Planning to set default branch to ${fb(newDefaultBranchName)}`
  );

  const currentDefaultBranch = await repo.getDefaultBranch();
  if (currentDefaultBranch === newDefaultBranchName) {
    repo.log(
      cmd,
      LogType.OK,
      `Existing default branch is: ${fb(currentDefaultBranch)}`
    );
    repo.log(cmd, LogType.Info, `Nothing new to do.`);
    return;
  }

  const newDefaultBranchNameSHA = await repo.getBranchSHA(newDefaultBranchName);
  if (!!newDefaultBranchNameSHA) {
    repo.log(
      cmd,
      LogType.Checkmark,
      `New default branch (${fb(newDefaultBranchName)}) exists on GitHub. SHA: ${fs(newDefaultBranchNameSHA)}`
    );
  } else {
    repo.log(
      cmd,
      LogType.Error,
      `🌐 New default branch (${fb(newDefaultBranchName)}) does not exist on GitHub.`
    );
    return Outcome.Failure
  }

  repo.log(cmd, LogType.NewLine, ``);
  repo.log(
    cmd,
    LogType.Plan,
    `Setting ${fb(newDefaultBranchName)} as the default branch on GitHub.`
  );
  await repo.setDefaultBranch(newDefaultBranchName);
  repo.log(cmd, LogType.Checkmark, `Success`);

  repo.log(cmd, LogType.NewLine, ``);
  repo.log(
    cmd,
    LogType.Plan,
    `Verifying that ${fb(newDefaultBranchName)} is the new default branch.`
  );
  const verificationDefaultBranch = await repo.getDefaultBranch();
  if (verificationDefaultBranch === newDefaultBranchName) {
    repo.log(cmd, LogType.Checkmark, `Verified the new default branch.`);
  } else {
    repo.log(
      cmd,
      LogType.Error,
      `Default branch on GitHub was not set successfully.`
    );
    repo.log(cmd, LogType.Error, `Expected: ${fb(newDefaultBranchName)}`);
    repo.log(cmd, LogType.Error, `Actual: ${fb(verificationDefaultBranch)}`);
    return Outcome.Failure;
  }
}

const DEFAULT_DELETE_BRANCH_ARG = MASTER;

// The name `delete` is reserved in JS, so we use `deleteBranch`.
export async function deleteBranch(
  repoSpec: RepoSpec,
  branchToDelete: string = DEFAULT_DELETE_BRANCH_ARG
): Promise<Outcome> {
  const cmd = "delete";

  const repo = new Repo(repoSpec);
  repo.log(
    cmd,
    LogType.Plan,
    `Planning to delete branch \`${fb(branchToDelete)}\` from GitHub.`
  );

  const exists = await repo.branchExists(branchToDelete);
  if (!exists) {
    repo.log(cmd, LogType.OK, `Branch (already) does not exist on GitHub!`);
    repo.log(cmd, LogType.Info, `Nothing new to do.`);
    return Outcome.NoOp;
  } else {
    repo.log(cmd, LogType.Checkmark, `Branch currently exists on GitHub.`);
    const defaultBranch = await repo.getDefaultBranch();
    if (branchToDelete !== defaultBranch) {
      repo.log(cmd, LogType.Checkmark, `Branch is not the default branch.`);
    } else {
      repo.log(cmd, LogType.Error, `Branch is currently the default branch.`);
      repo.log(
        cmd,
        LogType.Error,
        `Please set another branch as default first.`
      );
      return Outcome.Failure;
    }

    const prLink = await repo.firstPRLink(
      branchToDelete
    );
    if (!prLink) {
      repo.log(
        cmd,
        LogType.Checkmark,
        `No opn PRs have this branch as a base.`
      );
    } else {
      repo.log(cmd, LogType.Error, `There are PRs with this branch as a base.`);
      repo.log(
        cmd,
        LogType.Error,
        `Example: ${fl(prLink)}`
      );
      repo.log(
        cmd,
        LogType.Error,
        `Please change the base for these PRs before deleting ${fb(branchToDelete)}.`
      );
      return Outcome.Failure;
    }
  }

  repo.log(cmd, LogType.NewLine, ``);
  repo.log(cmd, LogType.Plan, `Deleting branch ${fb(branchToDelete)}.`);
  await repo.deleteBranch(branchToDelete);
  repo.log(cmd, LogType.Checkmark, `Branch deleted.`);

  repo.log(cmd, LogType.NewLine, ``);
  repo.log(cmd, LogType.Plan, `Verifying that ${fb(branchToDelete)} is deleted.`);
  repo.log(cmd, LogType.Plan, `Waiting 1000ms before verifying.`);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const verificationExists = await repo.branchExists(branchToDelete);
  if (!verificationExists) {
    repo.log(cmd, LogType.Checkmark, `Branch deletion verified!`);
    return Outcome.Success;
  } else {
    repo.log(
      cmd,
      LogType.Error,
      `Branch deletion failed. Branch still exists on GitHub.`
    );
    return Outcome.Failure;
  }
}

export async function replace(
  repoSpec: RepoSpec,
  newDefaultBranchName: string = MAIN
): Promise<Outcome> {
  const cmd = "replace";

  // We hardcode `master` for now.
  const branchToReplace = MASTER;

  const repo = new Repo(repoSpec);
  repo.log(
    cmd,
    LogType.Plan,
    `Planning to replace a default branch named ${fb(branchToReplace)} with a branch named \`${fb(newDefaultBranchName)}\`.`
  );

  const currentDefaultBranch = await repo.getDefaultBranch();
  if (currentDefaultBranch === newDefaultBranchName) {
    repo.log(
      cmd,
      LogType.OK,
      `The default branch is already ${fb(currentDefaultBranch)}.`
    );
    const branchToReplaceSHA = await repo.getBranchSHA(branchToReplace);
    if (branchToReplaceSHA !== null) {
      repo.log(cmd, LogType.Info, `The branch ${fb(branchToReplace)} also exists.`);
      repo.log(
        cmd,
        LogType.Info,
        `To delete it, run: main-branch delete ${repo.getName()}${
          branchToReplace === DEFAULT_DELETE_BRANCH_ARG ? "" : branchToReplace
        }`
      );
    }
    return Outcome.NoOp;
  }
  if (currentDefaultBranch !== branchToReplace) {
    repo.log(
      cmd,
      LogType.Error,
      `The current default branch is ${fb(currentDefaultBranch)}, not ${fb(branchToReplace)}.`
    );
    repo.log(
      cmd,
      LogType.Error,
      `If you'd like to run the \`${cmd}\` command for this repo, please set a master branch as default first: main-branch set ${repo.getName()}${
        currentDefaultBranch === DEFAULT_SET_BRANCH_ARG
          ? ""
          : currentDefaultBranch
      }`
    );
    repo.log(
      cmd,
      LogType.Error,
      `Note that this will leave the ${fb(currentDefaultBranch)} branch intact.`
    );
    return Outcome.Failure;
  }

  await create(repoSpec, newDefaultBranchName);
  await set(repoSpec, newDefaultBranchName);
  await updatePullsInternal(repoSpec, newDefaultBranchName, branchToReplace);
  await deleteBranch(repoSpec, branchToReplace);
  return Outcome.Success;
}


export async function listPulls(
  repoSpec: RepoSpec,
  baseBranch: string = MASTER
): Promise<Outcome> {
  const cmd = "list-pulls";
  const repo = new Repo(repoSpec);

  repo.log(cmd, LogType.Plan, `Getting pull request for with the base branch ${fb(baseBranch)}.`);
  const exists = repo.branchExists(baseBranch)
  if (exists) {
    repo.log(
      cmd,
      LogType.Info,
      `Branch ${fb(baseBranch)} exists on GitHub.`
    );
  } else {
    repo.log(
      cmd,
      LogType.OK,
      `Branch ${fb(baseBranch)} does not exist on GitHub.`
    );
    return Outcome.NoOp;
  }

  const prLinks = await repo.allPRLinks(baseBranch);
  if (prLinks.length === 0) {
    repo.log(
      cmd,
      LogType.OK,
      `No PRs with the base branch ${fb(baseBranch)}.`
    );
    return Outcome.NoOp;
  }

  repo.log(
    cmd,
    LogType.OK,
    `Found ${prLinks.length} PRs with the base branch ${fb(baseBranch)}.`
  );
  for (const prLink of prLinks) {
    repo.log(
      cmd,
      LogType.Info,
      prLink
    );
  }
  return Outcome.NoOp;
}

const UPDATE_PULLS_INTERNAL_DEFAULT_OLD_BASE_BRANCH = MASTER;
export async function updatePulls(
  repoSpec: RepoSpec,
  newBaseBranch: string = MAIN
): Promise<Outcome> {
  return updatePullsInternal(repoSpec, newBaseBranch, UPDATE_PULLS_INTERNAL_DEFAULT_OLD_BASE_BRANCH);
}

async function updatePullsInternal(
  repoSpec: RepoSpec,
  newBaseBranch,
  oldBaseBranch = UPDATE_PULLS_INTERNAL_DEFAULT_OLD_BASE_BRANCH,
): Promise<Outcome> {
  const cmd = "update-pulls";
  const repo = new Repo(repoSpec);

  repo.log(cmd, LogType.Plan, `Planning to update pull requests.`);
  repo.log(cmd, LogType.Plan, `Old base branch ${fb(oldBaseBranch)}.`);
  repo.log(cmd, LogType.Plan, `New base branch ${fb(newBaseBranch)}.`);

  const defaultBranch = await repo.getDefaultBranch();
  if (defaultBranch !== oldBaseBranch) {
    repo.log(cmd, LogType.Error, `Branch \`${fb(oldBaseBranch)}\` is not the default branch.`);
    return Outcome.Failure;
  }

  const prLink = await repo.firstPRLink(oldBaseBranch);
  if (!prLink) {
    repo.log(cmd, LogType.Info, `No PRs to update.`, prLink);
    return Outcome.NoOp;
  } else {
    repo.log(cmd, LogType.Info, `There is at least 1 PR to update.`, prLink);
  }
  
  repo.log(cmd, LogType.NewLine, ``);
  repo.log(cmd, LogType.Plan, `Updating pull requests.`);
  await repo.updatePulls(oldBaseBranch, newBaseBranch, (prLink: string): void => {
    repo.log(cmd, LogType.Info, prLink);
  });
  repo.log(cmd, LogType.Plan, `Checking that there are no PRs left.`);
  const verificationpPRLink = await repo.firstPRLink(oldBaseBranch);
  if (!!verificationpPRLink) {
    repo.log(cmd, LogType.Error, `Failed to update some PRs.`);
    return Outcome.Failure;
  } else {
    repo.log(cmd, LogType.Checkmark, `No PRs left!`);
  }
  return Outcome.Success;
}
