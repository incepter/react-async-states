import 'isomorphic-fetch'
import {AsyncState} from "../../AsyncState";
import {mockDateNow} from "../utils/setup";
import {expect} from "@jest/globals";


mockDateNow();
describe('Native Response support', () => {
  function buildResponse(body: any, maxAge: number): Response {
    let response = new Response(body);
    response.headers.set("cache-control", `public, max-age=${maxAge}, must-revalidate, no-transform`);
    return response;
  }

  it('should support max-age header in response when present', async () => {
    let response = buildResponse(12, 500);
    // given
    expect(response.headers.get("cache-control")).toBe("public, max-age=500, must-revalidate, no-transform")
    let instance = new AsyncState("Response-test-1", undefined, {
      cacheConfig: {
        enabled: true,
      }
    });

    instance._source.setState(response);
    let firstCache = instance.cache![Object.keys(instance.cache!)[0]];
    expect(firstCache.deadline).toBe(500);
    expect(firstCache.state.data).toBe(response);
  });
});
