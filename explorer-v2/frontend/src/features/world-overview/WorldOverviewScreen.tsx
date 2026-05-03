import BottomModeTabs from '../../components/shell/BottomModeTabs';
import WorldOverviewLeftPanel from './WorldOverviewLeftPanel';
import WorldSituationPanel from './WorldSituationPanel';
import WorldTimeline from './WorldTimeline';

export default function WorldOverviewScreen() {
  return (
    <>
      <WorldOverviewLeftPanel />
      <WorldSituationPanel />
      <BottomModeTabs active="overview" />
      <WorldTimeline />
    </>
  );
}
