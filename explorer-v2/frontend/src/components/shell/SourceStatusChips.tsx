import { useEffect, useState } from 'react';
import { fetchSourceHealth, type SourceHealthRow } from '../../core/api/sourceHealthApi';
import SourceBadge from '../cards/SourceBadge';

export default function SourceStatusChips() {
  const [sources, setSources] = useState<SourceHealthRow[]>([]);
  const [status, setStatus] = useState<'loading' | 'live' | 'offline'>('loading');

  useEffect(() => {
    const controller = new AbortController();
    fetchSourceHealth(controller.signal)
      .then((rows) => {
        setSources(rows.slice(0, 2));
        setStatus(rows.length > 0 ? 'live' : 'offline');
      })
      .catch(() => {
        setSources([]);
        setStatus('offline');
      });
    return () => controller.abort();
  }, []);

  const visibleSources =
    sources.length > 0
      ? sources
      : [{
          source_id: 'source-health',
          source_name: 'Source health',
          operational_status: status === 'loading' ? 'loading' : 'backend unavailable',
        }];

  return (
    <div className="source-chips">
      {visibleSources.map((source) => (
        <SourceBadge
          detail={source.operational_status ?? source.status ?? 'pending'}
          key={source.source_id ?? source.source_key ?? source.source_name}
          label={source.source_name ?? source.display_name ?? source.source_id ?? 'Source'}
        />
      ))}
    </div>
  );
}
