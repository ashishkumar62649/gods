import SearchBox from '../../earth/search/SearchBox';
import { useMapStore } from '../../core/store/useMapStore';

export default function SearchPanel() {
  const requestSearch = useMapStore((state) => state.requestSearch);

  return <SearchBox onSearch={requestSearch} />;
}
