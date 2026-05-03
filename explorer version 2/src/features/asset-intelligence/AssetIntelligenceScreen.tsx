import BottomModeTabs from '../../components/shell/BottomModeTabs';
import BottomTimelineDock from '../../components/shell/BottomTimelineDock';
import AircraftIntelligencePanel from './AircraftIntelligencePanel';
import AssetLayerPanel from './AssetLayerPanel';

export default function AssetIntelligenceScreen() {
  return (
    <>
      <AssetLayerPanel />
      <AircraftIntelligencePanel />
      <BottomModeTabs active="assets" />
      <BottomTimelineDock variant="asset" />
    </>
  );
}
