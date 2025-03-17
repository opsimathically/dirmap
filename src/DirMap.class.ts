/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createHash } from 'crypto';
import { createReadStream } from 'fs';

import {
  onfailcb_t,
  onfoundcb_t,
  file_or_dir_fail_info_t,
  entity_types_t,
  file_info_t,
  all_permissions_t
} from './types';

export default class DirMap {
  state: 'unstarted' | 'running' | 'stopped' = 'unstarted';
  failure_map = new Map<string, file_or_dir_fail_info_t>();

  // maps corresponding to different types/all entries
  result_map = new Map<string, file_info_t>();
  directory_map = new Map<string, file_info_t>();
  block_dev_map = new Map<string, file_info_t>();
  char_dev_map = new Map<string, file_info_t>();
  fifo_map = new Map<string, file_info_t>();
  file_map = new Map<string, file_info_t>();
  socket_map = new Map<string, file_info_t>();
  symlink_map = new Map<string, file_info_t>();
  other_map = new Map<string, file_info_t>();

  // process uid/gid info
  process_uid = os.userInfo().uid;
  process_gid = os.userInfo().gid;

  // counters
  total_file_size: number = 0;

  constructor() {}

  // resets all maps
  reset() {
    this.state = 'unstarted';
    this.failure_map = new Map<string, file_or_dir_fail_info_t>();
    this.result_map = new Map<string, file_info_t>();
    this.directory_map = new Map<string, file_info_t>();
    this.block_dev_map = new Map<string, file_info_t>();
    this.char_dev_map = new Map<string, file_info_t>();
    this.fifo_map = new Map<string, file_info_t>();
    this.file_map = new Map<string, file_info_t>();
    this.socket_map = new Map<string, file_info_t>();
    this.symlink_map = new Map<string, file_info_t>();
    this.other_map = new Map<string, file_info_t>();
    this.total_file_size = 0;
  }

  // set state marker to stopped, which should stop the loop
  stop() {
    this.state = 'stopped';
  }

