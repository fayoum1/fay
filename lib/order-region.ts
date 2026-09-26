export function parseOrderRegion(region: string | null | undefined) {
  if (!region || region === "*") return null;
  const separator = region.indexOf(" - ");
  if (separator < 0) return { governorate: region.trim(), district: null };
  return {
    governorate: region.slice(0, separator).trim(),
    district: region.slice(separator + 3).trim(),
  };
}

export function orderMatchesRegions(
  regions: readonly string[] | null | undefined,
  governorate: string,
  district: string | null,
  mode: "include" | "exclude" = "include",
) {
  const matches = Boolean(regions?.some((region) => {
    if (region === "*") return true;
    const location = parseOrderRegion(region);
    if (!location || location.governorate !== governorate) return false;
    return location.district ? location.district === district : !district;
  }));
  return mode === "exclude" ? !matches : matches;
}