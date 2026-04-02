/**
 * Evaluate v2 outputs with Claude as judge.
 * Usage: npx tsx prompts/test-eval.ts
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

// --- Eval judge prompt ---
const JUDGE_PROMPT = `你是一個念頭改寫品質的評審。

使用者會給你一個「原始念頭」和「改寫結果」，請你用以下五個維度各打 1-5 分，並給一句簡短理由。

## 評分維度

1. **Insight（洞見）**：改寫有沒有讓人看到自己沒意識到的東西？
   - 5 = 讓人停頓三秒，「原來我真正在意的是這個」
   - 3 = 換了一個角度，但不算意外
   - 1 = 只是把同一件事換個說法

2. **Awareness（覺察）**：改寫有沒有幫人從「被念頭推著走」變成「看到自己有這個念頭」？
   - 5 = 明顯拉開了距離，從自動反應變成觀察者
   - 3 = 有一點距離，但不夠明確
   - 1 = 還是困在同一個框裡

3. **Agency（行動感）**：改寫有沒有讓人覺得自己可以做點什麼？
   - 5 = 有一個清晰的、溫柔的方向感
   - 3 = 有一點可能性，但不具體
   - 1 = 完全沒有方向感（注意：不是每句都需要高 agency，有些念頭 awareness 就夠了）
   - N/A = 這句的品質目標不是 agency，不適用

4. **連結度**：讀了會覺得「你懂我在說什麼」嗎？
   - 5 = 完全接住了念頭的核心情緒
   - 3 = 大致對了，但有點偏
   - 1 = 念頭被扭曲、跟原意斷裂

5. **語氣**：聽起來像朋友輕聲說的一句話？還是像心理師在做練習？
   - 5 = 完全自然，像自己心裡冒出來的
   - 3 = 還行，但有點刻意
   - 1 = 像教科書或心理諮商的句式

## 額外檢查

- 有沒有「替別人說話」？（例如「他其實也在乎你」）→ 如果有，連結度直接扣到 2 以下
- 有沒有說教感？（例如「你應該」「想開一點」）→ 如果有，語氣直接扣到 2 以下
- 品質目標命中了嗎？（根據念頭類型，主要應該命中 insight/awareness/agency 哪一個？命中了給 bonus 說明）

## 輸出格式（嚴格遵守）

用這個 JSON 格式回覆，不要有其他文字：

{
  "insight": { "score": 4, "reason": "..." },
  "awareness": { "score": 3, "reason": "..." },
  "agency": { "score": "N/A", "reason": "這句不需要 agency" },
  "connection": { "score": 5, "reason": "..." },
  "tone": { "score": 4, "reason": "..." },
  "target_hit": "awareness",
  "flags": [],
  "overall_note": "一句總評"
}

flags 可以是：["替別人說話", "說教感", "太空泛", "跟原意斷裂", "像教科書"]
如果沒有問題就留空陣列 []。`;

// --- Test cases ---
interface TestCase {
  input: string;
  ideal_quality: string;
  notes: string;
}

const TEST_CASES: TestCase[] = [
  { input: "我覺得不管怎麼努力都不夠好", ideal_quality: "awareness", notes: "絕對化+自我否定" },
  { input: "每次報告都被打槍，我是不是根本不適合這份工作", ideal_quality: "awareness", notes: "絕對化+分開事和人" },
  { input: "別人都過得比我好", ideal_quality: "awareness", notes: "比較型" },
  { input: "為什麼他就是不懂我", ideal_quality: "insight", notes: "對他人指控，底層是渴望被理解" },
  { input: "主管根本不重視我", ideal_quality: "insight", notes: "底層是想被看見" },
  { input: "他太自私了，從來不考慮我的感受", ideal_quality: "insight", notes: "指控型" },
  { input: "我好想被理解但不知道怎麼表達", ideal_quality: "agency", notes: "渴望清楚+情緒穩定" },
  { input: "我想改變但不知道從哪開始", ideal_quality: "agency", notes: "SEEKING受阻" },
  { input: "我不知道自己到底要什麼", ideal_quality: "agency", notes: "渴望模糊" },
  { input: "這個世界太不公平了", ideal_quality: "insight", notes: "對外指控，底層是努力沒被看到" },
  { input: "我永遠不會成功", ideal_quality: "awareness", notes: "絕對化+定論式" },
  { input: "她根本不在乎我", ideal_quality: "insight", notes: "指控型" },
  { input: "爸媽總是覺得我不夠好", ideal_quality: "insight", notes: "家庭+絕對化" },
  { input: "我好羨慕那些知道自己要什麼的人", ideal_quality: "awareness", notes: "比較+渴望" },
  { input: "反正說了也沒有人會聽", ideal_quality: "awareness", notes: "絕對化+放棄感" },
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
    .map((b) => b.text).join("").trim();
}

async function judge(input: string, output: string, ideal: string): Promise<any> {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    system: JUDGE_PROMPT,
    messages: [{
      role: "user",
      content: `原始念頭：「${input}」\n改寫結果：「${output}」\n預期品質目標：${ideal}`,
    }],
  });
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text).join("").trim();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text, parse_error: true };
  }
}

async function main() {
  console.log("SEP Rewriter v2 — 系統化評分\n");

  const results: any[] = [];

  // Run sequentially to respect rate limits
  for (const tc of TEST_CASES) {
    const output = await rewrite(tc.input);
    const evaluation = await judge(tc.input, output, tc.ideal_quality);
    results.push({ input: tc.input, ideal: tc.ideal_quality, output, eval: evaluation });
  }

  // Print results
  const scoreTable: string[] = [];
  let totalInsight = 0, totalAwareness = 0, totalConnection = 0, totalTone = 0;
  let agencyScores: number[] = [];
  let count = 0;

  for (const r of results) {
    const e = r.eval;
    if (e.parse_error) {
      console.log(`⚠️ Parse error for「${r.input}」`);
      console.log(e.raw);
      continue;
    }

    const ins = e.insight?.score ?? "?";
    const aw = e.awareness?.score ?? "?";
    const ag = e.agency?.score ?? "N/A";
    const conn = e.connection?.score ?? "?";
    const tone = e.tone?.score ?? "?";
    const flags = (e.flags || []).join(", ") || "—";
    const hit = e.target_hit || "?";

    console.log(`「${r.input}」`);
    console.log(`  → ${r.output}`);
    console.log(`  評分: Ins=${ins} Aw=${aw} Ag=${ag} Conn=${conn} Tone=${tone} | 命中=${hit} | Flags: ${flags}`);
    if (e.overall_note) console.log(`  總評: ${e.overall_note}`);
    console.log();

    if (typeof ins === "number") totalInsight += ins;
    if (typeof aw === "number") totalAwareness += aw;
    if (typeof conn === "number") totalConnection += conn;
    if (typeof tone === "number") totalTone += tone;
    if (typeof ag === "number") agencyScores.push(ag);
    count++;

    scoreTable.push(`| ${r.input} | ${ins} | ${aw} | ${ag} | ${conn} | ${tone} | ${flags} |`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("平均分（滿分 5）：");
  console.log(`  Insight:    ${(totalInsight / count).toFixed(1)}`);
  console.log(`  Awareness:  ${(totalAwareness / count).toFixed(1)}`);
  console.log(`  Agency:     ${agencyScores.length ? (agencyScores.reduce((a, b) => a + b, 0) / agencyScores.length).toFixed(1) : "N/A"} (${agencyScores.length} cases)`);
  console.log(`  Connection: ${(totalConnection / count).toFixed(1)}`);
  console.log(`  Tone:       ${(totalTone / count).toFixed(1)}`);

  // Flag summary
  const allFlags = results.flatMap((r) => r.eval?.flags || []);
  if (allFlags.length > 0) {
    const flagCount: Record<string, number> = {};
    for (const f of allFlags) { flagCount[f] = (flagCount[f] || 0) + 1; }
    console.log(`\n⚠️ Flag 統計:`);
    for (const [flag, n] of Object.entries(flagCount).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${flag}: ${n}x`);
    }
  } else {
    console.log("\n✅ 沒有任何 flag");
  }
}

main().catch(console.error);
