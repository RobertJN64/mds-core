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

import { parseRequest, streamCsvToHttp } from '@mds-core/mds-api-helpers'
import type { ApiRequestParams, ApiResponse } from '@mds-core/mds-api-server'
import type { ProviderDomainModel } from '@mds-core/mds-provider-service'
import { ProviderServiceClient } from '@mds-core/mds-provider-service'
import type {
  PaginationLinks,
  TransactionDomainModel,
  TransactionSearchParams
} from '@mds-core/mds-transaction-service'
import { FEE_TYPE, SORTABLE_COLUMN, SORT_DIRECTION, TransactionServiceClient } from '@mds-core/mds-transaction-service'
import type { UUID } from '@mds-core/mds-types'
import { ValidationError } from '@mds-core/mds-utils'
import type express from 'express'
import type { Cursor } from 'typeorm-cursor-pagination'
import type { TransactionApiRequest, TransactionApiResponse } from '../@types'

export type TransactionApiGetTransactionsRequest = TransactionApiRequest &
  ApiRequestParams<'provider_id' | 'start_timestamp' | 'end_timestamp'>
export type TransactionApiGetTransactionsRequestWithCursor = TransactionApiGetTransactionsRequest &
  ApiRequestParams<'before' | 'after'>
export type TransactionApiGetTransactionsRequestWithPickColumns = TransactionApiGetTransactionsRequest &
  ApiRequestParams<'pick_columns'>

export type TransactionApiGetTransactionsResponse = TransactionApiResponse<{
  transactions: TransactionDomainModel[]
  links: PaginationLinks
}>

export type TransactionApiGetTransactionsAsCsvResponse = ApiResponse<string>

const isFeeType = (value: unknown): value is FEE_TYPE =>
  typeof value === 'string' && FEE_TYPE.includes(value as FEE_TYPE)

const getOrderOption = (req: TransactionApiGetTransactionsRequest) => {
  const { order_column: column } = parseRequest(req)
    .single({
      parser: (queryVal: string) => {
        const isSortableColumn = (value: unknown): value is SORTABLE_COLUMN =>
          typeof value === 'string' && SORTABLE_COLUMN.includes(value as SORTABLE_COLUMN)

        if (queryVal) {
          if (isSortableColumn(queryVal)) {
            return queryVal
          }

          /**
           * If the param exists but is not a string or sortable column, throw a validation error
           */
          throw new ValidationError(`Invalid sortable column ${queryVal}`)
        }
      }
    })
    .query('order_column')

  const { order_direction: direction = 'ASC' } = parseRequest(req)
    .single({
      parser: (queryVal: string) => {
        const isDirection = (value: unknown): value is SORT_DIRECTION =>
          typeof queryVal === 'string' && SORT_DIRECTION.includes(value as SORT_DIRECTION)

        if (queryVal) {
          if (isDirection(queryVal)) {
            return queryVal
          }

          /**
           * If the param exists but is not a direction, throw a validation error
           */
          throw new ValidationError(`Invalid sort direction ${queryVal}`)
        }
      }
    })
    .query('order_direction')

  const order = column ? { column, direction } : undefined

  return order
}

/**
 * Construct URLs given search options & cursor location
 * @param req Express Request
 * @param param1 Search options & cursor location
 */
const constructUrls = (
  req: TransactionApiGetTransactionsRequest,
  { order, ...basicOptions }: Omit<TransactionSearchParams, 'provider_ids'> & { provider_id?: UUID }
) => {
  const url = new URL(`${req.get('x-forwarded-proto') || req.protocol}://${req.get('host')}${req.path}`)

  const basicOptionsUrls = Object.entries(basicOptions).reduce((urlParams, [key, val]) => {
    if (val) {
      const paramsTail = urlParams.slice(-1)

      if (paramsTail === '?') return `${urlParams}${key}=${val}`
      return `${urlParams}&${key}=${val}`
    }

    return urlParams
  }, `${url}?`)

  // We can do this because we're assured to have *something* in `basicOptionsUrls` if we're generating a page
  if (order) {
    return `${basicOptionsUrls}&order_column=${order.column}&order_direction=${order.direction}`
  }

  return basicOptionsUrls
}

