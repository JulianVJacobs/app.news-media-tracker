export const buildVisibleFieldSet = (
  groupVisibility: Record<string, boolean>,
  groupToFields: Record<string, readonly string[]>,
): Set<string> => {
  const result = new Set<string>();
  for (const [group, fields] of Object.entries(groupToFields)) {
    if (!groupVisibility[group]) {
      continue;
    }
    for (const field of fields) {
      result.add(field);
    }
  }
  return result;
};

export const filterRequiredFieldsByVisibility = (
  requiredFields: readonly string[] | undefined,
  visibleFields: Set<string>,
): string[] | undefined => {
  if (!requiredFields) {
    return undefined;
  }
  return requiredFields.filter((field) => visibleFields.has(field));
};
