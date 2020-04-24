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

/**
 * This is used by several samples to easily provide an oauth2 workflow.
 */

import {OAuth2Client} from 'google-auth-library';
import * as http from 'http';
import {URL} from 'url';
import * as opn from 'open';
import arrify = require('arrify');
import destroyer = require('server-destroy');

const invalidRedirectUri = `The provided keyfile does not define a valid
redirect URI. There must be at least one redirect URI defined, and this sample
assumes it redirects to 'http://localhost:3000/oauth2callback'.  Please edit
your keyfile, and add a 'redirect_uris' section.  For example:

"redirect_uris": [
  "http://localhost:3000/oauth2callback"
]
`;

export interface LocalAuthOptions {
  keyfilePath: string;
  scopes: string[] | string;
}

// Open an http server to accept the oauth callback. In this
// simple example, the only request to our webserver is to
// /oauth2callback?code=<code>
export async function authenticate(
  options: LocalAuthOptions
): Promise<OAuth2Client> {
  if (
    !options ||
    !options.keyfilePath ||
    typeof options.keyfilePath !== 'string'
  ) {
    throw new Error(
      'keyfilePath must be set to the fully qualified path to a GCP credential keyfile.'
    );
  }

  options.scopes = arrify(options.scopes || []);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const keyFile = require(options.keyfilePath);
  const keys = keyFile.installed || keyFile.web;
  if (!keys.redirect_uris || keys.redirect_uris.length === 0) {
    throw new Error(invalidRedirectUri);
  }
  const redirectUri = keys.redirect_uris[keys.redirect_uris.length - 1];
  const parts = new URL(redirectUri);
  if (
    redirectUri.length === 0 ||
    parts.port !== '3000' ||
    parts.hostname !== 'localhost' ||
    parts.pathname !== '/oauth2callback'
  ) {
    throw new Error(invalidRedirectUri);
  }

  // create an oAuth client to authorize the API call
  const client = new OAuth2Client({
    clientId: keys.client_id,
    clientSecret: keys.client_secret,
    redirectUri,
  });
  // grab the url that will be used for authorization
  const authorizeUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: options.scopes.join(' '),
  });

  return new Promise((resolve, reject) => {
    const server = http
      .createServer(async (req, res) => {
        try {
          if (req.url!.indexOf('/oauth2callback') > -1) {
            const qs = new URL(req.url!, 'http://localhost:3000').searchParams;
            res.end('Authentication successful! Please return to the console.');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (server as any).destroy();
            const {tokens} = await client.getToken(qs.get('code')!);
            client.credentials = tokens;
            resolve(client);
          }
        } catch (e) {
          reject(e);
        }
      })
      .listen(3000, () => {
        // open the browser to the authorize url to start the workflow
        opn(authorizeUrl, {wait: false}).then(cp => cp.unref());
      });
    destroyer(server);
  });
}
