# changemon

Watch objects for changes, and execute callbacks when they do. Take the data from the callbacks and apply those changes to any other objects, or don't. This can be used for auto-updating database records, synchronizing data across the network, and all sorts of other neat things.

## Install

```bash
npm install changemon
```

## Building from source

This package is intended to be run via npm, but if you'd like to build from source,
clone this repo, enter directory, and run `npm install` for dev dependencies, then run
`npm run build`.

## Usage

```typescript
import { applyChange, ChangeMon, changemon_path_t } from 'changemon';

(async function () {
  type your_watched_type_t = {
    hello: string;
    there: number;
    how: number[];
    are: object;
    you: boolean;
  };

  type your_extra_data_type_t = number;

  const changemon_ref = new ChangeMon<your_extra_data_type_t>(777);

  const some_other_object_you_want_to_also_apply_changes_to = {
    hello: 'hi',
    there: -1,
    how: [],
    are: {},
    you: true
  };

  const your_watched_object = changemon_ref.watch<your_watched_type_t>(
    {
      hello: 'a string',
      there: 10,
      how: [1, 2, 3, 4],
      are: {},
      you: true
    },
    (
      old_val: any,
      new_val: any,
      path: changemon_path_t,
      changemon_ref: ChangeMon<number>
    ) => {
      //
      // old_val:
      // This is the value prior to the change.
      //
      // new_val:
      // This is the value that it will be changed to.
      //
      // path:
      // This is an array of paths and types to get to the value being
      // changed.
      //
      // changemon_ref:
      // This is a changemon self reference, from which you an access the extra
      // passthrough data.  In this case it's the number 777, in your case, it's
      // an object, or database handles or whatever you want.
      //
      // applyChange:
      // this will propagate the current path and changes into an unrelated and
      // unwatched object.  You can use this to patch data locally, or between hosts,
      // or however you want.  Just pass in a path and a value and it'll patch things
      // up for you.
      applyChange(
        some_other_object_you_want_to_also_apply_changes_to,
        path,
        new_val
      );
    }
  );

  // Each change here will trigger the change callback above
  your_watched_object.hello = 'a different string';
  your_watched_object.there = 20;
  your_watched_object.how.push(5);
  your_watched_object.are = { a: 'b' };
  your_watched_object.you = false;

  // This will unwatch the watched object, returning the original data and removing
  // it from the ChangeMon weak map.
  const unwatched_original_object = changemon_ref.unwatch(your_watched_object);

  // IMPORTANT:
  // In the console output, do note that the "how" property (array), only has values which
  // were changed, propagated.  Since the some_other_object_you_want_to_also_apply_changes_to
  // object doesn't initially have any values in it, you will have 4 empty values in the array, and
  // the number 5.  This is by design, and intentional.  If you want all other values propagated,
  // you'll have to do that in the change callback.
  console.log({
    unwatched_original_object: unwatched_original_object,
    some_other_object_you_want_to_also_apply_changes_to:
      some_other_object_you_want_to_also_apply_changes_to
  });
})();
```