export const GetTransactionsHandler = async (
  req: TransactionApiGetTransactionsRequestWithCursor,
  res: TransactionApiGetTransactionsResponse,
  next: express.NextFunction
) => {
  try {
    const { scopes } = res.locals

    const order = getOrderOption(req)
    const {
      provider_id: queried_provider_id,
      before,
      after
    } = parseRequest(req).single({ parser: String }).query('provider_id', 'before', 'after')

    const { fee_type } = parseRequest(req)
      .single({
        parser: (x: string) => (isFeeType(x) ? x : undefined)
      })
      .query('fee_type')

    // eslint-reason checkAccess middleware has previously verified that local.claims.provider_id is a UUID
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const provider_id = scopes.includes('transactions:read') ? queried_provider_id : res.locals.claims!.provider_id!

    const {
      start_receipt_timestamp,
      end_receipt_timestamp,
      start_timestamp,
      end_timestamp,
      limit = 10
    } = parseRequest(req)
      .single({ parser: Number })
      .query('start_receipt_timestamp', 'end_receipt_timestamp', 'start_timestamp', 'end_timestamp', 'limit')

    const { transactions, cursor } = await TransactionServiceClient.getTransactions({
      provider_ids: provider_id ? [provider_id] : undefined,
      before,
      after,
      start_receipt_timestamp,
      end_receipt_timestamp,
      start_timestamp,
      end_timestamp,
      order,
      limit,
      fee_type
    })

    const { version } = res.locals

    const links: PaginationLinks = {
      prev: cursor.beforeCursor
        ? constructUrls(req, {
            order,
            provider_id,
            start_receipt_timestamp,
            end_receipt_timestamp,
            start_timestamp,
            end_timestamp,
            limit,
            before: cursor.beforeCursor
          })
        : null,
      next: cursor.afterCursor
        ? constructUrls(req, {
            order,
            provider_id,
            start_receipt_timestamp,
            end_receipt_timestamp,
            start_timestamp,
            end_timestamp,
            limit,
            after: cursor.afterCursor
          })
        : null
    }

    return res.status(200).send({ version, transactions, links })
  } catch (error) {
    next(error)
  }
}
export const GetTransactionsAsCsvHandler = async (
  req: TransactionApiGetTransactionsRequestWithPickColumns,
  res: TransactionApiGetTransactionsAsCsvResponse,
  next: express.NextFunction
) => {
  try {
    const { provider_id } = parseRequest(req).single({ parser: String }).query('provider_id')
    const { fee_type } = parseRequest(req)
      .single({
        parser: (x: string) => (isFeeType(x) ? x : undefined)
      })
      .query('fee_type')

    const order = getOrderOption(req)
    const {
      start_receipt_timestamp,
      end_receipt_timestamp,
      start_timestamp,
      end_timestamp,
      limit = 10
    } = parseRequest(req)
      .single({ parser: Number })
      .query('start_receipt_timestamp', 'end_receipt_timestamp', 'start_timestamp', 'end_timestamp', 'limit')
    const PICKABLE_COLUMNS = <const>[
      'transaction_id',
      'provider_id',
      'provider_name',
      'device_id',
      'timestamp',
      'fee_type',
      'currency_iso',
      'amount',
      'receipt.receipt_id',
      'receipt.timestamp',
      'receipt.origin_url',
      'receipt.receipt_details',
      'receipt.receipt_details.policy_id',
      'receipt.receipt_details.trip_id'
    ]

    type PickableColumn = typeof PICKABLE_COLUMNS[number]
    const isColumn = (col: string): col is PickableColumn => (PICKABLE_COLUMNS as readonly string[]).includes(col)
    const { pick_columns } = parseRequest(req)
      .list({
        parser: vals => vals.filter(isColumn)
      })
      .query('pick_columns')

    const fields: Array<{ label: string; value: PickableColumn }> = [
      { label: 'Transaction ID', value: 'transaction_id' },
      { label: 'Provider ID', value: 'provider_id' },
      { label: 'Provider Name', value: 'provider_name' },
      { label: 'Device ID', value: 'device_id' },
      { label: 'Timestamp', value: 'timestamp' },
      { label: 'Fee Type', value: 'fee_type' },
      { label: 'Currency', value: 'currency_iso' },
      { label: 'Amount', value: 'amount' },
      { label: 'Receipt ID', value: 'receipt.receipt_id' },
      { label: 'Receipt Timestamp', value: 'receipt.timestamp' },
      { label: 'Receipt Origin URL', value: 'receipt.origin_url' },
      { label: 'Receipt Details (JSON)', value: 'receipt.receipt_details' },
      { label: 'Policy ID', value: 'receipt.receipt_details.policy_id' },
      { label: 'Trip ID', value: 'receipt.receipt_details.trip_id' }
    ]

    const providers = await ProviderServiceClient.getProviders({})

    const providerMap = providers.reduce<Record<UUID, ProviderDomainModel>>((acc, provider) => {
      acc[provider.provider_id] = provider

      return acc
    }, {})

    const options = {
      provider_ids: provider_id ? [provider_id] : undefined,
      start_receipt_timestamp,
      end_receipt_timestamp,
      start_timestamp,
      end_timestamp,
      order,
      limit,
      fee_type
    }

    const mapper = ({ transactions, cursor }: { transactions: TransactionDomainModel[]; cursor: Cursor }) => ({
      transactions: transactions.map(transaction => ({
        ...transaction,
        amount: transaction.amount / 100, // conversion from pennies to dollars or equivalent
        currency_iso: process.env.TRANSACTION_CURRENCY || 'USD', // TODO add support for multiple currencies in mds-transaction-service
        provider_name: providerMap[transaction.provider_id]?.provider_name ?? 'unknown'
      })),
      cursor: { prev: cursor.beforeCursor, next: cursor.afterCursor }
    })
    return streamCsvToHttp(
      async () => mapper(await TransactionServiceClient.getTransactions(options)),
      async (cursor: string) =>
        mapper(
          await TransactionServiceClient.getTransactions({
            ...options,
            after: cursor
          })
        ),
      'transactions',
      res,
      fields,
      pick_columns
    )
  } catch (error) {
    next(error)
  }
}
