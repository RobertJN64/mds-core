/**
 * Copyright 2021 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ApiServer } from '@mds-core/mds-api-server'
import { CollectorServiceClient } from '@mds-core/mds-collector-service'
import { CollectorServiceManager } from '@mds-core/mds-collector-service/service/manager'
import { TestSchema } from '@mds-core/mds-schema-validators'
import type { UUID } from '@mds-core/mds-types'
import { pathPrefix, uuid } from '@mds-core/mds-utils'
import HttpStatus from 'http-status-codes'
import supertest from 'supertest'
import type { CollectorApiAccessTokenScopes } from '../@types'
import { COLLECTOR_API_DEFAULT_VERSION, COLLECTOR_API_MIME_TYPE } from '../@types'
import { api } from '../api'

const CollectorService = CollectorServiceManager.controller()
const request = supertest(ApiServer(api))
const [major, minor] = COLLECTOR_API_DEFAULT_VERSION.split('.')
const CollectorApiContentType = `${COLLECTOR_API_MIME_TYPE}; charset=utf-8; version=${major}.${minor}`
const TEST_SCHEMA_ID = 'test'
const TEST_PROVIDER_ID = uuid()
const TEST_COLLECTOR_MESSAGES = [
  { id: uuid(), name: 'President', country: 'US', zip: '37188' },
  { id: uuid(), name: 'Prime Minister', country: 'CA', zip: 'K1M 1M4' }
]

const Get = (path: string, provider_id?: UUID, ...scopes: CollectorApiAccessTokenScopes[]) => {
  const url = pathPrefix(path)
  return {
    Responds: (code: number, response: Partial<{ body: {}; headers: {} }> = {}) =>
      it(`GET ${url} (${code} ${HttpStatus.getStatusText(code).toUpperCase()})`, async () => {
        expect(
          await request
            .get(url)
            .set(
              provider_id
                ? { Authorization: `basic ${Buffer.from(`${provider_id}|${scopes.join(' ')}`).toString('base64')}` }
                : {}
            )
            .expect(code)
        ).toMatchObject(response)
      })
  }
}

const Post = (path: string, body: {}, provider_id?: UUID, ...scopes: CollectorApiAccessTokenScopes[]) => {
  const url = pathPrefix(path)
  return {
    Responds: (code: number, response: Partial<{ body: {}; headers: {} }> = {}) =>
      it(`POST ${url} (${code} ${HttpStatus.getStatusText(code).toUpperCase()})`, async () => {
        expect(
          await request
            .post(url)
            .set(
              provider_id
                ? { Authorization: `basic ${Buffer.from(`${provider_id}|${scopes.join(' ')}`).toString('base64')}` }
                : {}
            )
            .send(body)
            .expect(code)
        ).toMatchObject(response)
      })
  }
}

describe('Collector API', () => {
  describe('API Endpoints', () => {
    beforeAll(async () => {
      await CollectorService.start()
      await CollectorServiceClient.registerMessageSchema('test', TestSchema)
    })

    Get('/not-found').Responds(HttpStatus.NOT_FOUND)

    Get('/health').Responds(HttpStatus.OK, {
      body: { name: process.env.npm_package_name, version: process.env.npm_package_version, status: 'Running' }
    })

    Get('/schema/forbidden').Responds(HttpStatus.FORBIDDEN)

    Get('/schema/forbidden', TEST_PROVIDER_ID).Responds(HttpStatus.FORBIDDEN)

    Get('/schema/notfound', TEST_PROVIDER_ID, 'collector:schemas:read').Responds(HttpStatus.NOT_FOUND, {
      headers: { 'content-type': CollectorApiContentType },
      body: { error: { isServiceError: true, type: 'NotFoundError' } }
    })

    Get('/schema/test', TEST_PROVIDER_ID, 'collector:schemas:read').Responds(HttpStatus.OK, {
      headers: { 'content-type': CollectorApiContentType },
      body: { $schema: 'http://json-schema.org/draft-07/schema#' }
    })

    Post('/messages/forbidden', {}).Responds(HttpStatus.FORBIDDEN)

    Post('/messages/forbidden', {}, TEST_PROVIDER_ID).Responds(HttpStatus.FORBIDDEN)

    Post('/messages/notfound', [{}], TEST_PROVIDER_ID, 'collector:messages:write').Responds(HttpStatus.NOT_FOUND, {
      headers: { 'content-type': CollectorApiContentType },
      body: { error: { isServiceError: true, type: 'NotFoundError' } }
    })

    Post('/messages/test', TEST_COLLECTOR_MESSAGES, TEST_PROVIDER_ID, 'collector:messages:write').Responds(
      HttpStatus.CREATED,
      {
        headers: { 'content-type': CollectorApiContentType },
        body: TEST_COLLECTOR_MESSAGES.map(message => ({
          schema_id: TEST_SCHEMA_ID,
          provider_id: TEST_PROVIDER_ID,
          message
        }))
      }
    )

    Post(
      '/messages/test',
      [{ ...TEST_COLLECTOR_MESSAGES[0], email: 'invalid' }],
      TEST_PROVIDER_ID,
      'collector:messages:write'
    ).Responds(HttpStatus.BAD_REQUEST, {
      headers: { 'content-type': CollectorApiContentType },
      body: { error: { isServiceError: true, type: 'ValidationError' } }
    })

    afterAll(async () => {
      await CollectorService.stop()
    })
  })
})
