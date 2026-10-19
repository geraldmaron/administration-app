import { useEffect, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import { Camera, GeoJSONSource, ImageSource, Layer, Map as NativeMap, type CameraRef, type LayerProps, type StyleSpecification } from "@maplibre/maplibre-react-native";
import { boundsOf, MAP_COLORS, MERCATOR_CORNERS, mapLayers, pickRegion, PIN_SOURCE, pinCollection, pinLayers, REGION_SOURCE, RELIEF_SOURCE } from "./style";
import type { MapCanvasProps, MapRegions, MapRelief } from "./types";

// The phone drawing: MapLibre Native, one GeoJSON source and the same layers
// the web draws. It needs an Expo development build; Expo Go has no MapLibre.

const EMPTY: MapRegions = { type: "FeatureCollection", features: [] };
const PADDING = { top: 16, right: 16, bottom: 16, left: 16 };
/** A press is read under the finger, not the default 44-point box, so a small state beside a large one is the one chosen. */
const HITBOX = { top: 4, right: 4, bottom: 4, left: 4 };

/** The sea alone: every region and the relief are children of the map, so they restyle without reloading the style. */
const SEA: StyleSpecification = { version: 8, sources: {}, layers: [{ id: "sea", type: "background", paint: { "background-color": MAP_COLORS.sea } }] };

function reliefSource(relief: MapRelief): string | number {
  return typeof relief === "object" ? relief.uri : relief;
}

const PIN_LAYERS = pinLayers();

export function MapCanvas({ regions, fills, camera, selected, chosen, focused, pins, onSelect, relief, reframe, zoom }: MapCanvasProps) {
  const cameraRef = useRef<CameraRef | null>(null);
  const [w, s, e, n] = boundsOf(camera);
  const chosenKey = (chosen ?? []).join("|");
  // The chosen set is keyed by its members, so a fresh array of the same regions does not rebuild the layers.
  const layers = useMemo(() => mapLayers({ fills, relief: relief !== undefined, ...(selected ? { selected } : {}), ...(chosen ? { chosen } : {}), ...(focused ? { focused } : {}) }), [fills, relief, selected, chosenKey, focused]);
  const regionLayers = layers.filter((layer) => layer.id !== "relief");
  const pinData = useMemo(() => pinCollection(pins ?? []), [pins]);
  useEffect(() => {
    cameraRef.current?.fitBounds([w, s, e, n], { padding: PADDING, duration: 600, easing: "ease" });
  }, [w, s, e, n, reframe]);
  const zoomRef = useRef(0);
  useEffect(() => {
    if (zoom.step === 0) return;
    zoomRef.current += zoom.by;
    cameraRef.current?.zoomTo(zoomRef.current, { duration: 300 });
  }, [zoom.step, zoom.by]);
  return (
    <NativeMap
      style={StyleSheet.absoluteFill}
      mapStyle={SEA}
      attribution={false}
      logo={false}
      compass={false}
      touchRotate={false}
      touchPitch={false}
      onRegionDidChange={(event) => {
        zoomRef.current = event.nativeEvent.zoom;
      }}
    >
      <Camera ref={cameraRef} initialViewState={{ bounds: [w, s, e, n], padding: PADDING }} minZoom={-1} maxZoom={9} />
      <GeoJSONSource
        id={REGION_SOURCE}
        data={(regions ?? EMPTY) as GeoJSON.FeatureCollection}
        hitbox={HITBOX}
        onPress={(event) => {
          const key = pickRegion(event.nativeEvent.features);
          if (key) onSelect(key);
        }}
      >
        {regionLayers.map((layer) => (
          <Layer key={layer.id} {...(layer as LayerProps)} />
        ))}
      </GeoJSONSource>
      <GeoJSONSource id={PIN_SOURCE} data={pinData}>
        {PIN_LAYERS.map((layer) => (
          // Over the seams and under the selection's light, as on the web, so a chosen state's outline stays on top.
          <Layer key={layer.id} {...(layer as LayerProps)} beforeId="focus-line" />
        ))}
      </GeoJSONSource>
      {relief === undefined ? null : (
        // Over the fills and under the seams, so the terrain shades the lens colors and every border stays crisp.
        <ImageSource id={RELIEF_SOURCE} url={reliefSource(relief)} coordinates={MERCATOR_CORNERS}>
          <Layer id="relief" type="raster" beforeId="world-seam" paint={{ "raster-opacity": 0.55, "raster-fade-duration": 0 }} />
        </ImageSource>
      )}
    </NativeMap>
  );
}
