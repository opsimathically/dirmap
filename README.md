# dirmap

Recurse through the filesystem, stat and map individual files, directories,
and devices, and store them within relevant maps as a file-info type, containing
relevant permissions information for the current user, other users, etc. Developers
determine what to map using callbacks; if no callback is provided, everything
found will be mapped.

Map some, map none, map all, or just operate on individual files via callbacks
individually. This code is useful for finding things like bad security permissions
which could lead to system security problems, finding arbitrary files, finding files
of certain sizes, md5 hashing files, etc. Subsequent runs on multiple directories
will compound the maps so that one object can store multiple directory recursions.

To empty all the maps, reset state, and start fresh, use the dirmap.reset() method.
Call dirmap.stop() from within found/fail callback to stop recursing.
This code was designed to work on Linux.

## Install

```bash
npm install @opsimathically/dirmap
```

## Building from source

This package is intended to be run via npm, but if you'd like to build from source,
clone this repo, enter directory, and run `npm install` for dev dependencies, then run
`npm run build`.

## Usage

```typescript
import { DirMap, file_info_t } from '@opsimathically/dirmap';

(async function () {
  /*
  Entries are mapped via a filesystem absolute path as key and can be accessed via
  individual maps shown below.  Maps are separated by type to reduce the work a developer
  would need to do to make this code useful for their specific tasks.
  
  // this map holds all entries of all types
  dirmap.result_map

  // these maps hold only specific types
  dirmap.directory_map
  dirmap.block_dev_map
  dirmap.char_dev_map
  dirmap.fifo_map
  dirmap.file_map
  dirmap.socket_map
  dirmap.symlink_map
  dirmap.other_map
  */

  // create a new dirmap, execute it against the etc directory, map
  // all files and create md5 hashes.  No callback provided.
  const dirmap = new DirMap();
  await dirmap.run({
    base_dir: '/etc/',
    options: {
      generate_file_md5s: true
    }
  });

  // run dirmap again against /dev/ without resetting.  The results of
  // both runs will be within the dirmap map sets.  This time we do not
  // md5 discovered files since the option was not provided.
  await dirmap.run({
    base_dir: '/dev/'
  });

  // reset the maps to empty them all out and start fresh
  dirmap.reset();

  // run dirmap using a found callback.  This allows us to filter what gets
  // mapped and what doesn't.  In this case, we're just looking for the /etc/hosts
  // file.  Since we return true from the callback, only on this file, all of our
  // maps will only contain this single entry.  You an filter any file(s) you'd like,
  // just return true when a file matches your desired criteria, and it will be mapped.
  //
  // We use this.stop() to stop recursion after the file is found.
  //
  await dirmap.run({
    base_dir: '/etc/',
    onfoundcb: async function (this: DirMap, file_info: file_info_t) {
      if (file_info.absolute_path === '/etc/hosts') {
        this.stop();
        return true;
      }
      return false;
    }
  });

  // You can also supply a fail callback, that will let you determine what failed to
  // map due to whatever error.  We use any for the error as we can get arbitrary error
  // codes from arbitrary systems.
  await dirmap.run({
    base_dir: '/root/',
    onfoundcb: async function (this: DirMap, file_info: file_info_t) {
      return false;
    },
    onfailcb: async function (this: DirMap, absolute_path: string, err: any) {
      console.log(`Could not map: ${absolute_path}`);
      return false;
    }
  });
})();
```
