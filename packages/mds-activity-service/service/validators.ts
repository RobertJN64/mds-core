/**
 * Copyright 2022 City of Los Angeles
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

import { SchemaValidator } from '@mds-core/mds-schema-validators'
import type { ActivityDomainCreateModel, GetActivityOptions } from '../@types'

export const { validate: validateActivityDomainCreateModel, isValid: isValidActivityDomainCreateModel } =
  SchemaValidator<ActivityDomainCreateModel>({
    type: 'object',
    properties: {
      category: { type: 'string' },
      type: { type: 'string' },
      description: { type: 'string' },
      details: { type: 'object', nullable: true }
    },
    required: ['category', 'type', 'description']
  })

export const { validate: validateGetActivityOptions, isValid: isValidGetActivityOptions } =
  SchemaValidator<GetActivityOptions>({
    type: 'object',
    properties: {
      limit: { type: 'integer', minimum: 1, maximum: 1_000, nullable: true }
    },
    required: []
  })
