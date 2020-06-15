import "regenerator-runtime/runtime";
import {
  addLogListener,
  create,
  deleteBranch,
  info,
  listPulls,
  parseRepo,
  replace,
  RepoSpec,
  set,
  updatePulls,
} from "../..";

enum LocalStorageKey {
  PAT = "github-personal-access-token",
  Repo = "main-branch-saved-repo",
}

window.addEventListener(
  "DOMContentLoaded",
  async (): Promise<void> => {
    const repoElem = document.body.querySelector("#repo") as HTMLInputElement;
    if (LocalStorageKey.Repo in localStorage && !repoElem.value) {
      repoElem.value = localStorage[LocalStorageKey.Repo];
    }
    repoElem.addEventListener("change", (): void => {
      localStorage["main-branch-saved-repo"] = repoElem.value;
    });
    repoElem.addEventListener("keyup", (): void => {
      localStorage["main-branch-saved-repo"] = repoElem.value;
    });

    document.body
      .querySelector("#setPAT")
      .addEventListener("click", (): void => {
        const newPAT = prompt("Enter a personal access token from GitHub");
        if (newPAT) {
          localStorage[LocalStorageKey.PAT] = newPAT;
          console.log(`Stored new PAT ${newPAT.length}`);
        } else {
          console.error("Did not get new PAT successfully.");
        }
      });

    document.body
      .querySelector("#checkPAT")
      .addEventListener("click", (): void => {
        const len: number = (localStorage[LocalStorageKey.PAT] ?? "").length;
        if (len == 40) {
          alert(`Personal access token IS set (with 40 chars, as expected).`);
        } else if (len > 0) {
          alert(
            `Personal access token IS set, with wrong number of chars (${40}) expected, ${len} actual).`
          );
        } else {
          alert(`Personal access token IS NOT set.`);
        }
      });

    document.body
      .querySelector("#clearPAT")
      .addEventListener("click", (): void => {
        delete localStorage[LocalStorageKey.PAT];
        alert("Personal access token has been cleared from local storage");
      });

    const consoleElem = document.body.querySelector("#console");
    const log = (...args): void => {
      consoleElem.textContent += args.join(" ") + "\n";
      consoleElem.scrollTop = consoleElem.scrollHeight;
    };
    addLogListener(log);

    function getRepo(): RepoSpec {
      return parseRepo(repoElem.value);
    }

    const commandsElem = document.querySelector("#commands");

    const preBranchElem = document.querySelector(
      "#pre-branch"
    ) as HTMLInputElement;
    const postBranchElem = document.querySelector(
      "#post-branch"
    ) as HTMLInputElement;

    function registerCommand(selector: string, fn): void {
      const commandElem = commandsElem.querySelector(selector);
      commandElem.addEventListener(
        "click",
        async (): Promise<void> => {
          await fn(
            getRepo(),
            preBranchElem.value === "" ? "master" : preBranchElem.value,
            postBranchElem.value === "" ? "main" : postBranchElem.value
          );
          log("--------------------------------");
        }
      );
    }

    registerCommand("#info", info);
    registerCommand("#create", create);
    registerCommand("#set", set);
    registerCommand("#list-pulls", listPulls);
    registerCommand("#update-pulls", updatePulls);
    registerCommand("#replace", replace);
    registerCommand("#delete", deleteBranch);
  }
);
