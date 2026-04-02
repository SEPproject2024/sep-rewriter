/**
 * Quick test for specific cases. Usage: npx tsx prompts/test-quick.ts
 */
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const v2Raw = readFileSync(resolve(__dirname, "./v2-hybrid.md"), "utf-8");
const v2Match = v2Raw.match(/```\n([\s\S]*?)\n```/);
const V2_PROMPT = v2Match ? v2Match[1].trim() : "";

const CASES = [
  "我好想被理解但不知道怎麼表達",
  "我想改變但不知道從哪開始",
  "我不知道自己到底要什麼",
  "我知道該做什麼但就是動不了",
  "我好想離開現在的生活但又不敢",
];

async function rewrite(thought: string): Promise<string> {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    system: V2_PROMPT,
    messages: [{ role: "user", content: thought }],
  });
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

async function main() {
  console.log("v2 — 指控型念頭測試（修正後）\n");
  for (const c of CASES) {
    // Run 2 times each to check consistency
    const [r1, r2] = await Promise.all([rewrite(c), rewrite(c)]);
    console.log(`「${c}」`);
    console.log(`  → ${r1}`);
    console.log(`  → ${r2}`);
    console.log();
  }
}

main().catch(console.error);
