import { expect, test } from "bun:test";
import { handleLegacyMessage, parseConnectionQuery } from "../../src/interfaces/websocket/presence-protocol";
import { PRESENCE_TOPIC } from "../../src/interfaces/websocket/presence-topics";
import { INTERN_TOPICS } from "../../src/interfaces/websocket/topics";

test("presence WebSocket contract keeps the legacy messages and query validation", () => {
  const messages: string[] = [];
  let snapshot = 0;
  handleLegacyMessage("ping", message => messages.push(message), () => { snapshot++; });
  handleLegacyMessage('{"type":"ping"}', message => messages.push(message), () => { snapshot++; });
  handleLegacyMessage('{"type":"get_presence"}', message => messages.push(message), () => { snapshot++; });
  expect(messages[0]).toBe("pong");
  expect(messages[1]).toMatch(/^\{"type":"pong","timestamp":\d+\}$/);
  expect(snapshot).toBe(1);
  expect(PRESENCE_TOPIC).toBe("metrics:presence");
  expect(INTERN_TOPICS.public).toBe("intern:public");
  expect(parseConnectionQuery(new URL("http://localhost/ws?role=visitor&visitorId=browser.a:1"))).toEqual({ role: "visitor", visitorId: "browser.a:1" });
});
