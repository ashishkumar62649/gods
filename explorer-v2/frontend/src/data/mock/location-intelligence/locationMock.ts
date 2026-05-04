import type { LocationIntelligenceData } from '../../../features/location-intelligence/locationTypes';

export const locationMock: LocationIntelligenceData = {
  location: {
    name: 'Kolkata, West Bengal, India',
    coordinates: '22.57 deg N, 88.36 deg E',
    elevation: 'Elev. 9 m',
  },
  weather: {
    temperatureC: 29,
    feelsLikeC: 34,
    condition: 'Light Rain',
    wind: '14 km/h E',
    humidity: 82,
    pressureHpa: 1006,
    visibilityKm: 6,
    confidence: 86,
  },
  cards: [
    { title: 'Nearby Flights', value: '15', detail: 'Within 150 km', confidence: 82 },
    { title: 'Nearby Airports / Ports', value: '4', detail: 'CCU, IXB, HDC, KDS', confidence: 90 },
    { title: 'Nearby Fires (24h)', value: '8', detail: '0-50 km Moderate', confidence: 69 },
    { title: 'Nearby Earthquakes (7d)', value: '1', detail: 'Mag 3.2, 48 km ESE', confidence: 78 },
    { title: 'Population Exposure', value: '12.8M', detail: 'Within 100 km', confidence: 85 },
    { title: 'Latest News / Events', value: '3', detail: 'Heavy pre-monsoon showers', confidence: 74 },
    { title: 'Nearby Entities', value: '24', detail: 'Port, Navy, ONGC, DVC', confidence: 88 },
  ],
  risk: {
    score: 62,
    label: 'Moderate',
    factors: [
      { label: 'Weather', value: 65 },
      { label: 'Flooding', value: 58 },
      { label: 'Air Traffic', value: 40 },
      { label: 'Seismic', value: 20 },
      { label: 'Fire', value: 35 },
    ],
    confidence: 81,
  },
  sources: ['ECMWF', 'NOAA/VIIRS', 'USGS', 'NASA FIRMS', 'ADS-B Exchange'],
};
