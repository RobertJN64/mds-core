import assert from 'assert'
import { deepPickProperties } from '../deep-pick-properties'

describe('deepPickProperties', () => {
  it('Tests identity function (no paths)', () => {
    const entity = {
      telemetry: { gps: { lat: 1, lng: 2 } },
      event_type: 'foo'
    }
    const result = deepPickProperties(entity)

    assert.deepStrictEqual(result, entity)
  })

  it('Tests identity function (empty list of paths)', () => {
    const entity = { telemetry: { gps: { lat: 1, lng: 2, potato: 'potato' } }, event_type: 'foo' }
    const result = deepPickProperties(entity, [])

    assert.deepStrictEqual(result, entity)
  })

  it('Tests top-level property fetching', () => {
    const entity = { telemetry: { gps: { lat: 1, lng: 2, potato: 'potato' } }, event_type: 'foo' }
    const result = deepPickProperties(entity, ['event_type'])

    assert.deepStrictEqual(result, { event_type: entity.event_type })
  })

  it('Tests one-level nested property fetching', () => {
    const entity = { telemetry: { gps: { lat: 1, lng: 2, potato: 'potato' } }, event_type: 'foo' }
    const result = deepPickProperties(entity, ['telemetry.gps'])

    assert.deepStrictEqual(result, { telemetry: { gps: entity.telemetry.gps } })
  })

  it('Tests deeply nested property fetching', () => {
    const entity = { telemetry: { gps: { lat: 1, lng: 2, potato: 'potato' } }, event_type: 'foo' }
    const result = deepPickProperties(entity, ['telemetry.gps.lat'])

    assert.deepStrictEqual(result, { telemetry: { gps: { lat: entity.telemetry.gps.lat } } })
  })
})