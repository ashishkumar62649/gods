import ActiveAlertsPanel from './ActiveAlertsPanel';
import ChangeHistoryTimeline from './ChangeHistoryTimeline';
import WatchZoneFilterBar from './WatchZoneFilterBar';
import WatchZoneLeftPanel from './WatchZoneLeftPanel';

export default function WatchZonesScreen() {
  return (
    <>
      <WatchZoneLeftPanel />
      <WatchZoneFilterBar />
      <ActiveAlertsPanel />
      <ChangeHistoryTimeline />
    </>
  );
}
