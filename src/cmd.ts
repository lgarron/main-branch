import { log, LogType } from "./log";
import { PRSearchResult, Repo, RepoSpec } from "./repo";

const MASTER = "master";
const MAIN = "main";

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
    repo.log(cmd, LogType.Plan, `Getting info about the branch ${infoBranch}.`);
    repo.log(
      cmd,
      LogType.Info,
      `SHA for branch: ${await repo.getBranchSHA(infoBranch)}`
    );
    const defaultBranch = await repo.getDefaultBranch();
    repo.log(
      cmd,
      LogType.Info,
      `${infoBranch} ${
        defaultBranch === infoBranch ? "IS" : "IS NOT"
      } the default branch.`
    );
    const prSearchResult: PRSearchResult = await repo.anyPullRequestWithBaseBranch(
      infoBranch
    );
    if (prSearchResult.firstFoundPRLink) {
      repo.log(
        cmd,
        LogType.Info,
        `There are PRs with this branch as a base (searched ${prSearchResult.numOpenPRsChecked} open PRs).`
      );
      repo.log(
        cmd,
        LogType.Info,
        `Link to an example PR with this base: ${prSearchResult.firstFoundPRLink}`
      );
    } else {
      repo.log(
        cmd,
        LogType.Info,
        `There are no PRs with this branch as a base (searched ${prSearchResult.numOpenPRsChecked} open PRs).`
      );
    }
  } else {
    repo.log(cmd, LogType.Plan, `Getting info about the repo.`);
    repo.log(
      cmd,
      LogType.Info,
      `SHA for master: ${await repo.getBranchSHA(MASTER)}`
    );
    repo.log(
      cmd,
      LogType.Info,
      `SHA for main: ${await repo.getBranchSHA(MAIN)}`
    );
    const defaultBranch = await repo.getDefaultBranch();
    repo.log(cmd, LogType.Info, `Default branch: ${defaultBranch}`);
    if (defaultBranch !== MASTER && defaultBranch !== MAIN) {
      const defaultBranchSHA = await repo.getBranchSHA(defaultBranch);
      repo.log(
        cmd,
        LogType.Info,
        `SHA for default branch (${defaultBranch}): ${defaultBranchSHA}`
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
    `Planning to create branch \`${newBranchName}\` from existing default branch.`
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
      `Source branch (${currentDefaultBranchName}) exists on GitHub. SHA: ${sourceBranchExistingSHA}`
    );
  }
  const newBranchExistingSHA = await repo.getBranchSHA(newBranchName);
  if (newBranchExistingSHA) {
    repo.log(
      cmd,
      LogType.OK,
      `Source branch (${newBranchName}) already exists on GitHub.`
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
        `New branch already exists on GitHub, but has a different SHA: ${newBranchExistingSHA}`
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
    `Creating branch ${newBranchName} with SHA ${sourceBranchExistingSHA}`
  );
  try {
    await repo.createBranch(newBranchName, sourceBranchExistingSHA);
    repo.log(
      cmd,
      LogType.Checkmark,
      `Created branch ${newBranchName} from ${currentDefaultBranchName}`
    );
  } catch (e) {
    repo.log(cmd, LogType.Error, `Could not create branch ${newBranchName}`);
    repo.log(cmd, LogType.NewLine, ``);
    return Outcome.Failure;
  }

  repo.log(cmd, LogType.NewLine, ``);
  repo.log(
    cmd,
    LogType.Plan,
    `Verifying that ${newBranchName} has been created.`
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
    repo.log(cmd, LogType.Error, `Expected: ${sourceBranchExistingSHA}`);
    repo.log(cmd, LogType.Error, `Actual: ${verificationSHA}`);
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
    `Planning to set default branch to ${newDefaultBranchName}`
  );

  const currentDefaultBranch = await repo.getDefaultBranch();
  if (currentDefaultBranch === newDefaultBranchName) {
    repo.log(
      cmd,
      LogType.OK,
      `Existing default branch is: ${currentDefaultBranch}`
    );
    repo.log(cmd, LogType.Info, `Nothing new to do.`);
    return;
  }

  const newDefaultBranchNameSHA = await repo.getBranchSHA(newDefaultBranchName);
  if (!!newDefaultBranchNameSHA) {
    repo.log(
      cmd,
      LogType.Checkmark,
      `New default branch (${newDefaultBranchName}) exists on GitHub. SHA: ${newDefaultBranchNameSHA}`
    );
  } else {
    repo.log(
      cmd,
      LogType.Error,
      `🌐 New default branch (${newDefaultBranchName}) does not exist on GitHub.`
    );
    return Outcome.Failure
    // repo.log(cmd, LogType.Plan, `🌐 Creating branch ${newDefaultBranchName}.`);
    // const outcome = await create(repo.getSpec(), newDefaultBranchName);
    // if (isOutcomeAnError(outcome)) {
    //   return outcome;
    // }
  }

  repo.log(cmd, LogType.NewLine, ``);
  repo.log(
    cmd,
    LogType.Plan,
    `Setting ${newDefaultBranchName} as the default branch on GitHub.`
  );
  await repo.setDefaultBranch(newDefaultBranchName);
  repo.log(cmd, LogType.Checkmark, `Success`);

  repo.log(cmd, LogType.NewLine, ``);
  repo.log(
    cmd,
    LogType.Plan,
    `Verifying that ${newDefaultBranchName} is the new default branch.`
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
    repo.log(cmd, LogType.Error, `Expected: ${newDefaultBranchName}`);
    repo.log(cmd, LogType.Error, `Actual: ${verificationDefaultBranch}`);
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
    `Planning to delete branch \`${branchToDelete}\` from GitHub.`
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

    const prSearchResult = await repo.anyPullRequestWithBaseBranch(
      branchToDelete
    );
    if (!prSearchResult.firstFoundPRLink) {
      repo.log(
        cmd,
        LogType.Checkmark,
        `No PRs found with this branch as a base (searched ${prSearchResult.numOpenPRsChecked} open PRs).`
      );
    } else {
      repo.log(cmd, LogType.Error, `There are PRs with this branch as a base.`);
      repo.log(
        cmd,
        LogType.Error,
        `Example: ${prSearchResult.firstFoundPRLink}`
      );
      repo.log(
        cmd,
        LogType.Error,
        `Please change the base for these PRs before deleting ${branchToDelete}.`
      );
      return Outcome.Failure;
    }
  }

  repo.log(cmd, LogType.NewLine, ``);
  repo.log(cmd, LogType.Plan, `Deleting branch ${branchToDelete}.`);
  await repo.deleteBranch(branchToDelete);
  repo.log(cmd, LogType.Checkmark, `Branch deleted.`);

  repo.log(cmd, LogType.NewLine, ``);
  repo.log(cmd, LogType.Plan, `Verifying that ${branchToDelete} is deleted.`);
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
    `Planning to replace a default branch named ${branchToReplace} with a branch named \`${newDefaultBranchName}\`.`
  );

  const currentDefaultBranch = await repo.getDefaultBranch();
  if (currentDefaultBranch === newDefaultBranchName) {
    repo.log(
      cmd,
      LogType.OK,
      `The default branch is already ${currentDefaultBranch}.`
    );
    const branchToReplaceSHA = await repo.getBranchSHA(branchToReplace);
    if (branchToReplaceSHA !== null) {
      repo.log(cmd, LogType.Info, `The branch ${branchToReplace} also exists.`);
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
      `The current default branch is ${currentDefaultBranch}, not ${branchToReplace}.`
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
      `Note that this will leave the ${currentDefaultBranch} branch intact.`
    );
    return Outcome.Failure;
  }

  await create(repoSpec, newDefaultBranchName);
  await set(repoSpec, newDefaultBranchName);
  await deleteBranch(repoSpec, branchToReplace);
  return Outcome.Success;
}
