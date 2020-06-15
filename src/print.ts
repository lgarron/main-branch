import * as Color from "colors";
import { guessEnvironment, Environment } from "./env";

export function format(
  colorName: "blue" | "yellow" | "underline"
): (branchName: string) => string {
  return (branchName: string) => {
    switch (guessEnvironment()) {
      case Environment.NodeJS:
        return Color[colorName](branchName);
      case Environment.Browser:
        return branchName;
    }
  };
}

// Format branch for printing
export const formatBranch = format("blue");
// Format SHA for printing
export const formatSHA = format("yellow");
// Format link for printing
export const formatLink = format("underline");
