import test from 'node:test';
import assert from 'node:assert';
import DirMap from '@src/DirMap.class';
import { file_info_t } from '@src/types';

(async function () {
  test('Stop search immediately', async function () {
    const dirmap = new DirMap();
    await dirmap.run({
      base_dir: './test/arbitrary_directory_for_testing/',
      onfoundcb: async function (this: DirMap) {
        this.stop();
        return false;
      },
      onfailcb: async function (this: DirMap) {
        this.stop();
        return false;
      }
    });

    if (dirmap.result_map.size !== 0)
      assert.fail('Result map should have zero entries.');
  });

  test('Search test directory and md5 found files', async function () {
    const dirmap = new DirMap();
    await dirmap.run({
      base_dir: './test/arbitrary_directory_for_testing/',
      options: {
        generate_file_md5s: true
      }
    });

    if (dirmap.result_map.size !== 4)
      assert.fail('Result map should have 4 entries');
    if (dirmap.directory_map.size !== 2)
      assert.fail('Directory map should have 2 entries');
    if (dirmap.file_map.size !== 2)
      assert.fail('File map should have 2 entries');

    for (const [key, value] of dirmap.file_map) {
      if (!value.file_md5)
        assert.fail(`File entry did not have a md5 value (${key})`);
    }
  });

  test('Search /dev/ directory and ensure it found some special files.', async function () {
    const dirmap = new DirMap();
    await dirmap.run({
      base_dir: '/dev/'
    });

    if (dirmap.char_dev_map.size <= 0)
      assert.fail('Dev did not contain any character dev entries.');
  });

  test('Search /etc/ directory and filter everything but the hosts file', async function () {
    const dirmap = new DirMap();
    await dirmap.run({
      base_dir: '/etc/',
      onfoundcb: async function (this: DirMap, file_info: file_info_t) {
        if (file_info.absolute_path === '/etc/hosts') {
          console.debug(file_info);
          return true;
        }
        return false;
      },
      onfailcb: async function () {
        return false;
      }
    });

    if (dirmap.result_map.size !== 1)
      assert.fail('Result map did not have just one entry.');
    if (dirmap.file_map.size !== 1)
      assert.fail('File map did not have just one entry.');
  });
})();
