import { Redirect, useLocalSearchParams } from "expo-router";
import { nationParams, nationSearch } from "../../../src/nation/home/search";

/** Public-opinion addresses from before the Nation screen took them keep their validated context. */
export default function ElectorateRoute() {
  const params = nationParams(nationSearch(useLocalSearchParams()));
  const query = Object.entries(params).flatMap(([key, value]) => (value ? [`${key}=${encodeURIComponent(value)}`] : []));
  return <Redirect href={`/nation${query.length ? `?${query.join("&")}` : ""}` as never} />;
}
