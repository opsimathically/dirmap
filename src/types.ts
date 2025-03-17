/* eslint-disable @typescript-eslint/no-explicit-any */

export type entity_types_t = {
  is_dir: boolean;
  is_block_dev: boolean;
  is_char_dev: boolean;
  is_fifo: boolean;
  is_file: boolean;
  is_socket: boolean;
  is_symlink: boolean;
};

export type permissions_t = {
  readable: boolean;
  writable: boolean;
  executable: boolean;
  suid: boolean;
  guid: boolean;
  sticky: boolean;
};

export type all_permissions_t = {
  owner: permissions_t;
  group: permissions_t;
  others: permissions_t;
  processUser: permissions_t;
  sticky: boolean;
};

export type file_info_t = {
  name: string;
  raw_stats: any;
  type_info: entity_types_t;
  file_md5?: string | undefined | unknown;
  permissions: all_permissions_t;
  absolute_path: string;
  relative_path: string;
  base_path: string;
  file_or_dir_path: string;
  owner: { uid: number; gid: number };
  process: { uid: number; gid: number };
  extra: any;
};

export type file_or_dir_fail_info_t = {
  absolute_path: string;
  error: any;
};

export type file_info_result_t = {
  starting_dir: string;
  data: Map<string, file_info_t>;
  failures: Map<string, file_or_dir_fail_info_t>;
  directories_list: string[];
  total_size: number;
  total_files: number;
  total_directories: number;
  total_skipped: number;
  total_processed: number;
};

export type onfoundcb_t = (file_info: file_info_t) => Promise<boolean>;

export type onfailcb_t = (
  file_or_dir_path: string,
  err: any
) => Promise<boolean>;
