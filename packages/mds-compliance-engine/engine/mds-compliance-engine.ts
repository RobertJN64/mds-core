/*
    Copyright 2019 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import { ComplianceSnapshotDomainModel } from '@mds-core/mds-compliance-service/@types'
import { Device, Geography, Policy, RULE_TYPES, UUID, VehicleEvent } from '@mds-core/mds-types'
import { filterDefined, now, UnsupportedTypeError, uuid } from '@mds-core/mds-utils'
import { ProviderInputs, VehicleEventWithTelemetry } from '../@types'
import { processCountPolicy } from './count_processors'
import { getPolicyType, getProviderIDs, isPolicyActive } from './helpers'
import { processSpeedPolicy } from './speed_processors'
import { processTimePolicy } from './time_processors'

function computeComplianceSnapshot(
  policy: Policy,
  filteredEvents: VehicleEventWithTelemetry[],
  geographies: Geography[],
  deviceMap: { [d: string]: Device }
) {
  const policy_type = getPolicyType(policy)
  switch (policy_type) {
    case RULE_TYPES.count: {
      return processCountPolicy(policy, filteredEvents, geographies, deviceMap)
    }
    case RULE_TYPES.speed: {
      return processSpeedPolicy(policy, filteredEvents, geographies, deviceMap)
    }
    case RULE_TYPES.time: {
      return processTimePolicy(policy, filteredEvents, geographies, deviceMap)
    }
    default: {
      throw new UnsupportedTypeError(`Policy type ${policy_type} unsupported by compliance engine`)
    }
  }
}

export function createComplianceSnapshot(
  provider_id: UUID,
  policy: Policy,
  geographies: Geography[],
  filteredEvents: VehicleEvent[],
  deviceMap: { [d: string]: Device }
): ComplianceSnapshotDomainModel | undefined {
  const compliance_as_of = now()
  const complianceResult = computeComplianceSnapshot(
    policy,
    filteredEvents as VehicleEventWithTelemetry[],
    geographies,
    deviceMap
  )
  if (complianceResult) {
    const complianceSnapshot: ComplianceSnapshotDomainModel = {
      compliance_as_of,
      compliance_snapshot_id: uuid(),
      excess_vehicles_count: complianceResult.excess_vehicles_count,
      total_violations: complianceResult.total_violations,
      policy: {
        name: policy.name,
        policy_id: policy.policy_id
      },
      provider_id,
      vehicles_found: complianceResult.vehicles_found
    }
    return complianceSnapshot
  }
}

/*
 * The geographies should be the result of calling
 * `await readGeographies({ get_published: true })`
 */
export function processPolicy(policy: Policy, geographies: Geography[], providerInputs: ProviderInputs) {
  if (isPolicyActive(policy)) {
    const provider_ids = getProviderIDs(policy.provider_ids)
    const results = provider_ids.map(provider_id => {
      const { filteredEvents, deviceMap } = providerInputs[provider_id]
      return createComplianceSnapshot(provider_id, policy, geographies, filteredEvents, deviceMap)
    })
    // filter out undefined results
    return results.filter(filterDefined())
  }
  return []
}
