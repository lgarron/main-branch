import { AuthStorage, info, parseRepo, setAuthStorage } from "../../index";
import { addLogListener } from "../../log";

window.addEventListener("DOMContentLoaded", async () => {

  const console = document.body.querySelector("#console");
  addLogListener((...args) => {
    console.textContent += args.join(" ") + "\n";
  })

  info(parseRepo("https://github.com/cubing/fmc-duel"))
})
