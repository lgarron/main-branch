import { exit } from "process";
import "regenerator-runtime/runtime";
import { create, deleteBranch, info, isOutcomeAnError, Outcome, parseRepo, replace, RepoSpec, set } from "..";
import { listPulls, updatePulls } from "../cmd";

function printHelp(): void {
  console.info("Usage: main-branch owner/repo command ...");
  console.info("A tool to help set the main branch on GitHub.");
  console.info("");
  console.info("  main-branch owner/repo info");
  console.info("  main-branch owner/repo info [branch]");
  console.info("");
  console.info("    Get info for entire repo, or the given branch.");
  console.info("");
  console.info("  main-branch owner/repo set ");
  console.info("  main-branch owner/repo set [branch]");
  console.info("");
  console.info("    Set the given branch as the default.");
  console.info("    Creates the branch if it doesn't exist yet.");
  console.info("    Defaults to `main` for the branch.");
  console.info("");
  console.info("  main-branch owner/repo create ");
  console.info("  main-branch owner/repo create [branch]");
  console.info("");
  console.info("    Create the branch from the current default branch.");
  console.info("    Defaults to `main` for the new branch.");
  console.info("");
  console.info("  main-branch owner/repo delete ");
  console.info("  main-branch owner/repo delete [branch]");
  console.info("");
  console.info("    Delete the given branch from the current default branch.");
  console.info("    Defaults to `master` for the branch to delete.");
  console.info("");
  console.info("  main-branch owner/repo replace ");
  console.info("  main-branch owner/repo replace [branch]");
  console.info("");
  console.info("    Replaces the default branch with given branch.");
  console.info("    In order, this essentially does: create, update-pulls, set, replace.");
  console.info("    Requires the default branch to start out as `master`.");
  console.info("    Defaults to `main` for the replacement branch.");
  console.info("");
  console.info("  main-branch owner/repo list-pulls");
  console.info("  main-branch owner/repo list-pulls [branch]");
  console.info("");
  console.info("    List PRs with the given base branch.");
  console.info("    Defaults to `master` for the base branch.");
  console.info("");
  console.info("  main-branch owner/repo update-pulls");
  console.info("  main-branch owner/repo update-pulls [branch]");
  console.info("");
  console.info("    Updates base for pull requests with the default branch to the given branch.");
  console.info("    Requires the default branch to be `master`.");
  console.info("    Defaults to `main` for the replacement branch.");
  console.info("");
  console.info("You can also specify a the repo for a command using its URL.");
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
  const [repo, command, ...args] = process.argv;
  const repoSpec: RepoSpec = parseRepo(repo);
  switch (command) {
    case "help":
      printHelp();
      break;
      case "info":
        handleExit(await info(repoSpec, ...args));
        break;
    case "create":
      handleExit(await create(repoSpec, ...args));
      break;
    case "set":
      handleExit(await set(repoSpec, ...args));
      break;
    case "delete":
      handleExit(await deleteBranch(repoSpec, ...args));
      break;
    case "replace":
      handleExit(await replace(repoSpec, ...args));
      break;
    case "list-pulls":
      handleExit(await listPulls(repoSpec, ...args));
      break;
    case "update-pulls":
      handleExit(await updatePulls(repoSpec, ...args));
      break;
    default:
      printHelp();
  }
}

main();
