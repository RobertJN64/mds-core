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

import { CreatePoliciesTable1603045382246 } from './1603045382246-CreatePoliciesTable'
import { CreatePolicyMetadataTable1603045629619 } from './1603045629619-CreatePolicyMetadataTable'
import { AddSupersededByColumnToPoliciesTable1629221239968 } from './1629221239968-AddSupersededByColumnToPoliciesTable'
import { AddColumnsToPoliciesTable1634142716521 } from './1634142716521-AddColumnsToPoliciesTable'
import { AddSupersededAtColumn1646685180039 } from './1646685180039-AddSupersededAtColumn'
import { RenamePublishDateToPublishedDate1648742662434 } from './1648742662434-RenamePublishDateToPublishedDate'

export default [
  CreatePoliciesTable1603045382246,
  CreatePolicyMetadataTable1603045629619,
  AddSupersededByColumnToPoliciesTable1629221239968,
  AddColumnsToPoliciesTable1634142716521,
  AddSupersededAtColumn1646685180039,
  RenamePublishDateToPublishedDate1648742662434
]
