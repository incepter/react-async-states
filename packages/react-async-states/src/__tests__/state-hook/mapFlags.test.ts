import {mapFlags} from "../../shared/mapFlags";

describe('mapFlags', () => {
  it('should decode flags in production', () => {
    let currentProcessEnv = process.env.NODE_ENV
    process.env.NODE_ENV = "production"
    expect(mapFlags(15)).toEqual([])
    process.env.NODE_ENV = currentProcessEnv
  });
  it('should decode flags in development', () => {
    let currentProcessEnv = process.env.NODE_ENV
    process.env.NODE_ENV = "development"
    // @ts-ignore
    expect(mapFlags(null)).toEqual([])
    // @ts-ignore
    expect(mapFlags(undefined)).toEqual([])
    expect(mapFlags(17652)).toEqual([
      "CONFIG_SOURCE",
      "SOURCE",
      "LANE",
      "AUTO_RUN"
    ])
    process.env.NODE_ENV = currentProcessEnv
  });
});
