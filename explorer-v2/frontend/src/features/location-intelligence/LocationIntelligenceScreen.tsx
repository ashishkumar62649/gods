import BottomTimelineDock from '../../components/shell/BottomTimelineDock';
import LocationIntelPanel from './LocationIntelPanel';
import LocationLayerPanel from './LocationLayerPanel';

export default function LocationIntelligenceScreen() {
  return (
    <>
      <LocationLayerPanel />
      <LocationIntelPanel />
      <BottomTimelineDock variant="location" />
    </>
  );
}
