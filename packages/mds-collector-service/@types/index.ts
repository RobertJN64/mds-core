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

import type { DomainModelCreate } from '@mds-core/mds-repository'
import type { RpcEmptyRequestContext, RpcServiceDefinition } from '@mds-core/mds-rpc-common'
import { RpcRoute } from '@mds-core/mds-rpc-common'
import type { Timestamp, UUID } from '@mds-core/mds-types'
import type { SchemaObject } from 'ajv'

export interface CollectorSchemaDomainModel {
  schema_id: string
  schema: SchemaObject
}

export type CollectorSchemaDomainCreateModel = CollectorSchemaDomainModel

export interface CollectorMessageDomainModel {
  schema_id: string
  provider_id: UUID
  message: object
  recorded: Timestamp
}

export type CollectorMessageDomainCreateModel = DomainModelCreate<Omit<CollectorMessageDomainModel, 'recorded'>>

export interface CollectorService {
  registerMessageSchema: (
    schema_id: CollectorSchemaDomainModel['schema_id'],
    schema: CollectorSchemaDomainCreateModel['schema']
  ) => true
  getMessageSchema: (schema_id: CollectorMessageDomainModel['schema_id']) => CollectorSchemaDomainModel['schema']
  writeSchemaMessages: (
    schema_id: CollectorMessageDomainModel['schema_id'],
    provider_id: CollectorMessageDomainModel['provider_id'],
    messages: Array<CollectorMessageDomainModel['message']>
  ) => Array<CollectorMessageDomainModel>
}

export const CollectorServiceRpcDefinition: RpcServiceDefinition<CollectorService> = {
  registerMessageSchema: RpcRoute<CollectorService['registerMessageSchema']>(),
  getMessageSchema: RpcRoute<CollectorService['getMessageSchema']>(),
  writeSchemaMessages: RpcRoute<CollectorService['writeSchemaMessages']>()
}

export type CollectorServiceRequestContext = RpcEmptyRequestContext
