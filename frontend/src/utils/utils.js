export const getChangedFields = (initial, current) => {
  const changed = {};

  Object.keys(current).forEach((key) => {
    if (initial[key] !== current[key]) {
      changed[key] = current[key];
    }
  });

  return changed;
};