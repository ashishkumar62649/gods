import { useEffect } from 'react';
import CesiumStage from '../earth/CesiumStage';
import AssetIntelligenceScreen from '../features/asset-intelligence/AssetIntelligenceScreen';
import LocationIntelligenceScreen from '../features/location-intelligence/LocationIntelligenceScreen';
import WatchZonesScreen from '../features/watch-zones/WatchZonesScreen';
import WorldOverviewScreen from '../features/world-overview/WorldOverviewScreen';
import { useUiStore } from '../store/uiStore';
import FloatingMapControls from '../components/shell/FloatingMapControls';
import LeftIconRail from '../components/shell/LeftIconRail';
import StatusFooter from '../components/shell/StatusFooter';
import TopBar from '../components/shell/TopBar';
import { startLiveMockFeed } from '../store/liveDataStore';

export default function AppShell() {
  const mode = useUiStore((state) => state.mode);

  useEffect(() => startLiveMockFeed(), []);

  return (
    <main className={`god-app-shell mode-${mode}`}>
      <CesiumStage />
      <div className="god-ui-layer">
        <TopBar />
        <LeftIconRail />
        {mode === 'world-overview' ? <WorldOverviewScreen /> : null}
        {mode === 'asset-intelligence' ? <AssetIntelligenceScreen /> : null}
        {mode === 'watch-zones' ? <WatchZonesScreen /> : null}
        {mode === 'location-intelligence' ? <LocationIntelligenceScreen /> : null}
        <FloatingMapControls />
        <StatusFooter />
      </div>
    </main>
  );
}
