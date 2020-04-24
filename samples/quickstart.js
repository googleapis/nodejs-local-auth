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

// [START local_auth_quickstart]
const {authenticate} = require('@google-cloud/local-auth');

async function quickstart() {
  const localAuth = await authenticate({
    scopes: ['https://www.googleapis.com/auth/blogger'],
    keyfilePath: '/path/to/keys.json',
  });
  console.log('Tokens:', localAuth.credentials);
}
quickstart();
// [END local_auth_quickstart]
