// Copyright 2020 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {describe, it} from 'mocha';
import * as assert from 'assert';
import * as path from 'path';

import {authenticate} from '../src';

describe('📦 system tests', () => {
  /**
   * This is currently skipped because it would require a valid user level
   * auth keyfile, and we don't currently have a way to test it...
   */
  it.skip('should work', async () => {
    const scopes = ['https://www.googleapis.com/auth/blogger'];
    const keyfilePath = path.join(
      __dirname,
      '../../system-test',
      'fixtures',
      'keys.json'
    );
    const localAuth = await authenticate({
      scopes,
      keyfilePath,
    });
    assert.ok(localAuth.credentials);
  });
});
