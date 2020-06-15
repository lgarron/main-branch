import { exit } from "process";
import "regenerator-runtime/runtime";
import { isOutcomeAnError, Outcome, parseRepo, RepoSpec } from "..";
import {
  info,
  create,
  set,
  listPulls,
  updatePulls,
  deleteBranch,
  replace,
} from "..";

function printHelp(): void {
  console.info(`
Usage: main-branch owner/repo command pre-branch post-branch
A tool to help set the main branch on GitHub.

• You can also specify a the repo for a command using its URL.
• pre-branch defaults to master.
• post-branch defaults to main.

  main-branch owner/repo info pre-branch post-branch

    Get info for specified branches of the repo.

  main-branch owner/repo create pre-branch post-branch

    Create post-branch from pre-branch.
    The current default branch must be pre-branch.

  main-branch owner/repo set pre-branch post-branch

    Set the post-branch as the default.
    The current default branch must be pre-branch.

  main-branch owner/repo delete pre-branch post-branch

    Deletes the pre-branch.
    The current default branch must be post-branch.

  main-branch owner/repo list-pulls pre-branch post-branch

    List PRs with the pre-branch as their base-branch.

  main-branch owner/repo update-pulls pre-branch post-branch

    Updates pull requests with a base of pre-branch to post-branch.

  main-branch owner/repo replace pre-branch post-branch

    Replaces the default branch pre-branch with post-branch.
    In order, this essentially does: create, set, update-pulls, replace.
`);
}

function handleExit(outcome: Outcome) {
  exit(isOutcomeAnError(outcome) ? 1 : 0);
}

async function main(): Promise<void> {
  // We assume that we're running in `node`/`ts-node`, and trim off the program and the file name.
  if (process.argv[0].indexOf("node") !== -1) {
    process.argv = process.argv.slice(1);
  }
  process.argv = process.argv.slice(1);

  if (process.argv.length < 2) {
    printHelp();
    return;
  }
  let [repo, command, preBranch, postBranch] = process.argv;
  preBranch = preBranch ?? "master";
  postBranch = postBranch ?? "main";
  const repoSpec: RepoSpec = parseRepo(repo);
  switch (command) {
    case "help":
      printHelp();
      break;
    case "info":
      handleExit(await info(repoSpec, preBranch, postBranch));
      break;
    case "create":
      handleExit(await create(repoSpec, preBranch, postBranch));
      break;
    case "set":
      handleExit(await set(repoSpec, preBranch, postBranch));
      break;
    case "list-pulls":
      handleExit(await listPulls(repoSpec, preBranch, postBranch));
      break;
    case "update-pulls":
      handleExit(await updatePulls(repoSpec, preBranch, postBranch));
      break;
    case "delete":
      handleExit(await deleteBranch(repoSpec, preBranch, postBranch));
      break;
    case "replace":
      handleExit(await replace(repoSpec, preBranch, postBranch));
      break;
    default:
      printHelp();
  }
}

main();
