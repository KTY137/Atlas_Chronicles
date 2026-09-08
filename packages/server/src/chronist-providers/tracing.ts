// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/** Explicit host policy, invoked at startup. Importing modules remains effect-free. */
export function disableChronistTracing(): void {
  process.env["LANGSMITH_TRACING"] = "false";
  process.env["LANGSMITH_TRACING_V2"] = "false";
  process.env["LANGCHAIN_TRACING_V2"] = "false";
  // @langchain/core's legacy branch tests truthiness, so the string "false" enables it.
  process.env["LANGCHAIN_TRACING"] = "";
}
