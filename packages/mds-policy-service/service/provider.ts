/**
 * Copyright 2020 City of Los Angeles
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

import { GeographyServiceClient } from '@mds-core/mds-geography-service'
import type { ProcessController, ServiceProvider } from '@mds-core/mds-service-helpers'
import { ServiceException, ServiceResult } from '@mds-core/mds-service-helpers'
import { BadParamsError, DependencyMissingError, now } from '@mds-core/mds-utils'
import type { PolicyService, PolicyServiceRequestContext } from '../@types'
import { PolicyServiceLogger } from '../logger'
import { PolicyRepository } from '../repository'
import { translateIntentToPolicy } from './helpers'
import { PolicyStreamKafka } from './stream'
import {
  validateNoParkingPolicyIntent,
  validateParkingTimeLimitPolicyIntent,
  validatePermittedParkingPolicyIntent,
  validatePermittedVehicleCountPolicyIntent,
  validateProviderRebalancingZonePolicyIntent
} from './validators'
import {
  validatePolicyDomainModel,
  validatePolicyMetadataDomainModel,
  validatePresentationOptions
} from './validators/policy'

const serviceErrorWrapper = async <T>(method: string, exec: () => Promise<T>) => {
  try {
    return ServiceResult(await exec())
  } catch (error) {
    const exception = ServiceException(`Error Policy:${method}`, error)
    PolicyServiceLogger.error(`mds-policy-service::${method} error`, { exception, error })
    return exception
  }
}

export const PolicyServiceProvider: ServiceProvider<PolicyService, PolicyServiceRequestContext> & ProcessController = {
  start: async () => {
    await Promise.all([
      PolicyRepository.initialize(),
      ...(process.env.KAFKA_HOST ? [PolicyStreamKafka.initialize()] : [])
    ])
  },
  stop: async () => {
    await Promise.all([PolicyRepository.shutdown(), ...(process.env.KAFKA_HOST ? [PolicyStreamKafka.shutdown()] : [])])
  },
  name: async context => ServiceResult('mds-policy-service'),
  writePolicy: (context, policy) =>
    serviceErrorWrapper('writePolicy', () => PolicyRepository.writePolicy(validatePolicyDomainModel(policy))),
  readPolicies: (context, params, presentationOptions) =>
    serviceErrorWrapper('readPolicies', () =>
      PolicyRepository.readPolicies(params, validatePresentationOptions(presentationOptions ?? {}))
    ),
  readActivePolicies: (context, timestamp) =>
    serviceErrorWrapper('readActivePolicies', () => PolicyRepository.readActivePolicies(timestamp)),
  deletePolicy: (context, policy_id) =>
    serviceErrorWrapper('deletePolicy', () => PolicyRepository.deletePolicy(policy_id)),
  editPolicy: (context, policy) =>
    serviceErrorWrapper('editPolicy', () => PolicyRepository.editPolicy(validatePolicyDomainModel(policy))),
  readPolicy: (context, policy_id, presentationOptions) =>
    serviceErrorWrapper('readPolicy', () =>
      PolicyRepository.readPolicy(policy_id, validatePresentationOptions(presentationOptions ?? {}))
    ),
  readSinglePolicyMetadata: (context, policy_id) =>
    serviceErrorWrapper('readSinglePolicyMetadata', () => PolicyRepository.readSinglePolicyMetadata(policy_id)),
  readBulkPolicyMetadata: (context, params) =>
    serviceErrorWrapper('readBulkPolicyMetadata', () => {
      if (params.get_unpublished && params.get_published)
        throw new BadParamsError('cannot have get_unpublished and get_published both be true')

      return PolicyRepository.readBulkPolicyMetadata(params)
    }),
  updatePolicyMetadata: (context, policy_metadata) =>
    serviceErrorWrapper('updatePolicyMetadata', () =>
      PolicyRepository.updatePolicyMetadata(validatePolicyMetadataDomainModel(policy_metadata))
    ),
  writePolicyMetadata: (context, policy_metadata) =>
    serviceErrorWrapper('writePolicyMetadata', () =>
      PolicyRepository.writePolicyMetadata(validatePolicyMetadataDomainModel(policy_metadata))
    ),
  publishPolicy: (context, policy_id, published_date) =>
    serviceErrorWrapper('publishPolicy', async () => {
      const { rules, prev_policies } = await PolicyRepository.readPolicy(policy_id)
      const geographies = await GeographyServiceClient.getGeographiesByIds(rules.map(r => r.geographies).flat())

      if (geographies.some(geography => !geography?.publish_date))
        throw new DependencyMissingError(`some geographies not published!`)

      const publishedPolicy = await PolicyRepository.publishPolicy(policy_id, published_date, {
        beforeCommit: process.env.KAFKA_HOST ? async policy => PolicyStreamKafka.write(policy) : undefined
      })

      if (prev_policies) {
        await Promise.all(
          prev_policies.map(superseded_policy_id =>
            PolicyRepository.updatePolicySupersededBy(superseded_policy_id, policy_id, publishedPolicy.start_date)
          )
        )
      }

      return publishedPolicy
    }),
  writePolicyIntentToPolicy: (context, intent_draft) =>
    serviceErrorWrapper('writePolicyIntentToPolicy', async () => {
      switch (intent_draft.intent_type) {
        case 'no_parking': {
          validateNoParkingPolicyIntent(intent_draft)
          break
        }
        case 'permitted_vehicle_count': {
          validatePermittedVehicleCountPolicyIntent(intent_draft)
          break
        }
        case 'parking_time_limit': {
          validateParkingTimeLimitPolicyIntent(intent_draft)
          break
        }
        case 'permitted_parking': {
          validatePermittedParkingPolicyIntent(intent_draft)
          break
        }
        case 'provider_rebalancing_zone': {
          validateProviderRebalancingZonePolicyIntent(intent_draft)
          break
        }
        default: {
          throw new BadParamsError('Unknown intent type!')
        }
      }
      const policy = translateIntentToPolicy(intent_draft)

      const { policy_id } = await PolicyRepository.writePolicy(policy)
      await PolicyRepository.writePolicyMetadata({
        policy_id,
        policy_metadata: { intent_type: intent_draft.intent_type }
      })
      return PolicyRepository.publishPolicy(policy_id, now(), {
        beforeCommit: process.env.KAFKA_HOST ? async policy => PolicyStreamKafka.write(policy) : undefined
      })
    })
}
