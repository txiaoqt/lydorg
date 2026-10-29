// NON-RUNNABLE — NOT AUTHORIZED. Harmless IPC-only synthetic test child.
// No CLI mode, external observation, credentials or production module import.
import { createSyntheticInvocation } from './disposable-ledger.mjs';
if (typeof process.send !== 'function' || !process.connected || process.argv.length !== 2) {
  process.exitCode = 2;
} else {
  const watchdog = setTimeout(() => process.exit(4), 12000);
  process.once('disconnect', () => process.exit(3));
  process.once('message', async message => {
    let monitor;
    try {
      if (!message || message.kind !== 'SYNTHETIC_RUN' ||
        Object.keys(message).sort().join('|') !== 'kind|options') throw Error('INVALID_FIXTURE_COMMAND');
      const invocation = createSyntheticInvocation(message.options);
      let sentHold = false;
      monitor = setInterval(() => {
        const current = invocation.snapshot();
        if (!sentHold && current.phase.startsWith('HELD_')) {
          sentHold = true;
          process.send({ kind: 'HELD', snapshot: current });
        }
      }, 5);
      const result = await invocation.run();
      clearInterval(monitor); clearTimeout(watchdog);
      process.send({ kind: 'RESULT', result }, () => process.exit(0));
    } catch {
      clearInterval(monitor); clearTimeout(watchdog);
      process.send({ kind: 'CHILD_STOPPED' }, () => process.exit(2));
    }
  });
  process.send({ kind: 'READY' });
}
