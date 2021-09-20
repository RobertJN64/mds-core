# @mds-core/mds-ingest-service

## 0.4.3

### Patch Changes

- Updated dependencies [d8b10031]
  - @mds-core/mds-types@0.5.1
  - @mds-core/mds-agency-cache@0.2.7
  - @mds-core/mds-providers@0.1.36
  - @mds-core/mds-repository@0.1.12
  - @mds-core/mds-rpc-common@0.1.12
  - @mds-core/mds-schema-validators@0.3.3
  - @mds-core/mds-service-helpers@0.3.5
  - @mds-core/mds-stream@0.1.38
  - @mds-core/mds-utils@0.2.1

## 0.4.2

### Patch Changes

- 015b3afd: Add id column to streamed/cached events
- Updated dependencies [61e31276]
- Updated dependencies [0f548b7f]
  - @mds-core/mds-types@0.5.0
  - @mds-core/mds-utils@0.2.0
  - @mds-core/mds-rpc-common@0.1.11
  - @mds-core/mds-schema-validators@0.3.2
  - @mds-core/mds-agency-cache@0.2.6
  - @mds-core/mds-providers@0.1.35
  - @mds-core/mds-repository@0.1.11
  - @mds-core/mds-service-helpers@0.3.4
  - @mds-core/mds-stream@0.1.37

## 0.4.1

### Patch Changes

- 1579e76e: Add getTripEvents service method
- Updated dependencies [9af14cbb]
- Updated dependencies [9af14cbb]
  - @mds-core/mds-logger@0.2.4
  - @mds-core/mds-agency-cache@0.2.5
  - @mds-core/mds-repository@0.1.10
  - @mds-core/mds-rpc-common@0.1.10
  - @mds-core/mds-service-helpers@0.3.3
  - @mds-core/mds-stream@0.1.36
  - @mds-core/mds-utils@0.1.36
  - @mds-core/mds-schema-validators@0.3.1

## 0.4.0

### Minor Changes

- 0e0abffd: added getTripEvents to mds-ingest-service

### Patch Changes

- 15fbc633: Synchronize mds-ingest-service schema/models

## 0.3.4

### Patch Changes

- Updated dependencies [439f92c5]
  - @mds-core/mds-schema-validators@0.3.0
  - @mds-core/mds-types@0.4.0
  - @mds-core/mds-rpc-common@0.1.9
  - @mds-core/mds-agency-cache@0.2.4
  - @mds-core/mds-providers@0.1.34
  - @mds-core/mds-repository@0.1.9
  - @mds-core/mds-service-helpers@0.3.2
  - @mds-core/mds-stream@0.1.35
  - @mds-core/mds-utils@0.1.35

## 0.3.3

### Patch Changes

- 1cb521ca: Add service method for getting latest telemetry for a list of devices
- ba33f76a: Add cache and stream hooks to ingest migration processor
- e3fc9d1e: Filter register events from the incoming 0.4 stream

## 0.3.2

### Patch Changes

- Updated dependencies [b6802757]
  - @mds-core/mds-utils@0.1.34
  - @mds-core/mds-schema-validators@0.2.3
  - @mds-core/mds-repository@0.1.8
  - @mds-core/mds-service-helpers@0.3.1
  - @mds-core/mds-rpc-common@0.1.8

## 0.3.1

### Patch Changes

- 0b917ead: Persist migrated entities to database
- Updated dependencies [e0860f5b]
- Updated dependencies [6609400b]
  - @mds-core/mds-service-helpers@0.3.0
  - @mds-core/mds-types@0.3.2
  - @mds-core/mds-rpc-common@0.1.7
  - @mds-core/mds-providers@0.1.33
  - @mds-core/mds-repository@0.1.7
  - @mds-core/mds-schema-validators@0.2.2
  - @mds-core/mds-utils@0.1.33

## 0.3.0

### Minor Changes

- 12455bee: Implement filtering vehicle events by geography ids.

### Patch Changes

- Updated dependencies [5eb4121b]
- Updated dependencies [7e56b9b6]
- Updated dependencies [5eb4121b]
  - @mds-core/mds-service-helpers@0.2.0
  - @mds-core/mds-providers@0.1.32
  - @mds-core/mds-types@0.3.1
  - @mds-core/mds-rpc-common@0.1.6
  - @mds-core/mds-repository@0.1.6
  - @mds-core/mds-schema-validators@0.2.1
  - @mds-core/mds-utils@0.1.32

## 0.2.0

### Minor Changes

- 24231359: Remove delta, service_area_id, and timestamp_long from a variety of vehicle event types
- aeedb169: Add new foreign key to event_annotations to associate with events.

### Patch Changes

- 93493a19: Move testEnvSafeguard method to mds-utils
- da513885: Add missing name property to mds-ingst-service migration AddEventsRowIdColumn1627427307591
- Updated dependencies [24231359]
- Updated dependencies [93493a19]
  - @mds-core/mds-schema-validators@0.2.0
  - @mds-core/mds-types@0.3.0
  - @mds-core/mds-utils@0.1.31
  - @mds-core/mds-providers@0.1.31
  - @mds-core/mds-repository@0.1.5
  - @mds-core/mds-rpc-common@0.1.5
  - @mds-core/mds-service-helpers@0.1.5

## 0.1.5

### Patch Changes

- 62a188ae: Add initial ingest migration processor

## 0.1.4

### Patch Changes

- 8ab4569d: Minor patch change for every package to get versioning aligned with changeset workflows
- Updated dependencies [8ab4569d]
  - @mds-core/mds-logger@0.2.3
  - @mds-core/mds-providers@0.1.30
  - @mds-core/mds-repository@0.1.4
  - @mds-core/mds-rpc-common@0.1.4
  - @mds-core/mds-schema-validators@0.1.6
  - @mds-core/mds-service-helpers@0.1.4
  - @mds-core/mds-types@0.2.1
  - @mds-core/mds-utils@0.1.30

## 0.1.3

### Patch Changes

- 156e1121: rework Paginator.paginate, to work well
- Updated dependencies [cc0a3bae]
  - @mds-core/mds-types@0.2.0
  - @mds-core/mds-providers@0.1.29
  - @mds-core/mds-repository@0.1.3
  - @mds-core/mds-rpc-common@0.1.3
  - @mds-core/mds-schema-validators@0.1.5
  - @mds-core/mds-service-helpers@0.1.3
  - @mds-core/mds-utils@0.1.29