import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { MESSAGE_MAX, messageText } from "../app/_lib/domain/messages";
import { rejectsWith } from "./fixtures";

describe("texto da mensagem", () => {
  test("acima do limite é recusado, sem cortar", () => {
    assert.throws(() => messageText("a".repeat(MESSAGE_MAX + 1)), rejectsWith("validation", "text"));
    assert.equal(messageText("a".repeat(MESSAGE_MAX)).length, MESSAGE_MAX);
  });

  test("quebra de linha do formulário (\\r\\n) conta como 1 caractere", () => {
    const text = `${"a".repeat(999)}\r\n${"b".repeat(1000)}`;
    assert.equal(messageText(text), `${"a".repeat(999)}\n${"b".repeat(1000)}`);
  });
});
