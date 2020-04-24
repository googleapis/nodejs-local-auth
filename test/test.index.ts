// Copyright 2020 Google LLC
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as assert from 'assert';
import * as path from 'path';
import {describe, it, before, beforeEach} from 'mocha';
import * as proxyquire from 'proxyquire';
import * as nock from 'nock';
import {request} from 'gaxios';
import * as nlaTypes from '../src';

nock.disableNetConnect();
nock.enableNetConnect('localhost:3000');

describe('🔑 authenticate', () => {
  const keyfilePath = path.join(__dirname, '../../test/fixtures/keys.json');
  let nla: typeof nlaTypes;
  let callbackUrl: string;

  before(() => {
    nla = proxyquire('../src', {
      open: async () => {
        await request({
          url: callbackUrl,
        });
        return {
          unref: () => {},
        };
      },
    });
  });

  beforeEach(() => {
    callbackUrl = 'http://localhost:3000/oauth2callback?code=123';
  });

  it('should return credentials', async () => {
    const access_token = 'fake-access-token';
    const refresh_token = 'fake-refresh-token';
    const scope = nock('https://oauth2.googleapis.com')
      .post('/token')
      .reply(200, {
        access_token,
        refresh_token,
      });

    const client = await nla.authenticate({
      keyfilePath,
      scopes: [],
    });
    scope.done();
    assert.strictEqual(client.credentials.access_token, access_token);
    assert.strictEqual(client.credentials.refresh_token, refresh_token);
  });

  it('should throw an error if no keyfilePath is passed', async () => {
    await assert.rejects(
      nlaTypes.authenticate({} as nlaTypes.LocalAuthOptions),
      /keyfilePath must be set/
    );
  });

  it('should throw an error if no scopes are passed', async () => {
    await assert.rejects(
      nlaTypes.authenticate({
        keyfilePath: 'boop',
      } as nlaTypes.LocalAuthOptions),
      /scopes must be set/
    );
  });

  it('should throw if the keyfile has no redirectUrl', async () => {
    const keyfilePath = path.join(
      __dirname,
      '../../test/fixtures/keys-no-redirect.json'
    );
    await assert.rejects(
      nlaTypes.authenticate({
        keyfilePath: keyfilePath,
        scopes: [],
      }),
      /The provided keyfile does not define/
    );
  });

  it('should throw if the keyfile has an invalid redirectUrl', async () => {
    const keyfilePath = path.join(
      __dirname,
      '../../test/fixtures/keys-invalid-redirect.json'
    );
    await assert.rejects(
      nlaTypes.authenticate({
        keyfilePath: keyfilePath,
        scopes: [],
      }),
      /The provided keyfile does not define/
    );
  });

  it('should surface errors if the server returns an error', async () => {
    callbackUrl = 'http://localhost:3000/oauth2callback';
    await assert.rejects(
      nla.authenticate({keyfilePath, scopes: []}),
      /Cannot read property/
    );
  });
});
