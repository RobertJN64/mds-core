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

import { RpcClient, RpcRequest, RpcRequestOptions } from '@mds-core/mds-rpc-common'
import { ServiceClient, UnwrapServiceResult } from '@mds-core/mds-service-helpers'
import { IngestMigrationService, IngestService, IngestServiceDefinition } from '../@types'
import { IngestServiceProvider } from '../service/provider'

const IngestServiceRpcClient = RpcClient(IngestServiceDefinition, {
  host: process.env.INGEST_SERVICE_RPC_HOST,
  port: process.env.INGEST_SERVICE_RPC_PORT
})

// What the API layer, and any other clients, will invoke.
export const IngestServiceClientFactory = (
  options: RpcRequestOptions = {}
): ServiceClient<IngestService & IngestMigrationService> => ({
  getDevicesUsingOptions: (...args) => RpcRequest(options, IngestServiceRpcClient.getDevicesUsingOptions, args),
  getDevicesUsingCursor: (...args) => RpcRequest(options, IngestServiceRpcClient.getDevicesUsingCursor, args),
  getEventsUsingOptions: (...args) =>
    process.env.ENABLE_RPC === 'true'
      ? RpcRequest(options, IngestServiceRpcClient.getEventsUsingOptions, args)
      : UnwrapServiceResult(IngestServiceProvider.getEventsUsingOptions)(...args), // Temporarily remove RPC hop per APPS-155
  getEventsUsingCursor: (...args) => RpcRequest(options, IngestServiceRpcClient.getEventsUsingCursor, args),
  getDevices: (...args) =>
    process.env.ENABLE_RPC === 'true'
      ? RpcRequest(options, IngestServiceRpcClient.getDevices, args)
      : UnwrapServiceResult(IngestServiceProvider.getDevices)(...args), // Temporarily remove RPC hop per APPS-155
  getLatestTelemetryForDevices: (...args) =>
    RpcRequest(options, IngestServiceRpcClient.getLatestTelemetryForDevices, args),
  writeEvents: (...args) => RpcRequest(options, IngestServiceRpcClient.writeEvents, args),
  writeEventAnnotations: (...args) => RpcRequest(options, IngestServiceRpcClient.writeEventAnnotations, args),
  writeMigratedDevice: (...args) => RpcRequest(options, IngestServiceRpcClient.writeMigratedDevice, args),
  writeMigratedVehicleEvent: (...args) => RpcRequest(options, IngestServiceRpcClient.writeMigratedVehicleEvent, args),
  writeMigratedTelemetry: (...args) => RpcRequest(options, IngestServiceRpcClient.writeMigratedTelemetry, args),
  getTripEvents: (...args) => RpcRequest(options, IngestServiceRpcClient.getTripEvents, args),
  getEventsWithDeviceAndTelemetryInfoUsingOptions: (...args) =>
    RpcRequest(options, IngestServiceRpcClient.getEventsWithDeviceAndTelemetryInfoUsingOptions, args),
  getEventsWithDeviceAndTelemetryInfoUsingCursor: (...args) =>
    RpcRequest(options, IngestServiceRpcClient.getEventsWithDeviceAndTelemetryInfoUsingCursor, args)
})

export const IngestServiceClient = IngestServiceClientFactory()
