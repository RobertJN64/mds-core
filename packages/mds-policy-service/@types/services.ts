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

import type { RpcEmptyRequestContext, RpcServiceDefinition } from '@mds-core/mds-rpc-common'
import { RpcRoute } from '@mds-core/mds-rpc-common'
import type { MODALITY, Nullable, TimeRange, Timestamp, UUID } from '@mds-core/mds-types'
import type { IntentDraft, INTENT_TYPE } from './intents'
import type { PolicyDomainCreateModel, PolicyDomainModel, PolicyMetadataDomainModel, POLICY_STATUS } from './models'

export type FILTER_POLICY_STATUS = Exclude<POLICY_STATUS, 'unknown'>

export const SortPolicyColumn = <const>['start_date', 'status']
export type SortPolicyColumn = typeof SortPolicyColumn[number]

export const SortPolicyDirection = <const>['ASC', 'DESC']
export type SortPolicyDirection = typeof SortPolicyDirection[number]

export type PresentationOptions = {
  withStatus?: boolean
}

export interface ReadPolicyQueryParams {
  policy_ids?: UUID[]
  rule_id?: UUID
  name?: string
  description?: string
  start_date?: Timestamp
  get_unpublished?: Nullable<boolean>
  get_published?: Nullable<boolean>
  statuses?: FILTER_POLICY_STATUS[]
  geography_ids?: Nullable<UUID[]>
  active_on?: TimeRange
  modalities?: Nullable<MODALITY[]>
  limit?: number
  sort?: SortPolicyColumn
  direction?: SortPolicyDirection
  afterCursor?: string
  beforeCursor?: string
}

export type ReadPoliciesResponse = {
  policies: PolicyDomainModel[]
  cursor?: {
    prev: Nullable<string>
    next: Nullable<string>
  }
}

export interface PolicyService {
  name: () => string
  writePolicy: (policy: PolicyDomainCreateModel) => PolicyDomainModel
  readPolicies: (params: ReadPolicyQueryParams, presentationOptions?: PresentationOptions) => ReadPoliciesResponse
  readActivePolicies: (timestamp: Timestamp) => Required<PolicyDomainModel>[]
  deletePolicy: (policy_id: UUID) => UUID
  editPolicy: (policy: PolicyDomainCreateModel) => PolicyDomainModel
  publishPolicy: (policy_id: UUID, published_date: Timestamp) => PolicyDomainModel
  readBulkPolicyMetadata: <M>(params: ReadPolicyQueryParams) => PolicyMetadataDomainModel<M>[]
  readPolicy: (policy_id: UUID, presentationOptions?: PresentationOptions) => PolicyDomainModel
  readSinglePolicyMetadata: <M>(policy_id: UUID) => PolicyMetadataDomainModel<M>
  updatePolicyMetadata: (policy_metadata: PolicyMetadataDomainModel) => PolicyMetadataDomainModel
  writePolicyMetadata: (policy_metadata: PolicyMetadataDomainModel) => PolicyMetadataDomainModel
  writePolicyIntentToPolicy: <I extends INTENT_TYPE>(intent_draft: IntentDraft<I>) => PolicyDomainModel
}

export const PolicyServiceDefinition: RpcServiceDefinition<PolicyService> = {
  name: RpcRoute<PolicyService['name']>(),
  writePolicy: RpcRoute<PolicyService['writePolicy']>(),
  readPolicies: RpcRoute<PolicyService['readPolicies']>(),
  readActivePolicies: RpcRoute<PolicyService['readActivePolicies']>(),
  deletePolicy: RpcRoute<PolicyService['deletePolicy']>(),
  editPolicy: RpcRoute<PolicyService['editPolicy']>(),
  publishPolicy: RpcRoute<PolicyService['publishPolicy']>(),
  readBulkPolicyMetadata: RpcRoute<PolicyService['readBulkPolicyMetadata']>(),
  readPolicy: RpcRoute<PolicyService['readPolicy']>(),
  readSinglePolicyMetadata: RpcRoute<PolicyService['readSinglePolicyMetadata']>(),
  updatePolicyMetadata: RpcRoute<PolicyService['updatePolicyMetadata']>(),
  writePolicyMetadata: RpcRoute<PolicyService['writePolicyMetadata']>(),
  writePolicyIntentToPolicy: RpcRoute<PolicyService['writePolicyIntentToPolicy']>()
}

export type PolicyServiceRequestContext = RpcEmptyRequestContext
