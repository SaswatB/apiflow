export function onRenderer(params:object) {
  return (process && process.type === 'renderer') ? params : {};
}