import { cp, lstat, mkdir, rename, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const scaffold = path.resolve(scriptDirectory, "../scaffolds/career-vault");
const destination = path.resolve(process.cwd(), "career-vault");

try {
  await lstat(destination);
  console.error(`Refusing to overwrite existing path: ${destination}`);
  process.exitCode = 1;
} catch (error) {
  if (error.code !== "ENOENT") throw error;

  await cp(scaffold, destination, { recursive: true, errorOnExist: true });
  await rename(path.join(destination, "gitignore.template"), path.join(destination, ".gitignore"));
  await mkdir(path.join(destination, "cvs"), { recursive: true });
  await rename(
    path.join(destination, "cvs-guide.template.md"),
    path.join(destination, "cvs/README.md"),
  );
  const git = spawnSync("git", ["init", "--initial-branch=main"], {
    cwd: destination,
    encoding: "utf8",
  });

  if (git.error || git.status !== 0) {
    await rm(destination, { recursive: true, force: true });
    const detail = git.error?.message ?? git.stderr.trim() ?? "unknown Git error";
    throw new Error(`Could not initialize career-vault: ${detail}`);
  }

  console.log(`Created a private career vault at ${destination}`);
  console.log("\nNext steps:");
  console.log("  cd career-vault");
  console.log("  git remote add origin <private-repository-url>");
  console.log("  git add .");
  console.log('  git commit -m "Initialize career vault"');
  console.log("  git push -u origin main");
}
