/**
 * Copyright 2019 City of Los Angeles
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

import { AccessTokenScopeValidator, ApiErrorHandlingMiddleware, checkAccess } from '@mds-core/mds-api-server'
import db from '@mds-core/mds-db'
import { GeographyServiceClient } from '@mds-core/mds-geography-service'
import {
  AlreadyPublishedError,
  BadParamsError,
  ConflictError,
  DependencyMissingError,
  InsufficientPermissionsError,
  NotFoundError,
  pathPrefix,
  ServerError,
  ValidationError
} from '@mds-core/mds-utils'
import express from 'express'
import { GeographyAuthorLogger } from './logger'
import { GeographyAuthorApiVersionMiddleware } from './middleware'
import {
  GeographyAuthorApiAccessTokenScopes,
  GeographyAuthorApiDeleteGeographyRequest,
  GeographyAuthorApiDeleteGeographyResponse,
  GeographyAuthorApiGetGeographyMetadataRequest,
  GeographyAuthorApiGetGeographyMetadataResponse,
  GeographyAuthorApiGetGeographyMetadatumRequest,
  GeographyAuthorApiGetGeographyMetadatumResponse,
  GeographyAuthorApiPostGeographyRequest,
  GeographyAuthorApiPostGeographyResponse,
  GeographyAuthorApiPublishGeographyRequest,
  GeographyAuthorApiPublishGeographyResponse,
  GeographyAuthorApiPutGeographyMetadataRequest,
  GeographyAuthorApiPutGeographyMetadataResponse,
  GeographyAuthorApiPutGeographyRequest,
  GeographyAuthorApiPutGeographyResponse
} from './types'

const checkGeographyAuthorApiAccess = (validator: AccessTokenScopeValidator<GeographyAuthorApiAccessTokenScopes>) =>
  checkAccess(validator)

function api(app: express.Express): express.Express {
  app.use(GeographyAuthorApiVersionMiddleware)

  app.get(
    pathPrefix('/geographies/meta/'),
    checkGeographyAuthorApiAccess(scopes => {
      return scopes.includes('geographies:read:published') || scopes.includes('geographies:read:unpublished')
    }),
    async (
      req: GeographyAuthorApiGetGeographyMetadataRequest,
      res: GeographyAuthorApiGetGeographyMetadataResponse,
      next: express.NextFunction
    ) => {
      const { scopes } = res.locals
      const { get_published, get_unpublished } = req.query
      const params = {
        get_published: get_published ? get_published === 'true' : null,
        get_unpublished: get_unpublished ? get_unpublished === 'true' : null
      }

      /* If the user can only read published geos, and all they want is the unpublished metadata,
       * throw a permissions error.
       */
      try {
        if (!scopes.includes('geographies:read:unpublished') && params.get_unpublished) {
          throw new InsufficientPermissionsError(
            'Cannot require unpublished geo metadata without geography:read:unpublished scope'
          )
        }

        /* If the user has only the read:published scope, they should not be allowed to see
         * unpublished geos. If they didn't supply any params, we modify them here so as to
         * filter only for published geo metadata. We have to monkey with the params here
         * in a way that we don't for the bulk read of the geographies since we can't filter
         * the DB results in this layer, since metadata has no idea if the geo it's associated
         * with is published or not.
         */
        if (
          !scopes.includes('geographies:read:unpublished') &&
          params.get_unpublished === null &&
          params.get_published === null
        ) {
          params.get_published = true
        }
        const geography_metadata = await db.readBulkGeographyMetadata(params)
        return res.status(200).send({ version: res.locals.version, data: { geography_metadata } })
      } catch (error) {
        GeographyAuthorLogger.warn('failed to read geography metadata', error)
        /* This error is thrown if both get_published and get_unpublished are set.
         * To get all geos, neither parameter should be set.
         */
        if (error instanceof BadParamsError) {
          return res.status(400).send({ error })
        }
        if (error instanceof InsufficientPermissionsError) {
          return res.status(403).send({ error })
        }
        return next(error)
      }
    }
  )

  app.post(
    pathPrefix('/geographies/'),
    checkGeographyAuthorApiAccess(scopes => scopes.includes('geographies:write')),
    async (
      req: GeographyAuthorApiPostGeographyRequest,
      res: GeographyAuthorApiPostGeographyResponse,
      next: express.NextFunction
    ) => {
      const geography = req.body

      try {
        const [recorded_geography] = await GeographyServiceClient.writeGeographies([geography])
        return res.status(201).send({ version: res.locals.version, data: { geography: recorded_geography } })
      } catch (error) {
        GeographyAuthorLogger.warn('POST /geographies failed', error.stack)
        if (error instanceof ConflictError) {
          return res.status(409).send({ error })
        }
        if (error instanceof ValidationError) {
          return res.status(400).send({ error })
        }
        /* istanbul ignore next */
        /* istanbul ignore next */
        return next(error)
      }
    }
  )

  app.put(
    pathPrefix('/geographies/:geography_id'),
    checkGeographyAuthorApiAccess(scopes => scopes.includes('geographies:write')),
    async (
      req: GeographyAuthorApiPutGeographyRequest,
      res: GeographyAuthorApiPutGeographyResponse,
      next: express.NextFunction
    ) => {
      const geography = req.body
      try {
        await GeographyServiceClient.editGeography(geography)
        return res.status(201).send({ version: res.locals.version, data: { geography } })
      } catch (error) {
        GeographyAuthorLogger.warn('failed to edit geography', error.stack)
        if (error instanceof NotFoundError) {
          return res.status(404).send({ error })
        }
        if (error instanceof ValidationError) {
          return res.status(400).send({ error })
        }
        return next(error)
      }
    }
  )

  app.delete(
    pathPrefix('/geographies/:geography_id'),
    checkGeographyAuthorApiAccess(scopes => scopes.includes('geographies:write')),
    async (
      req: GeographyAuthorApiDeleteGeographyRequest,
      res: GeographyAuthorApiDeleteGeographyResponse,
      next: express.NextFunction
    ) => {
      const { geography_id } = req.params
      try {
        const isPublished = await db.isGeographyPublished(geography_id)
        if (isPublished) {
          throw new AlreadyPublishedError('Cannot delete an already published geography')
        }
        try {
          await db.deleteGeographyMetadata(geography_id)
        } catch (err) {
          /* No reason to let this bubble up. It's legit for metadata to not exist, and it
           * seems wrong to throw an error for deleting metadata when this endpoint is mainly
           * about deleting geographies.
           */
          GeographyAuthorLogger.debug(`Unable to delete nonexistent metadata for ${geography_id}`)
        }
        await db.deleteGeography(geography_id)
        return res.status(200).send({
          version: res.locals.version,
          data: { geography_id }
        })
      } catch (err) {
        GeographyAuthorLogger.warn('failed to delete geography', err.stack)
        if (err instanceof NotFoundError) {
          return res.status(404).send({ error: err })
        }
        if (err instanceof AlreadyPublishedError) {
          return res.status(405).send({ error: err })
        }
        return next(err)
      }
    }
  )

  app.get(
    pathPrefix('/geographies/:geography_id/meta'),
    checkGeographyAuthorApiAccess(scopes => {
      return scopes.includes('geographies:read:published') || scopes.includes('geographies:read:unpublished')
    }),
    async (
      req: GeographyAuthorApiGetGeographyMetadatumRequest,
      res: GeographyAuthorApiGetGeographyMetadatumResponse,
      next: express.NextFunction
    ) => {
      const { geography_id } = req.params
      try {
        const geography_metadata = await db.readSingleGeographyMetadata(geography_id)
        const geography = await db.readSingleGeography(geography_id)
        if (!geography.publish_date && !res.locals.scopes.includes('geographies:read:unpublished')) {
          throw new InsufficientPermissionsError('permission to read metadata of unpublished geographies missing')
        }
        return res.status(200).send({ version: res.locals.version, data: { geography_metadata } })
      } catch (err) {
        GeographyAuthorLogger.warn('failed to read geography metadata', err.stack)
        if (err instanceof NotFoundError) {
          return res.status(404).send({ error: err })
        }
        if (err instanceof InsufficientPermissionsError) {
          return res.status(403).send({ error: err })
        }
        return next(new ServerError())
      }
    }
  )

  app.put(
    pathPrefix('/geographies/:geography_id/meta'),
    checkGeographyAuthorApiAccess(scopes => scopes.includes('geographies:write')),
    async (
      req: GeographyAuthorApiPutGeographyMetadataRequest,
      res: GeographyAuthorApiPutGeographyMetadataResponse,
      next: express.NextFunction
    ) => {
      const geography_metadata = req.body
      try {
        await db.updateGeographyMetadata(geography_metadata)
        return res.status(200).send({ version: res.locals.version, data: { geography_metadata } })
      } catch (updateErr) {
        if (updateErr instanceof NotFoundError) {
          try {
            await db.writeGeographyMetadata(geography_metadata)
            return res.status(201).send({ version: res.locals.version, data: { geography_metadata } })
          } catch (writeErr) {
            GeographyAuthorLogger.warn('failed to write geography metadata', writeErr.stack)
            if (writeErr instanceof DependencyMissingError) {
              return res.status(404).send({ error: writeErr })
            }
            return next(writeErr)
          }
        } else {
          return next(updateErr)
        }
      }
    }
  )

  app
    .put(
      pathPrefix('/geographies/:geography_id/publish'),
      checkGeographyAuthorApiAccess(scopes => scopes.includes('geographies:publish')),
      async (
        req: GeographyAuthorApiPublishGeographyRequest,
        res: GeographyAuthorApiPublishGeographyResponse,
        next: express.NextFunction
      ) => {
        const { geography_id } = req.params
        try {
          await db.publishGeography({ geography_id })
          const published_geo = await db.readSingleGeography(geography_id)
          return res.status(200).send({ version: res.locals.version, data: { geography: published_geo } })
        } catch (updateErr) {
          if (updateErr instanceof NotFoundError) {
            return res.status(404).send({ error: `unable to find geography of ${geography_id}` })
          }
          return next(new ServerError(updateErr))
        }
      }
    )
    .use(ApiErrorHandlingMiddleware)

  return app
}

export { api }
