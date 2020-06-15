import "regenerator-runtime/runtime";

// This doesn't seem to work in this project. :-(
// export * from "..";

// So we do this instead.
import * as MainBranch from ".."
module.exports = MainBranch;
