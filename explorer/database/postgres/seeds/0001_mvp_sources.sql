INSERT INTO sources (
  source_id,
  source_name,
  source_family,
  authority_level,
  access_type,
  base_reliability,
  priority_current,
  update_frequency,
  rate_limit_notes,
  normalizer_adapter,
  enabled,
  notes
) VALUES
  ('open_meteo', 'Open-Meteo', 'weather', 'aggregator', 'open', 0.850, 10, 'hourly/current', 'Respect public API limits.', 'open_meteo_adapter', true, 'MVP weather proof source.'),
  ('usgs_earthquake', 'USGS Earthquake Hazards Program', 'hazard', 'official', 'open', 0.950, 10, 'near real-time', null, 'usgs_earthquake_adapter', true, 'Later hazard MVP source.'),
  ('gdacs', 'Global Disaster Alert and Coordination System', 'hazard', 'official_aggregator', 'open', 0.900, 20, 'near real-time', null, 'gdacs_adapter', true, 'Later global disaster event source.'),
  ('nasa_firms', 'NASA FIRMS', 'wildfire', 'official', 'open', 0.900, 10, 'near real-time', 'Some endpoints require a MAP_KEY.', 'nasa_firms_adapter', true, 'Later active fire source.')
ON CONFLICT (source_id) DO UPDATE SET
  source_name = EXCLUDED.source_name,
  source_family = EXCLUDED.source_family,
  authority_level = EXCLUDED.authority_level,
  access_type = EXCLUDED.access_type,
  base_reliability = EXCLUDED.base_reliability,
  priority_current = EXCLUDED.priority_current,
  update_frequency = EXCLUDED.update_frequency,
  rate_limit_notes = EXCLUDED.rate_limit_notes,
  normalizer_adapter = EXCLUDED.normalizer_adapter,
  enabled = EXCLUDED.enabled,
  notes = EXCLUDED.notes;

