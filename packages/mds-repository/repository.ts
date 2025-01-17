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

import type { MountedConfigFileReader } from '@mds-core/mds-config-files'
import { ConfigFileReader } from '@mds-core/mds-config-files'
import { asChunks, pluralize, tail, testEnvSafeguard } from '@mds-core/mds-utils'
import { bool, cleanEnv } from 'envalid'
import type { EntityMetadata, InsertQueryBuilder, Repository } from 'typeorm'
import { DataSource } from 'typeorm'
import type { ConnectionMode } from './connection'
import { ConnectionManager } from './connection'
import { RepositoryLogger as logger } from './logger'
import type { ModelMapper } from './mapper'
import { MapModels } from './mapper'
import { RepositoryMigrations } from './migrations'
export type { DataSource } from 'typeorm'

type EntityConstructor = Function

interface UnseededEntity {
  entity: EntityConstructor
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SeededEntity<From = any, To = any> extends UnseededEntity {
  seeder: {
    mapper: ModelMapper<From, To>
    reader?: MountedConfigFileReader
    upsert?: boolean
  }
}

type Entity = EntityConstructor | UnseededEntity | SeededEntity

export const isSeededEntity = (entity: Entity): entity is SeededEntity =>
  typeof entity !== 'function' && 'seeder' in entity

export const getEntityConstructor = (entity: Entity): EntityConstructor =>
  typeof entity === 'function' ? entity : entity.entity

export interface ReadOnlyRepositoryOptions {
  entities: Array<Exclude<Entity, SeededEntity>>
}

type Migration = Function

export interface ReadWriteRepositoryOptions {
  entities: Array<Entity>
  migrations: Array<Migration>
}

const runAllMigrationsUsingConnection = async (connection: DataSource): Promise<void> => {
  const {
    options: { migrationsTableName }
  } = connection
  if (migrationsTableName) {
    if (connection.migrations.length > 0) {
      const migrations = await connection.runMigrations({ transaction: 'all' })
      logger.info(
        `Ran ${migrations.length || 'no'} ${pluralize(
          migrations.length,
          'migration',
          'migrations'
        )} (${migrationsTableName})${
          migrations.length ? `: ${migrations.map(migration => migration.name).join(', ')}` : ''
        }`
      )
      logger.info(`Schema version (${migrationsTableName}): ${tail(connection.migrations).name}`)
    } else {
      logger.info(`No migrations defined (${migrationsTableName})`)
    }
  }
}

const revertAllMigrationsUsingConnection = async (connection: DataSource): Promise<void> => {
  const {
    options: { migrationsTableName }
  } = connection
  if (migrationsTableName) {
    const { migrations } = connection
    await migrations.reduce(p => p.then(() => connection.undoLastMigration()), Promise.resolve())
    logger.info(
      `Reverted ${migrations.length || 'no'} ${pluralize(
        migrations.length,
        'migration',
        'migrations'
      )} (${migrationsTableName})${
        migrations.length ? `: ${migrations.map(migration => migration.name).join(', ')}` : ''
      }`
    )
  }
}

const truncateAllTablesUsingConnection = async (
  connection: DataSource,
  entities: ReadWriteRepositoryOptions['entities']
): Promise<void> => {
  // Get the table names of every @Entity
  const tableNames = entities
    .map(entity => connection.getMetadata(getEntityConstructor(entity)))
    .filter(metadata => !metadata.expression) // An expression indicates an @Entity is a @ViewEntity which cannot be truncated
    .map(metadata => metadata.tableName)

  // Truncate all tables (including tables that have foreign-key references to any of the named tables) and restart the IDENTITY sequence
  await connection.query(`TRUNCATE ${tableNames} RESTART IDENTITY CASCADE`)
}

const asChunksForInsert = <TEntity>(entities: TEntity[], size = 4_000) => asChunks(entities, size)

const onConflictDoUpdate = <T>(insert: InsertQueryBuilder<T>, { metadata }: Repository<T>) => {
  const getColumnNames = (predicate: (column: EntityMetadata['columns'][number]) => boolean) =>
    metadata.columns.filter(predicate).map(column => column.propertyName)
  insert.orUpdate(
    getColumnNames(column => !(column.isPrimary || column.isGenerated)),
    insert.connection.namingStrategy.primaryKeyName(
      metadata.tableName,
      metadata.primaryColumns.map(column => column.propertyName)
    )
  )
  return insert
}

const EntitySeeder = (connection: DataSource, path?: string) => {
  try {
    const mount = ConfigFileReader.mount(path)
    logger.info(`R/W repository using data files mounted at ${mount.path}`)

    return {
      using: async <From, To>({
        entity,
        seeder: { mapper, reader = mount, upsert = false }
      }: SeededEntity<From, To>): Promise<void> => {
        const repository = connection.getRepository(entity)

        const {
          metadata: { tableName: table }
        } = repository

        // Additional log if entity not using default data file mount
        if (reader !== mount) {
          logger.info(`R/W repository using data file mounted at ${reader.path} for "${table}"`)
        }

        // Make sure the source data file exists
        if (!reader.configFileExists(table)) {
          return logger.info(`No data file found for "${table} at ${reader.path}`)
        }
        logger.info(`Found data file for "${table}"`)

        // Make sure the target table is empty or upsert mode is enabled
        if (upsert) {
          logger.info(`Seeding will be attempted ("upsert" mode is enabled)`)
        } else {
          const count = await repository.createQueryBuilder().getCount()
          if (count > 0) {
            return logger.info(
              `Seeding will be skipped ("${table}" table contains ${count} ${pluralize(
                count,
                'row',
                'rows'
              )} and "upsert" mode is disabled)`
            )
          }
          logger.info(`Seeding will be attempted ("${table}" table is empty)`)
        }

        try {
          const data = await reader.readConfigFile<Array<From>>(table)
          if (data.length === 0) {
            return logger.info(`Data file was empty or not an array`)
          }

          const query = repository.createQueryBuilder().insert().values(MapModels(data).using(mapper))

          const {
            identifiers: { length: inserted }
          } = await (upsert ? onConflictDoUpdate(query, repository) : query).execute()

          logger.info(
            `${upsert ? 'Upserted' : 'Inserted'} ${inserted} ${pluralize(inserted, 'row', 'rows')} into "${table}"`
          )
        } catch (error) {
          logger.error(`Seeding failed for "${table}}`, { error })
        }
      }
    }
  } catch {
    logger.info(`R/W repository data files not mounted`)
  }
}

export interface RepositoryPublicMethods {
  initialize: () => Promise<void>
  shutdown: () => Promise<void>
}

type RepositoryConnectionMethods<TConnectionMode extends ConnectionMode> = {
  connect: (mode: TConnectionMode) => Promise<DataSource>
  disconnect: (mode: TConnectionMode) => Promise<void>
}

export type ReadOnlyRepositoryProtectedMethods = RepositoryConnectionMethods<'ro'>

export type ReadOnlyRepositoryPublicMethods<T> = T & RepositoryPublicMethods

export const ReadOnlyRepository = {
  Create: <T extends {}>(
    name: string,
    { entities }: ReadOnlyRepositoryOptions,
    methods: (repository: ReadOnlyRepositoryProtectedMethods) => T
  ): ReadOnlyRepositoryPublicMethods<T> => {
    const manager = new ConnectionManager(name, { entities: entities.map(getEntityConstructor) })

    const connect = (mode: 'ro') => manager.connect(mode)

    const disconnect = (mode: 'ro') => manager.disconnect(mode)

    const initialize = async () => {
      logger.info(`Initializing R/O repository: ${name}`)
      await connect('ro')
    }

    const shutdown = async () => {
      logger.info(`Terminating R/O repository: ${name}`)
      await disconnect('ro')
    }

    return { connect, disconnect, initialize, shutdown, ...methods({ connect, disconnect }) }
  }
}

export type ReadWriteRepositoryProtectedMethods = RepositoryConnectionMethods<ConnectionMode> & {
  asChunksForInsert: <TEntity>(entities: TEntity[], size?: number) => Array<TEntity[]>
  onConflictDoUpdate: <T>(insert: InsertQueryBuilder<T>, { metadata }: Repository<T>) => InsertQueryBuilder<T>
}

export type ReadWriteRepositoryPublicMethods<T extends {}> = T &
  RepositoryPublicMethods & {
    cli: () => DataSource
    runAllMigrations: () => Promise<void>
    revertAllMigrations: () => Promise<void>
    truncateAllTables: (options?: Partial<{ unsafe: true }>) => Promise<void>
  }

export const ReadWriteRepository = {
  Create: <T extends {}>(
    name: string,
    { entities, migrations }: ReadWriteRepositoryOptions,
    methods: (repository: ReadWriteRepositoryProtectedMethods) => T
  ): ReadWriteRepositoryPublicMethods<T> => {
    const migrationsTableName = `${name}-migrations`
    const metadataTableName = `${name}-migration-metadata`

    const { connect, disconnect, ormconfig } = new ConnectionManager(name, {
      migrationsTableName,
      metadataTableName,
      entities: entities.map(getEntityConstructor),
      migrations: migrations.length === 0 ? [] : RepositoryMigrations(migrationsTableName).concat(migrations)
    })

    const runAllMigrations = async (): Promise<void> => runAllMigrationsUsingConnection(await connect('rw'))

    const revertAllMigrations = async (): Promise<void> => revertAllMigrationsUsingConnection(await connect('rw'))

    const truncateAllTables = async (options: Partial<{ unsafe: true }> = {}): Promise<void> => {
      if (!options.unsafe) {
        testEnvSafeguard()
      }
      return truncateAllTablesUsingConnection(await connect('rw'), entities)
    }

    const initialize = async () => {
      logger.info(`Initializing R/W repository: ${name}`)
      const [connection] = await Promise.all([connect('rw'), connect('ro')])

      // Enable migrations by default
      const { PG_MIGRATIONS } = cleanEnv(process.env, { PG_MIGRATIONS: bool({ default: migrations.length > 0 }) })

      if (PG_MIGRATIONS) {
        await runAllMigrations()
      }

      // Enabled seeding by default
      const { PG_SEED } = cleanEnv(process.env, {
        PG_SEED: bool({ default: entities.some(isSeededEntity) })
      })

      if (PG_SEED) {
        const seed = EntitySeeder(connection)
        if (seed) {
          for (const seeder of entities.filter(isSeededEntity)) {
            await seed.using(seeder)
          }
        }
      }
    }

    const shutdown = async () => {
      logger.info(`Terminating R/W repository: ${name}`)
      await Promise.all([disconnect('ro'), disconnect('rw')])
    }

    return {
      initialize,
      shutdown,
      cli: () => new DataSource(ormconfig('rw')),
      runAllMigrations,
      revertAllMigrations,
      truncateAllTables,
      ...methods({ connect, disconnect, asChunksForInsert, onConflictDoUpdate })
    }
  }
}
