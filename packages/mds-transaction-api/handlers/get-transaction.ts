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

import type { ApiRequestParams } from '@mds-core/mds-api-server'
import type { TransactionDomainModel } from '@mds-core/mds-transaction-service'
import { TransactionServiceClient } from '@mds-core/mds-transaction-service'
import type express from 'express'
import type { TransactionApiRequest, TransactionApiResponse } from '../@types'

export type TransactionApiGetTransactionRequest = TransactionApiRequest & ApiRequestParams<'id'>

export type TransactionApiGetTransactionResponse = TransactionApiResponse<{ transaction: TransactionDomainModel }>

export const GetTransactionHandler = async (
  req: TransactionApiGetTransactionRequest,
  res: TransactionApiGetTransactionResponse,
  next: express.NextFunction
) => {
  try {
    const { id } = req.params
    const transaction = await TransactionServiceClient.getTransaction(id)
    const { version } = res.locals
    return res.status(200).send({ version, transaction })
  } catch (error) {
    next(error)
  }
}
