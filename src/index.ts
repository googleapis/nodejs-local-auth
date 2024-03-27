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
import {AddressInfo} from 'net';
import {resolve} from 'path';

const invalidRedirectUri = `The provided keyfile does not define a valid
redirect URI. There must be at least one redirect URI defined, and this sample
assumes it redirects to 'http://localhost:3000/oauth2callback'.  Please edit
your keyfile, and add a 'redirect_uris' section.  For example:

"redirect_uris": [
  "http://localhost:3000/oauth2callback"
]
`;

function isAddressInfo(addr: string | AddressInfo | null): addr is AddressInfo {
  return (addr as AddressInfo).port !== undefined;
}

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

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const keyFile = require(resolve(options.keyfilePath));
  const keys = keyFile.installed || keyFile.web;
  if (!keys.redirect_uris || keys.redirect_uris.length === 0) {
    throw new Error(invalidRedirectUri);
  }
  const redirectUri = new URL(keys.redirect_uris[0] ?? 'http://localhost');
  if (redirectUri.hostname !== 'localhost') {
    throw new Error(invalidRedirectUri);
  }

  // create an oAuth client to authorize the API call
  const client = new OAuth2Client({
    clientId: keys.client_id,
    clientSecret: keys.client_secret,
  });

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url!, 'http://localhost:3000');
        if (url.pathname !== redirectUri.pathname) {
          res.end('Invalid callback URL');
          return;
        }
        const searchParams = url.searchParams;
        if (searchParams.has('error')) {
          res.end('Authorization rejected.');
          reject(new Error(searchParams.get('error')!));
          return;
        }
        if (!searchParams.has('code')) {
          res.end('No authentication code provided.');
          reject(new Error('Cannot read authentication code.'));
          return;
        }

        const code = searchParams.get('code');
        const {tokens} = await client.getToken({
          code: code!,
          redirect_uri: redirectUri.toString(),
        });
        client.credentials = tokens;
        resolve(client);
        res.end('Authentication successful! Please return to the console.');
      } catch (e) {
        reject(e);
      } finally {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (server as any).destroy();
      }
    });

    let listenPort = 3000;
    if (keyFile.installed) {
      // Use ephemeral port if not a web client
      listenPort = 0;
    } else if (redirectUri.port !== '') {
      listenPort = Number(redirectUri.port);
    }

    server.listen(listenPort, () => {
      const address = server.address();
      if (isAddressInfo(address)) {
        redirectUri.port = String(address.port);
      }
      const scopes = arrify(options.scopes || []);
      // open the browser to the authorize url to start the workflow
      const authorizeUrl = client.generateAuthUrl({
        redirect_uri: redirectUri.toString(),
        access_type: 'offline',
        scope: scopes.join(' '),
      });
      opn(authorizeUrl, {wait: false}).then(cp => cp.unref());
    });
    destroyer(server);
  });
}