  // hash a file using md5
  async md5HashFileFromUsingStreams(filePath: string) {
    const wait_promise = new Promise((resolve, reject) => {
      const hash = createHash('md5');
      const stream = createReadStream(filePath);
      stream.on('error', (err) => reject(err));
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
    return await wait_promise;
  }

  // this will examine a file/directory/device and add it to corresponding maps.
  async addEntryToMaps(
    base_starting_directory: string,
    file_or_directory: string,
    generate_file_md5s: boolean,
    onfoundcb?: onfoundcb_t,
    onfailcb?: onfailcb_t
  ) {
    const dirmap_ref = this;
    let stats;
    let stat_error: any = null;
    const absolute_path = path.resolve(file_or_directory);
    const file_or_dir_name = path.basename(absolute_path);
    const file_or_dir_path = path.dirname(absolute_path);

    try {
      stats = await fs.stat(file_or_directory);
    } catch (err) {
      stat_error = err;
      if (onfailcb) await onfailcb(absolute_path, err);
      dirmap_ref.failure_map.set(absolute_path, {
        absolute_path: absolute_path,
        error: err
      });
    }

    if (stat_error) {
      return {
        err: stat_error
      };
    }
    if (!stats) {
      return {
        err: stat_error
      };
    }

    const entity_types: entity_types_t = {
      is_dir: stats.isDirectory(),
      is_block_dev: stats.isBlockDevice(),
      is_char_dev: stats.isCharacterDevice(),
      is_fifo: stats.isFIFO(),
      is_file: stats.isFile(),
      is_socket: stats.isSocket(),
      is_symlink: stats.isSymbolicLink()
    };

    const permissions: all_permissions_t = {
      owner: {
        readable: !!(stats.mode & 0o400),
        writable: !!(stats.mode & 0o200),
        executable: !!(stats.mode & 0o100),
        suid: !!(stats.mode & 0o4000),
        guid: !!(stats.mode & 0o2000),
        sticky: !!(stats.mode & 0o1000)
      },
      group: {
        readable: !!(stats.mode & 0o040),
        writable: !!(stats.mode & 0o020),
        executable: !!(stats.mode & 0o010),
        suid: false,
        guid: false,
        sticky: false
      },
      others: {
        readable: !!(stats.mode & 0o004),
        writable: !!(stats.mode & 0o002),
        executable: !!(stats.mode & 0o001),
        suid: false,
        guid: false,
        sticky: false
      },
      processUser: {
        readable:
          stats.uid === dirmap_ref.process_uid || !!(stats.mode & 0o004),
        writable:
          stats.uid === dirmap_ref.process_uid || !!(stats.mode & 0o002),
        executable:
          stats.uid === dirmap_ref.process_uid || !!(stats.mode & 0o001),
        suid: !!(stats.mode & 0o4000),
        guid: !!(stats.mode & 0o2000),
        sticky: !!(stats.mode & 0o1000)
      },
      sticky: !!(stats.mode & 0o1000)
    };

    let file_md5;
    if (generate_file_md5s)
      if (entity_types.is_file)
        file_md5 = await dirmap_ref.md5HashFileFromUsingStreams(absolute_path);

    const file_info: file_info_t = {
      name: file_or_dir_name,
      raw_stats: JSON.parse(JSON.stringify(stats)),
      type_info: entity_types,
      file_md5: file_md5,
      permissions: permissions,
      absolute_path: absolute_path,
      relative_path: absolute_path.slice(base_starting_directory.length),
      base_path: base_starting_directory,
      file_or_dir_path: file_or_dir_path,
      owner: { uid: stats.uid, gid: stats.gid },
      process: { uid: dirmap_ref.process_uid, gid: dirmap_ref.process_gid },
      extra: {}
    };

    // run found cb if we have one
    let found_cb_result: any = true;
    if (onfoundcb) found_cb_result = await onfoundcb(file_info);
    if (found_cb_result) {
      dirmap_ref.result_map.set(absolute_path, file_info);
      let type_discovered: boolean = false;
      if (entity_types.is_dir) {
        dirmap_ref.directory_map.set(absolute_path, file_info);
        type_discovered = true;
      }
      if (entity_types.is_block_dev) {
        dirmap_ref.block_dev_map.set(absolute_path, file_info);
        type_discovered = true;
      }
      if (entity_types.is_char_dev) {
        dirmap_ref.char_dev_map.set(absolute_path, file_info);
        type_discovered = true;
      }
      if (entity_types.is_fifo) {
        dirmap_ref.fifo_map.set(absolute_path, file_info);
        type_discovered = true;
      }
      if (entity_types.is_file) {
        dirmap_ref.file_map.set(absolute_path, file_info);
        dirmap_ref.total_file_size += file_info.raw_stats.size;
        type_discovered = true;
      }
      if (entity_types.is_socket) {
        dirmap_ref.socket_map.set(absolute_path, file_info);
        type_discovered = true;
      }
      if (entity_types.is_symlink) {
        dirmap_ref.symlink_map.set(absolute_path, file_info);
        type_discovered = true;
      }
      if (!type_discovered) {
        dirmap_ref.other_map.set(absolute_path, file_info);
      }
    }
    return file_info;
  }

  // recurse through filesystem from a provided directory and analyze/map entries.
  async run(params: {
    base_dir: string;
    options?: {
      generate_file_md5s?: boolean;
    };
    onfoundcb?: onfoundcb_t;
    onfailcb?: onfailcb_t;
  }): Promise<boolean> {
    // set self reference
    const dirmap_ref = this;
    if (this.state !== 'unstarted') return false;

    // bind this on callbacks if they're present
    if (params.onfoundcb) params.onfoundcb = params.onfoundcb.bind(dirmap_ref);
    if (params.onfailcb) params.onfailcb = params.onfailcb.bind(dirmap_ref);

    // define starting dir
    const starting_dir = path.resolve(params.base_dir);

    await dirmap_ref.addEntryToMaps(
      starting_dir,
      starting_dir,
      params?.options?.generate_file_md5s ? true : false,
      params.onfoundcb,
      params.onfailcb
    );

    // this function will recurse through all directories and examine all files
    async function recurse(current_dir: string): Promise<void> {
      if (dirmap_ref.state === 'stopped') return;

      const current_dir_info = await dirmap_ref.addEntryToMaps(
        starting_dir,
        current_dir,
        params?.options?.generate_file_md5s ? true : false,
        params.onfoundcb,
        params.onfailcb
      );
      if (!current_dir_info) return;
      if ('err' in current_dir_info) return;

      let entries;

      try {
        entries = await fs.readdir(current_dir, { withFileTypes: true });
      } catch (err) {
        if (params.onfailcb) {
          await params.onfailcb(current_dir_info.absolute_path, err);
        }
        dirmap_ref.failure_map.set(current_dir_info.absolute_path, {
          absolute_path: current_dir_info.absolute_path,
          error: err
        });
        return;
      }

      for (const entry of entries) {
        const current_entry_absolute_path = path.resolve(
          path.join(current_dir, entry.name)
        );

        const current_entry_info = await dirmap_ref.addEntryToMaps(
          starting_dir,
          current_entry_absolute_path,
          params?.options?.generate_file_md5s ? true : false,
          params.onfoundcb,
          params.onfailcb
        );
        if (!current_entry_info) continue;
        if ('err' in current_entry_info) continue;
        if (!current_entry_info.type_info.is_dir) continue;
        await recurse(current_entry_info.absolute_path);
      }
    }
    await recurse(starting_dir);
    this.state = 'unstarted';
    return true;
  }
}
