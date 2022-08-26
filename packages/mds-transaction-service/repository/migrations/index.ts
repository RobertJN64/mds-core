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

import { CreateTransactionsTable1607356754555 } from './1607356754555-CreateTransactionsTable'
import { TransactionsSearchIndicies1615586339528 } from './1615586339528-TransactionsSearchIndicies'
import { ChangeRecordedColumnDefaultExpression1644682449755 } from './1644682449755-ChangeRecordedColumnDefaultExpression'
import { AddProviderIdTimestampIndex1656441290628 } from './1656441290628-AddProviderIdTimestampIndex'
import { OptimizeTimestampIndices1661200976056 } from './1661200976056-OptimizeTimestampIndices'

export default [
  CreateTransactionsTable1607356754555,
  TransactionsSearchIndicies1615586339528,
  ChangeRecordedColumnDefaultExpression1644682449755,
  AddProviderIdTimestampIndex1656441290628,
  OptimizeTimestampIndices1661200976056
]
