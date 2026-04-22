import {
  ArcGisBaseMapType,
  ArcGisMapServerImageryProvider,
  IonImageryProvider,
  IonWorldImageryStyle,
  OpenStreetMapImageryProvider,
  TileMapServiceImageryProvider,
  createWorldImageryAsync,
} from 'cesium';
import type { ImageryOption } from './viewerTypes';

function toImageryId(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function buildImageryOptions(): ImageryOption[] {
  const iconBase = '/cesium/Widgets/Images/ImageryProviders';

  const options: Omit<ImageryOption, 'id'>[] = [
    {
      name: 'Bing Maps Aerial',
      tooltip: 'Bing Maps aerial imagery, provided by Cesium ion.',
      iconUrl: `${iconBase}/bingAerial.png`,
      create: () =>
        createWorldImageryAsync({ style: IonWorldImageryStyle.AERIAL }),
    },
    {
      name: 'Bing Maps Aerial with Labels',
      tooltip: 'Bing Maps aerial imagery with labels, provided by Cesium ion.',
      iconUrl: `${iconBase}/bingAerialLabels.png`,
      create: () =>
        createWorldImageryAsync({
          style: IonWorldImageryStyle.AERIAL_WITH_LABELS,
        }),
    },
    {
      name: 'Bing Maps Roads',
      tooltip: 'Bing Maps road map, provided by Cesium ion.',
      iconUrl: `${iconBase}/bingRoads.png`,
      create: () => createWorldImageryAsync({ style: IonWorldImageryStyle.ROAD }),
    },
    {
      name: 'ArcGIS World Imagery',
      tooltip: 'ArcGIS satellite imagery.',
      iconUrl: `${iconBase}/ArcGisMapServiceWorldImagery.png`,
      create: () =>
        ArcGisMapServerImageryProvider.fromBasemapType(
          ArcGisBaseMapType.SATELLITE,
          { enablePickFeatures: false },
        ),
    },
    {
      name: 'ArcGIS World Hillshade',
      tooltip: 'ArcGIS elevation hillshade map.',
      iconUrl: `${iconBase}/ArcGisMapServiceWorldHillshade.png`,
      create: () =>
        ArcGisMapServerImageryProvider.fromBasemapType(
          ArcGisBaseMapType.HILLSHADE,
          { enablePickFeatures: false },
        ),
    },
    {
      name: 'Esri World Ocean',
      tooltip: 'Esri ocean-focused base map.',
      iconUrl: `${iconBase}/ArcGisMapServiceWorldOcean.png`,
      create: () =>
        ArcGisMapServerImageryProvider.fromBasemapType(
          ArcGisBaseMapType.OCEANS,
          { enablePickFeatures: false },
        ),
    },
    {
      name: 'OpenStreetMap',
      tooltip: 'OpenStreetMap collaborative world map.',
      iconUrl: `${iconBase}/openStreetMap.png`,
      create: () =>
        new OpenStreetMapImageryProvider({
          url: 'https://tile.openstreetmap.org/',
        }),
    },
    {
      name: 'Stadia Watercolor',
      tooltip: 'Hand-drawn watercolor map style from Stadia and Stamen.',
      iconUrl: `${iconBase}/stamenWatercolor.png`,
      create: () =>
        new OpenStreetMapImageryProvider({
          url: 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/',
          fileExtension: 'jpg',
        }),
    },
    {
      name: 'Stadia Toner',
      tooltip: 'High-contrast black and white map style.',
      iconUrl: `${iconBase}/stamenToner.png`,
      create: () =>
        new OpenStreetMapImageryProvider({
          url: 'https://tiles.stadiamaps.com/tiles/stamen_toner/',
          retinaTiles: typeof window !== 'undefined' && window.devicePixelRatio >= 2,
        }),
    },
    {
      name: 'Stadia Alidade Smooth',
      tooltip: 'Muted map style for overlays.',
      iconUrl: `${iconBase}/stadiaAlidadeSmooth.png`,
      create: () =>
        new OpenStreetMapImageryProvider({
          url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/',
          retinaTiles: typeof window !== 'undefined' && window.devicePixelRatio >= 2,
        }),
    },
    {
      name: 'Stadia Alidade Smooth Dark',
      tooltip: 'Dark muted map style for overlays.',
      iconUrl: `${iconBase}/stadiaAlidadeSmoothDark.png`,
      create: () =>
        new OpenStreetMapImageryProvider({
          url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/',
          retinaTiles: typeof window !== 'undefined' && window.devicePixelRatio >= 2,
        }),
    },
    {
      name: 'Sentinel-2',
      tooltip: 'Sentinel-2 cloudless imagery from Cesium ion.',
      iconUrl: `${iconBase}/sentinel-2.png`,
      create: () => IonImageryProvider.fromAssetId(3954),
    },
    {
      name: 'Blue Marble',
      tooltip: 'NASA Blue Marble imagery.',
      iconUrl: `${iconBase}/blueMarble.png`,
      create: () => IonImageryProvider.fromAssetId(3845),
    },
    {
      name: 'Earth at Night',
      tooltip: 'NASA Earth at Night imagery.',
      iconUrl: `${iconBase}/earthAtNight.png`,
      create: () => IonImageryProvider.fromAssetId(3812),
    },
    {
      name: 'Natural Earth II',
      tooltip: 'Natural Earth II darkened for contrast.',
      iconUrl: `${iconBase}/naturalEarthII.png`,
      create: () =>
        TileMapServiceImageryProvider.fromUrl('/cesium/Assets/Textures/NaturalEarthII'),
    },
  ];

  return options.map((option) => ({
    ...option,
    id: toImageryId(option.name),
  }));
}
