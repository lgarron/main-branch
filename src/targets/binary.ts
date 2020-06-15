import { exit } from "process";
import "regenerator-runtime/runtime";
import { AuthStorage, create, deleteBranch, info, isOutcomeAnError, Outcome, parseRepo, replace, RepoSpec, set, setAuthStorage } from "../index";

setAuthStorage(AuthStorage.LocalStorage)

function printHelp(): void {
  console.info("Usage: main-branch command owner/repo ...");
  console.info("A tool to help set the main branch on GitHub.");
  console.info("");
  console.info("  main-branch info owner/repo");
  console.info("  main-branch info owner/repo [branch]");
  console.info("");
  console.info("    Get info for entire repo, or the given branch.");
  console.info("");
  console.info("  main-branch set owner/repo ");
  console.info("  main-branch set owner/repo [branch]");
  console.info("");
  console.info("    Set the given branch as the default.");
  console.info("    Creates the branch if it doesn't exist yet.");
  console.info("    Defaults to `main` for the branch.");
  console.info("");
  console.info("  main-branch create owner/repo ");
  console.info("  main-branch create owner/repo [branch]");
  console.info("");
  console.info("    Create the branch from the current default branch.");
  console.info("    Defaults to `main` for the new branch.");
  console.info("");
  console.info("  main-branch delete owner/repo ");
  console.info("  main-branch delete owner/repo [branch]");
  console.info("");
  console.info("    Delete the given branch from the current default branch.");
  console.info("    Defaults to `master` for the branch to delete.");
  console.info("");
  console.info("  main-branch replace owner/repo ");
  console.info("  main-branch replace owner/repo [branch]");
  console.info("");
  console.info("    Replaces the default branch with given branch.");
  console.info("    Requires the default branch to start out as `master`.");
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
  const [command, repo, ...args] = process.argv;
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
    default:
      printHelp();
  }
}

main();
