import { describe, it, expect } from 'vitest';
import {
  formatInatewsStatusLabel,
  isIndonesiaSeismicRegion,
  parseInatewsLastQlJson,
  parseInatewsLive30Xml,
  parseInatewsWaktuUtc,
} from '../src/lib/bmkg-realtime';

describe('BMKG InaTEWS Realtime Parsers', () => {
  it('parses live30event.xml UTC timestamp with slashes and double spaces', () => {
    expect(parseInatewsWaktuUtc('2026/11/28  11:07:21.119')).toBe('2026-11-28T11:07:21.119Z');
    expect(parseInatewsWaktuUtc('2026/11/28 08:30:40')).toBe('2026-11-28T08:30:40.000Z');
  });

  it('parses lastQL.json UTC timestamp with microseconds', () => {
    expect(parseInatewsWaktuUtc('2026-11-28 11:07:20.791561')).toBe('2026-11-28T11:07:20.791Z');
  });

  it('returns null for invalid or empty timestamps', () => {
    expect(parseInatewsWaktuUtc('')).toBeNull();
    expect(parseInatewsWaktuUtc(null)).toBeNull();
    expect(parseInatewsWaktuUtc('invalid-date')).toBeNull();
  });

  it('validates Indonesia seismic bounding box', () => {
    expect(isIndonesiaSeismicRegion(128.06, 1.42)).toBe(true);
    expect(isIndonesiaSeismicRegion(94.5, 5.03)).toBe(true);
    expect(isIndonesiaSeismicRegion(-71.5, -33.0)).toBe(false); // Chile
    expect(isIndonesiaSeismicRegion(140.0, 36.0)).toBe(false); // Japan
  });

  it('parses live30event.xml events and filters out non-Indonesia teleseismic events', () => {
    const sampleXml = `<?xml version="1.0"?>
<Infogempa>
  <gempa>
    <eventid>bmg2026xhpn</eventid>
    <status>confirmed</status>
    <waktu>2026/11/28  11:07:21.119</waktu>
    <lintang>1.42</lintang>
    <bujur>128.06</bujur>
    <dalam>123</dalam>
    <mag>4.2</mag>
    <fokal>mt_yes</fokal>
    <area>Halmahera, Indonesia</area>
  </gempa>
  <gempa>
    <eventid>bmg2026faraway</eventid>
    <status>confirmed</status>
    <waktu>2026/11/28  10:00:00.000</waktu>
    <lintang>-33.4</lintang>
    <bujur>-70.6</bujur>
    <dalam>40</dalam>
    <mag>6.0</mag>
    <fokal>undetermined</fokal>
    <area>Central Chile</area>
  </gempa>
</Infogempa>`;

    const parsed = parseInatewsLive30Xml(sampleXml);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual({
      eventId: 'bmg2026xhpn',
      status: 'confirmed',
      occurredAt: '2026-11-28T11:07:21.119Z',
      lat: 1.42,
      lng: 128.06,
      depthKm: 123,
      magnitude: 4.2,
      focalMechanism: 'mt_yes',
      area: 'Halmahera, Indonesia',
    });
  });

  it('parses lastQL.json GeoJSON with stringified coordinates and phase count', () => {
    const sampleLastQl = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            id: 'bmg2026xhpn',
            time: '2026-11-28 11:07:20.791561',
            mag: '4.062297',
            place: 'Halmahera, Indonesia',
            fase: '27',
            status: 'A',
            depth: '126.503960',
          },
          geometry: {
            type: 'Point',
            coordinates: ['128.084747', '1.409758', 1],
          },
        },
      ],
    };

    const parsed = parseInatewsLastQlJson(sampleLastQl);
    expect(parsed).toEqual({
      eventId: 'bmg2026xhpn',
      status: 'A',
      occurredAt: '2026-11-28T11:07:20.791Z',
      lat: 1.409758,
      lng: 128.084747,
      depthKm: 127,
      magnitude: 4.062297,
      area: 'Halmahera, Indonesia',
      phaseCount: 27,
    });
  });

  it('rejects lastQL.json outside Indonesia region', () => {
    const outsideLastQl = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            id: 'bmg2026jp',
            time: '2026-11-28 11:07:20.791561',
            mag: '5.5',
            place: 'Honshu, Japan',
            fase: '45',
            status: 'M',
            depth: '35',
          },
          geometry: {
            type: 'Point',
            coordinates: ['141.5', '38.2', 1],
          },
        },
      ],
    };

    expect(parseInatewsLastQlJson(outsideLastQl)).toBeNull();
  });

  it('formats InaTEWS status labels clearly', () => {
    expect(formatInatewsStatusLabel('confirmed')).toBe('Terkonfirmasi (InaTEWS)');
    expect(formatInatewsStatusLabel('M')).toBe('Terkonfirmasi (InaTEWS)');
    expect(formatInatewsStatusLabel('A')).toBe('Deteksi Otomatis (Preliminary)');
    expect(formatInatewsStatusLabel('automatic')).toBe('Deteksi Otomatis (Preliminary)');
  });
});
