// Compatibility entry point: all tests use their own ephemeral-port server.
const child = Bun.spawn({
  cmd: [process.execPath, "test", "src/presence.test.ts", "server.test.ts"],
  cwd: import.meta.dir,
  stdout: "inherit",
  stderr: "inherit",
});
process.exitCode = await child.exited;
