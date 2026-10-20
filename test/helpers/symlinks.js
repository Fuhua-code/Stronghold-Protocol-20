import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Windows without Developer Mode/admin cannot create symlinks (EPERM); those tests are skipped there. */
export const SYMLINKS_SUPPORTED = (() => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-symlink-target-'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-symlink-probe-'));
  try {
    fs.symlinkSync(target, path.join(dir, 'probe'), 'dir');
    return true;
  } catch {
    return false;
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
    try { fs.rmSync(target, { recursive: true, force: true }); } catch { /* best effort */ }
  }
})();

export const NO_SYMLINK = SYMLINKS_SUPPORTED ? {} : { skip: 'symbolic links need Windows Developer Mode' };
