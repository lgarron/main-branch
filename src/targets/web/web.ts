import "regenerator-runtime/runtime";

import { addLogListener, create, info, parseRepo, RepoSpec } from "../..";
import { deleteBranch, replace, set } from "../../cmd";

enum LocalStorageKey {
  PAT = "github-personal-access-token",
  Repo = "main-branch-saved-repo"
}

window.addEventListener("DOMContentLoaded", async () => {
  const repoElem = document.body.querySelector("#repo") as HTMLInputElement;
  if (LocalStorageKey.Repo in localStorage && !repoElem.value) {
    repoElem.value = localStorage[LocalStorageKey.Repo];
  }
  repoElem.addEventListener("change", () => {
    localStorage["main-branch-saved-repo"] = repoElem.value;
  })
  repoElem.addEventListener("keyup", () => {
    localStorage["main-branch-saved-repo"] = repoElem.value;
  })

  document.body.querySelector("#setPAT").addEventListener("click", () => {
    const newPAT = prompt("Enter a personal access token from GitHub");
    if (newPAT) {
      localStorage[LocalStorageKey.PAT] = newPAT;
      console.log(`Stored new PAT ${newPAT.length}`);
    } else {
      console.error("Did not get new PAT successfully.");
    }
  });

  document.body.querySelector("#checkPAT").addEventListener("click", () => {
    const len: number = (localStorage[LocalStorageKey.PAT] ?? "").length;
    if (len == 40) {
      alert(`Personal access token IS set (with 40 chars, as expected).`);
    } else if (len > 0) {
      alert(`Personal access token IS set, with wrong number of chars (${40}) expected, ${len} actual).`);
    } else {
      alert(`Personal access token IS NOT set.`);
    }
  });

  document.body.querySelector("#clearPAT").addEventListener("click", () => {
    delete localStorage[LocalStorageKey.PAT];
    alert("PAT has been cleared from local storage");
  });

  const consoleElem = document.body.querySelector("#console");
  addLogListener((...args) => {
    consoleElem.textContent += args.join(" ") + "\n";
    consoleElem.scrollTop = consoleElem.scrollHeight
  })

  function getRepo(): RepoSpec {
    return parseRepo(repoElem.value);
  }
  
  const commandsElem = document.querySelector("#commands");

  function registerCommand(selector: string, fn): void {
    const commandElem = commandsElem.querySelector(selector);
    commandElem.addEventListener("click", () => {
      const branch = (commandElem.parentElement.querySelector(".branch") as HTMLInputElement).value;
      if (branch) {
        fn(getRepo(), branch)
      } else {
        fn(getRepo())
      }
    })

  }

  registerCommand("#info", info);
  registerCommand("#create", create);
  registerCommand("#set", set);
  registerCommand("#replace", replace);
  registerCommand("#delete", deleteBranch);
});
