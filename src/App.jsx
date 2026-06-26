import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const RELATION_TYPES = [
  { value: "類義", label: "類義関係",    bg: "#FEF3C7", color: "#92400E", border: "#FCD34D",
    quizParts: [{ text: "似た意味", ul: true }, { text: "を持つ漢字を重ねる", ul: false }] },
  { value: "対義", label: "対義関係",    bg: "#FEE2E2", color: "#991B1B", border: "#FCA5A5",
    quizParts: [{ text: "反対の意味", ul: true }, { text: "をもつ漢字を重ねる", ul: false }] },
  { value: "修飾", label: "修飾関係",    bg: "#DBEAFE", color: "#1E40AF", border: "#93C5FD",
    quizParts: [{ text: "前の漢字が後の漢字を", ul: false }, { text: "修飾する", ul: true }] },
  { value: "動作", label: "動作・目的語", bg: "#D1FAE5", color: "#065F46", border: "#6EE7B7",
    quizParts: [{ text: "動詞の後に目的語", ul: true }, { text: "をおく", ul: false }] },
  { value: "主述", label: "主語・述語",  bg: "#EDE9FE", color: "#5B21B6", border: "#C4B5FD",
    quizParts: [{ text: "主語と述語", ul: true }, { text: "の関係にある", ul: false }] },
  { value: "その他", label: "その他",    bg: "#F5F4F0", color: "#57534E", border: "#D6D3D1",
    quizParts: [{ text: "その他", ul: false }] },
];
const RELATION_VALUES = RELATION_TYPES.map(r => r.value);
const RMAP = Object.fromEntries(RELATION_TYPES.map(r => [r.value, r]));
const EMPTY = { jukugo: "", yomi: "", relation: "類義", meaning: "", example: "" };

const inp = {
  width: "100%", padding: "8px 10px", border: "1px solid #D6D3D1",
  borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box",
  color: "#1C1917", fontFamily: "inherit",
};

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#78716C", marginBottom: 5, letterSpacing: 0.5 }}>{label}</div>
      {children}
    </div>
  );
}

function PageBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: "#F5F4F0", color: disabled ? "#D6D3D1" : "#57534E",
      border: "none", borderRadius: 5, width: 32, height: 30,
      fontSize: 14, cursor: disabled ? "default" : "pointer",
    }}>{children}</button>
  );
}

// ── クイズモード ──────────────────────────────────────────
function QuizMode({ words }) {
  const [quizState, setQuizState] = useState("settings"); // settings | playing | result
  const [quizCount, setQuizCount] = useState(10);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);

  const quizWords = words.filter(w => w.relation !== "その他");
  const canStart = quizWords.length >= 1;

  const startQuiz = () => {
    const count = Math.min(quizCount, quizWords.length);
    const shuffled = [...quizWords].sort(() => Math.random() - 0.5).slice(0, count);
    const qs = shuffled.map(word => {
      const correct = word.relation;
      const others = RELATION_VALUES
        .filter(v => v !== correct && v !== "その他")
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      const choices = [correct, ...others].sort(() => Math.random() - 0.5);
      return { word, correct, choices };
    });
    setQuestions(qs);
    setCurrentIdx(0);
    setSelected(null);
    setAnswers([]);
    setQuizState("playing");
  };

  const handleAnswer = (choice) => {
    if (selected !== null) return;
    setSelected(choice);
    setAnswers(prev => [...prev, {
      word: questions[currentIdx].word,
      selected: choice,
      correct: questions[currentIdx].correct,
      isCorrect: choice === questions[currentIdx].correct,
    }]);
  };

  const handleNext = () => {
    if (currentIdx + 1 >= questions.length) {
      setQuizState("result");
    } else {
      setCurrentIdx(i => i + 1);
      setSelected(null);
    }
  };

  // アンダーライン付きラベルを描画
  const renderLabel = (choiceValue, icon) => {
    const rel = RMAP[choiceValue];
    const parts = rel?.quizParts ?? [{ text: choiceValue, ul: false }];
    return (
      <>
        {parts.map((p, i) =>
          p.ul
            ? <span key={i} style={{ textDecoration: "underline", textUnderlineOffset: "3px" }}>{p.text}</span>
            : <span key={i}>{p.text}</span>
        )}
        {icon}
      </>
    );
  };

  const ff = { fontFamily: "'Hiragino Kaku Gothic ProN','Hiragino Sans','Meiryo',sans-serif" };

  // ── 設定画面 ──
  if (quizState === "settings") return (
    <div style={{ ...ff, display: "flex", justifyContent: "center", padding: "40px 16px" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 400, width: "100%", border: "1px solid #E7E5E4", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🧠</div>
        <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700, color: "#1C1917" }}>クイズモード</h2>
        <p style={{ margin: "0 0 28px", fontSize: 13, color: "#78716C" }}>熟語を見て対応関係を4択で答えよう</p>

        <div style={{ fontSize: 12, fontWeight: 700, color: "#78716C", marginBottom: 10, letterSpacing: 1 }}>問題数を選択</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 28 }}>
          {[5, 10, 20].map(n => {
            const available = quizWords.length >= n;
            return (
              <button key={n} onClick={() => available && setQuizCount(n)}
                style={{
                  background: quizCount === n ? "#1E3A5F" : "#F5F4F0",
                  color: quizCount === n ? "#fff" : available ? "#374151" : "#C8C4BD",
                  border: `2px solid ${quizCount === n ? "#1E3A5F" : "#E7E5E4"}`,
                  borderRadius: 10, padding: "10px 22px", fontSize: 15,
                  fontWeight: 700, cursor: available ? "pointer" : "default",
                }}>
                {n}問
                {!available && <div style={{ fontSize: 10, fontWeight: 400 }}>（単語不足）</div>}
              </button>
            );
          })}
        </div>

        <div style={{ fontSize: 12, color: "#A8A29E", marginBottom: 20 }}>
          クイズ対象: <span style={{ fontWeight: 700, color: "#1C1917" }}>{quizWords.length}</span> 語
          {words.length !== quizWords.length && <span style={{ color: "#C8C4BD" }}>（全 {words.length} 語中）</span>}
        </div>

        <button onClick={startQuiz} disabled={!canStart} style={{
          background: canStart ? "#1E3A5F" : "#E7E5E4",
          color: canStart ? "#fff" : "#A8A29E",
          border: "none", borderRadius: 10, padding: "13px 40px",
          fontSize: 15, fontWeight: 700, cursor: canStart ? "pointer" : "default", width: "100%",
        }}>
          {canStart ? "スタート →" : "単語を登録してください"}
        </button>
      </div>
    </div>
  );

  // ── 出題画面 ──
  if (quizState === "playing") {
    const q = questions[currentIdx];
    const isCorrect = selected === q.correct;
    const progress = ((currentIdx + (selected !== null ? 1 : 0)) / questions.length) * 100;

    return (
      <div style={{ ...ff, display: "flex", justifyContent: "center", padding: "16px 16px" }}>
        <div style={{ maxWidth: 480, width: "100%" }}>

          {/* 進捗 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "#78716C", fontWeight: 600 }}>
              第 <span style={{ color: "#1C1917", fontSize: 16 }}>{currentIdx + 1}</span> 問
              <span style={{ color: "#A8A29E" }}> / {questions.length}問</span>
            </span>
            <span style={{ fontSize: 12, color: "#A8A29E" }}>
              ✅ {answers.filter(a => a.isCorrect).length} / {answers.length}
            </span>
          </div>
          <div style={{ height: 6, background: "#E7E5E4", borderRadius: 3, marginBottom: 16 }}>
            <div style={{ height: "100%", background: "#1E3A5F", borderRadius: 3, width: `${progress}%`, transition: "width 0.3s" }} />
          </div>

          {/* 問題カード */}
          <div style={{ background: "#fff", borderRadius: 16, padding: "27px 24px", border: "1px solid #E7E5E4", textAlign: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "#A8A29E", marginBottom: 8 }}>この熟語の対応関係は？</div>
            <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: 8, color: "#1C1917", marginBottom: 4 }}>{q.word.jukugo}</div>
            <div style={{ fontSize: 14, color: "#A8A29E" }}>{q.word.yomi}</div>
          </div>

          {/* 選択肢 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginBottom: 10 }}>
            {q.choices.map(choice => {
              const rel = RMAP[choice];
              let bg = "#fff", border = "#E7E5E4", color = "#1C1917", icon = "";
              if (selected !== null) {
                if (choice === q.correct) { bg = "#D1FAE5"; border = "#6EE7B7"; color = "#065F46"; icon = " ✅"; }
                else if (choice === selected) { bg = "#FEE2E2"; border = "#FCA5A5"; color = "#991B1B"; icon = " ❌"; }
                else { bg = "#FAFAF9"; color = "#C8C4BD"; border = "#F0EFEE"; }
              }
              return (
                <button key={choice} onClick={() => handleAnswer(choice)} disabled={selected !== null}
                  style={{
                    background: bg, color, border: `2px solid ${border}`,
                    borderRadius: 10, padding: "13px 18px", fontSize: 14, fontWeight: 700,
                    cursor: selected !== null ? "default" : "pointer",
                    transition: "all 0.15s", textAlign: "center",
                  }}>
                  {renderLabel(choice, icon)}
                </button>
              );
            })}
          </div>

          {/* 正誤フィードバック */}
          {selected !== null && (
            <div style={{
              background: isCorrect ? "#D1FAE5" : "#FEE2E2",
              border: `1px solid ${isCorrect ? "#6EE7B7" : "#FCA5A5"}`,
              borderRadius: 12, padding: "12px 18px", marginBottom: 10,
            }}>
              <div style={{ fontWeight: 700, color: isCorrect ? "#065F46" : "#991B1B", marginBottom: 6, fontSize: 15 }}>
                {isCorrect ? "✅ 正解！" : `❌ 不正解　→ 正解は「${q.correct}」`}
              </div>
              <div style={{ fontSize: 13, color: "#57534E" }}>
                <span style={{ color: "#A8A29E" }}>意味：</span>{q.word.meaning}
              </div>
              {q.word.example && (
                <div style={{ fontSize: 12, color: "#78716C", marginTop: 4 }}>
                  <span style={{ color: "#A8A29E" }}>例文：</span>{q.word.example}
                </div>
              )}
            </div>
          )}

          {selected !== null && (
            <button onClick={handleNext} style={{
              background: "#1E3A5F", color: "#fff", border: "none", borderRadius: 10,
              padding: "13px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%",
            }}>
              {currentIdx + 1 >= questions.length ? "結果を見る 📊" : "次の問題 →"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── 結果画面 ──
  if (quizState === "result") {
    const correctCount = answers.filter(a => a.isCorrect).length;
    const rate = Math.round((correctCount / answers.length) * 100);
    const wrongAnswers = answers.filter(a => !a.isCorrect);

    return (
      <div style={{ ...ff, display: "flex", justifyContent: "center", padding: "32px 16px" }}>
        <div style={{ maxWidth: 480, width: "100%" }}>

          {/* スコアカード */}
          <div style={{ background: "#fff", borderRadius: 16, padding: "32px 24px", border: "1px solid #E7E5E4", textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>{rate === 100 ? "🎉" : rate >= 70 ? "👍" : "📖"}</div>
            <div style={{ fontSize: 13, color: "#A8A29E", marginBottom: 4 }}>スコア</div>
            <div style={{ fontSize: 48, fontWeight: 700, color: "#1E3A5F", marginBottom: 4 }}>
              {correctCount} <span style={{ fontSize: 20, color: "#A8A29E" }}>/ {answers.length}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: rate === 100 ? "#065F46" : rate >= 70 ? "#92400E" : "#991B1B" }}>
              正解率 {rate}%
            </div>
          </div>

          {/* 不正解一覧 */}
          {wrongAnswers.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E7E5E4", overflow: "hidden", marginBottom: 16 }}>
              <div style={{ padding: "12px 16px", background: "#FAFAF9", borderBottom: "1px solid #E7E5E4", fontSize: 12, fontWeight: 700, color: "#78716C" }}>
                ❌ 間違えた問題 ({wrongAnswers.length}問)
              </div>
              {wrongAnswers.map((a, i) => (
                <div key={i} style={{ padding: "12px 16px", borderBottom: i < wrongAnswers.length - 1 ? "1px solid #F5F4F0" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>{a.word.jukugo}</span>
                    <span style={{ fontSize: 12, color: "#A8A29E" }}>{a.word.yomi}</span>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: "#991B1B" }}>あなたの答え：{a.selected}　</span>
                    <span style={{ color: "#065F46" }}>正解：{a.correct}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#78716C", marginTop: 2 }}>{a.word.meaning}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button onClick={() => { setQuizState("settings"); setSelected(null); }} style={{
              background: "#F5F4F0", color: "#374151", border: "none",
              borderRadius: 10, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}>もう一度</button>
            <button onClick={() => setQuizState("settings")} style={{
              background: "#1E3A5F", color: "#fff", border: "none",
              borderRadius: 10, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}>設定に戻る</button>
          </div>
        </div>
      </div>
    );
  }
}

// ── 設定モード（エクスポート/インポート）──────────────────
function SettingsMode({ words, setWords }) {
  const [result, setResult] = useState(null); // { added, skipped, errors: [] }
  const [importing, setImporting] = useState(false);

  const today = () => {
    const d = new Date();
    const p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  // ── エクスポート（JSON）──
  const exportJSON = () => {
    const data = words.map(({ jukugo, yomi, relation, meaning, example }) =>
      ({ jukugo, yomi, relation, meaning, example: example || "" }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    downloadBlob(blob, `spi-vocab-backup-${today()}.json`);
  };

  // ── エクスポート（CSV）──
  const exportCSV = () => {
    const esc = v => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = "熟語,読み仮名,対応関係,意味,例文";
    const lines = words.map(w =>
      [w.jukugo, w.yomi, w.relation, w.meaning, w.example || ""].map(esc).join(","));
    const csv = "\uFEFF" + [header, ...lines].join("\r\n"); // BOM付きでExcel文字化け防止
    downloadBlob(new Blob([csv], { type: "text/csv" }), `spi-vocab-backup-${today()}.csv`);
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  // ── CSVを行→フィールド配列にパース（引用符対応）──
  const parseCSV = (text) => {
    const rows = [];
    let row = [], field = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ",") { row.push(field); field = ""; }
        else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
        else if (c === "\r") { /* skip */ }
        else field += c;
      }
    }
    if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
    return rows;
  };

  // ── インポート共通処理 ──
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 同じファイル再選択を可能に
    if (!file) return;
    setImporting(true);
    setResult(null);

    try {
      const text = await file.text();
      let records = [];

      if (file.name.toLowerCase().endsWith(".json")) {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error("JSONが配列形式ではありません");
        records = parsed.map((r, i) => ({ row: i + 1, ...r }));
      } else if (file.name.toLowerCase().endsWith(".csv")) {
        const rows = parseCSV(text).filter(r => r.some(c => c.trim() !== ""));
        if (rows.length <= 1) throw new Error("データ行がありません");
        // 1行目はヘッダーとしてスキップ
        records = rows.slice(1).map((cols, i) => ({
          row: i + 2, // ヘッダーが1行目なので+2
          jukugo: cols[0]?.trim() ?? "",
          yomi: cols[1]?.trim() ?? "",
          relation: cols[2]?.trim() ?? "",
          meaning: cols[3]?.trim() ?? "",
          example: cols[4]?.trim() ?? "",
        }));
      } else {
        throw new Error("対応していないファイル形式です（.json または .csv）");
      }

      // バリデーション & 重複チェック
      const existing = new Set(words.map(w => w.jukugo));
      const seen = new Set(); // 同一ファイル内重複も検出
      const toInsert = [];
      const errors = [];
      let skipped = 0;

      for (const r of records) {
        const jukugo = (r.jukugo ?? "").trim();
        const yomi = (r.yomi ?? "").trim();
        const relation = (r.relation ?? "").trim();
        const meaning = (r.meaning ?? "").trim();
        const example = (r.example ?? "").trim();

        if (!jukugo || !yomi || !meaning) {
          errors.push(`${r.row}行目：熟語・読み仮名・意味は必須です`);
          continue;
        }
        if (jukugo.length < 2) {
          errors.push(`${r.row}行目：熟語は2文字以上必要です（「${jukugo}」）`);
          continue;
        }
        if (!/^[ぁ-ん]+$/.test(yomi)) {
          errors.push(`${r.row}行目：読み仮名はひらがなのみで入力してください（「${yomi}」）`);
          continue;
        }
        if (!RELATION_VALUES.includes(relation)) {
          errors.push(`${r.row}行目：対応関係「${relation}」は無効です（${RELATION_VALUES.join("/")} のいずれか）`);
          continue;
        }
        if (existing.has(jukugo) || seen.has(jukugo)) { skipped++; continue; }
        seen.add(jukugo);
        toInsert.push({ jukugo, yomi, relation, meaning, example });
      }

      // Supabaseへ一括登録
      let added = 0;
      if (toInsert.length > 0) {
        const { data, error } = await supabase.from("words").insert(toInsert).select();
        if (error) throw new Error("保存に失敗しました：" + error.message);
        if (data) { setWords([...words, ...data]); added = data.length; }
      }

      setResult({ added, skipped, errors });
    } catch (err) {
      setResult({ added: 0, skipped: 0, errors: [err.message] });
    } finally {
      setImporting(false);
    }
  };

  const ff = { fontFamily: "'Hiragino Kaku Gothic ProN','Hiragino Sans','Meiryo',sans-serif" };
  const card = { background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E7E5E4", marginBottom: 16 };
  const btn = (bg, color, border) => ({
    background: bg, color, border: border || "none", borderRadius: 8,
    padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
  });

  return (
    <div style={{ ...ff, maxWidth: 640, margin: "0 auto", padding: "24px 16px" }}>

      {/* エクスポート */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1C1917", marginBottom: 4 }}>📤 エクスポート（バックアップ）</div>
        <div style={{ fontSize: 12, color: "#78716C", marginBottom: 14, lineHeight: 1.6 }}>
          登録中の全 {words.length} 語をファイルに保存します。定期的に保存しておくと安心です。
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={exportJSON} disabled={words.length === 0} style={btn("#1E3A5F", "#fff")}>JSONで保存</button>
          <button onClick={exportCSV} disabled={words.length === 0} style={btn("#F5F4F0", "#374151", "1px solid #D6D3D1")}>CSVで保存</button>
        </div>
      </div>

      {/* インポート */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1C1917", marginBottom: 4 }}>📥 インポート（追加）</div>
        <div style={{ fontSize: 12, color: "#78716C", marginBottom: 14, lineHeight: 1.6 }}>
          JSON または CSV ファイルから熟語を追加します。<br />
          既存の熟語と同じものは自動でスキップされます（既存データは消えません）。
        </div>
        <label style={{ ...btn("#065F46", "#fff"), display: "inline-block" }}>
          {importing ? "読み込み中…" : "ファイルを選択"}
          <input type="file" accept=".json,.csv" onChange={handleFile} disabled={importing}
            style={{ display: "none" }} />
        </label>
        <div style={{ fontSize: 11, color: "#A8A29E", marginTop: 10, lineHeight: 1.6 }}>
          CSV形式：1行目はヘッダー（熟語,読み仮名,対応関係,意味,例文）。<br />
          対応関係は「{RELATION_VALUES.join(" / ")}」のいずれか。
        </div>
      </div>

      {/* 結果パネル */}
      {result && (
        <div style={{ ...card, border: result.errors.length > 0 ? "1px solid #FCA5A5" : "1px solid #6EE7B7" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1C1917" }}>インポート結果</div>
            <button onClick={() => setResult(null)} style={{ background: "none", border: "none", fontSize: 18, color: "#A8A29E", cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>
          <div style={{ display: "flex", gap: 16, marginBottom: result.errors.length > 0 ? 12 : 0 }}>
            <span style={{ fontSize: 13, color: "#065F46", fontWeight: 700 }}>✅ {result.added} 件追加</span>
            <span style={{ fontSize: 13, color: "#92400E", fontWeight: 700 }}>⏭️ {result.skipped} 件スキップ</span>
            <span style={{ fontSize: 13, color: "#991B1B", fontWeight: 700 }}>⚠️ {result.errors.length} 件エラー</span>
          </div>
          {result.errors.length > 0 && (
            <div style={{ background: "#FFF5F5", borderRadius: 8, padding: "10px 12px", maxHeight: 200, overflowY: "auto" }}>
              {result.errors.map((e, i) => (
                <div key={i} style={{ fontSize: 12, color: "#991B1B", lineHeight: 1.7 }}>{e}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── リクエスト承認モード（管理者）──────────────────────────
function RequestsMode({ words, setWords }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState("pending");
  const [selected, setSelected] = useState(new Set());
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState(null); // { approved, skipped, rejected, deleted, reverted }
  const [confirm, setConfirm] = useState(null); // { action, ids, label }

  // 読み込み
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("word_requests").select("*").order("created_at", { ascending: true });
      if (data) setRequests(data);
      setLoading(false);
    };
    load();
  }, []);

  const ff = { fontFamily: "'Hiragino Kaku Gothic ProN','Hiragino Sans','Meiryo',sans-serif" };

  const counts = {
    pending: requests.filter(r => r.status === "pending").length,
    approved: requests.filter(r => r.status === "approved").length,
    rejected: requests.filter(r => r.status === "rejected").length,
  };

  const inThisTab = requests.filter(r => r.status === statusTab).sort((a, b) => a.id - b.id);
  const totalPages = Math.max(1, Math.ceil(inThisTab.length / pageSize));
  const curPage = Math.min(page, totalPages);
  const rows = inThisTab.slice((curPage - 1) * pageSize, curPage * pageSize);

  const fmtDate = (ts) => {
    if (!ts) return "—";
    const d = new Date(ts);
    const p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  const switchTab = (s) => { setStatusTab(s); setSelected(new Set()); setPage(1); setNotice(null); };

  const toggleSelect = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const allInTabSelected = inThisTab.length > 0 && inThisTab.every(r => selected.has(r.id));
  const toggleSelectAll = () => {
    if (allInTabSelected) setSelected(new Set());
    else setSelected(new Set(inThisTab.map(r => r.id)));
  };

  // ── 承認処理 ──
  const approve = async (ids) => {
    setProcessing(true);
    const targets = requests.filter(r => ids.includes(r.id));
    const existing = new Set(words.map(w => w.jukugo));
    const seen = new Set();
    let approved = 0, skipped = 0;
    const newWords = [];
    const updatedReqs = [...requests];

    for (const req of targets) {
      const dup = existing.has(req.jukugo) || seen.has(req.jukugo);
      if (dup) {
        // 重複：wordsに追加せず、statusだけapprovedに（approved_word_idはnull）
        const { data } = await supabase.from("word_requests")
          .update({ status: "approved", reviewed_at: new Date().toISOString(), approved_word_id: null })
          .eq("id", req.id).select();
        if (data) { const i = updatedReqs.findIndex(r => r.id === req.id); updatedReqs[i] = data[0]; }
        skipped++;
      } else {
        const { data: wordData } = await supabase.from("words")
          .insert([{ jukugo: req.jukugo, yomi: req.yomi, relation: req.relation, meaning: req.meaning || "", example: req.example || "" }])
          .select();
        if (wordData) {
          newWords.push(wordData[0]);
          seen.add(req.jukugo);
          const { data } = await supabase.from("word_requests")
            .update({ status: "approved", reviewed_at: new Date().toISOString(), approved_word_id: wordData[0].id })
            .eq("id", req.id).select();
          if (data) { const i = updatedReqs.findIndex(r => r.id === req.id); updatedReqs[i] = data[0]; }
          approved++;
        }
      }
    }

    if (newWords.length > 0) setWords([...words, ...newWords]);
    setRequests(updatedReqs);
    setSelected(new Set());
    setProcessing(false);
    setNotice({ approved, skipped });
  };

  // ── 却下処理 ──
  const reject = async (ids) => {
    setProcessing(true);
    const updatedReqs = [...requests];
    let rejected = 0;
    for (const id of ids) {
      const { data } = await supabase.from("word_requests")
        .update({ status: "rejected", reviewed_at: new Date().toISOString() })
        .eq("id", id).select();
      if (data) { const i = updatedReqs.findIndex(r => r.id === id); updatedReqs[i] = data[0]; rejected++; }
    }
    setRequests(updatedReqs);
    setSelected(new Set());
    setProcessing(false);
    setNotice({ rejected });
  };

  // ── pendingに戻す ──
  const revertToPending = async (req) => {
    setProcessing(true);
    // approvedで、wordsに追加していたものはwordsから削除
    if (req.status === "approved" && req.approved_word_id) {
      await supabase.from("words").delete().eq("id", req.approved_word_id);
      setWords(words.filter(w => w.id !== req.approved_word_id));
    }
    const { data } = await supabase.from("word_requests")
      .update({ status: "pending", approved_word_id: null })
      .eq("id", req.id).select();
    if (data) setRequests(requests.map(r => r.id === req.id ? data[0] : r));
    setProcessing(false);
    setNotice({ reverted: 1 });
  };

  // ── 完全削除 ──
  const hardDelete = async (id) => {
    setProcessing(true);
    await supabase.from("word_requests").delete().eq("id", id);
    setRequests(requests.filter(r => r.id !== id));
    setProcessing(false);
    setNotice({ deleted: 1 });
  };

  // ── 一括処理の確認を挟む ──
  const askConfirm = (action, scope) => {
    // scope: "selected" | "all"
    const ids = scope === "all" ? inThisTab.map(r => r.id) : [...selected].filter(id => inThisTab.some(r => r.id === id));
    if (ids.length === 0) return;
    const verb = action === "approve" ? "承認" : "却下";
    const scopeLabel = scope === "all" ? `未処理の全${ids.length}件` : `選択した${ids.length}件`;
    setConfirm({ action, ids, label: `${scopeLabel}を${verb}します。よろしいですか？` });
  };

  const runConfirmed = async () => {
    const { action, ids } = confirm;
    setConfirm(null);
    if (action === "approve") await approve(ids);
    else await reject(ids);
  };

  const card = { background: "#fff", borderRadius: 10, border: "1px solid #E7E5E4", overflow: "hidden" };
  const tabBtn = (active) => ({
    background: active ? "#1E3A5F" : "#F5F4F0", color: active ? "#fff" : "#78716C",
    border: "none", borderRadius: 7, padding: "8px 16px", fontSize: 13,
    fontWeight: active ? 700 : 400, cursor: "pointer",
  });
  const actBtn = (bg, color, border) => ({
    background: bg, color, border: border || "none", borderRadius: 6,
    padding: "7px 14px", fontSize: 12, fontWeight: 700,
    cursor: processing ? "default" : "pointer", opacity: processing ? 0.6 : 1,
  });

  if (loading) return (
    <div style={{ ...ff, textAlign: "center", padding: "60px 20px", color: "#78716C" }}>読み込み中…</div>
  );

  const selectedInTab = [...selected].filter(id => inThisTab.some(r => r.id === id)).length;

  return (
    <div style={{ ...ff, maxWidth: 1120, margin: "0 auto", padding: "20px 16px" }}>

      {/* status切り替え */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => switchTab("pending")} style={tabBtn(statusTab === "pending")}>未処理 ({counts.pending})</button>
        <button onClick={() => switchTab("approved")} style={tabBtn(statusTab === "approved")}>承認済 ({counts.approved})</button>
        <button onClick={() => switchTab("rejected")} style={tabBtn(statusTab === "rejected")}>却下済 ({counts.rejected})</button>
      </div>

      {/* 通知 */}
      {notice && (
        <div style={{ background: "#EFF6FF", border: "1px solid #93C5FD", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#1E40AF", fontWeight: 700 }}>
            {notice.approved != null && `✅ ${notice.approved}件を承認しました`}
            {notice.skipped > 0 && `（うち重複のため ${notice.skipped}件は登録済みとしてスキップ）`}
            {notice.rejected != null && `🚫 ${notice.rejected}件を却下しました`}
            {notice.reverted != null && `↩️ 未処理に戻しました`}
            {notice.deleted != null && `🗑️ 完全に削除しました`}
          </span>
          <button onClick={() => setNotice(null)} style={{ background: "none", border: "none", fontSize: 18, color: "#1E40AF", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* 一括処理（未処理タブのみ）*/}
      {statusTab === "pending" && inThisTab.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => askConfirm("approve", "all")} disabled={processing} style={actBtn("#065F46", "#fff")}>全て承認する</button>
          <button onClick={() => askConfirm("reject", "all")} disabled={processing} style={actBtn("#991B1B", "#fff")}>全て却下する</button>
          <div style={{ width: 1, height: 20, background: "#E7E5E4", margin: "0 4px" }} />
          <button onClick={() => askConfirm("approve", "selected")} disabled={processing || selectedInTab === 0} style={actBtn(selectedInTab === 0 ? "#E7E5E4" : "#065F46", selectedInTab === 0 ? "#A8A29E" : "#fff")}>選択した{selectedInTab}件を承認</button>
          <button onClick={() => askConfirm("reject", "selected")} disabled={processing || selectedInTab === 0} style={actBtn(selectedInTab === 0 ? "#E7E5E4" : "#991B1B", selectedInTab === 0 ? "#A8A29E" : "#fff")}>選択した{selectedInTab}件を却下</button>
        </div>
      )}

      {/* テーブル */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid #F0EFEE", background: "#FAFAF9" }}>
          <div style={{ fontSize: 12, color: "#78716C" }}>
            <span style={{ fontWeight: 700, color: "#1C1917" }}>{inThisTab.length}</span> 件
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "#A8A29E", marginRight: 2 }}>表示件数</span>
            {[20, 50, 100].map(n => (
              <button key={n} onClick={() => { setPageSize(n); setPage(1); }} style={{ background: pageSize === n ? "#1E3A5F" : "#F5F4F0", color: pageSize === n ? "#fff" : "#78716C", border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 12, cursor: "pointer", fontWeight: pageSize === n ? 700 : 400 }}>{n}</button>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#A8A29E", fontSize: 14 }}>
            {statusTab === "pending" ? "未処理のリクエストはありません" : statusTab === "approved" ? "承認済のリクエストはありません" : "却下済のリクエストはありません"}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, tableLayout: "fixed" }}>
              <colgroup>
                {statusTab === "pending" && <col style={{ width: 40 }} />}
                <col style={{ width: 130 }} />
                <col style={{ width: 36 }} /><col style={{ width: 64 }} /><col style={{ width: 90 }} />
                <col style={{ width: 96 }} /><col style={{ width: 180 }} /><col style={{ width: 180 }} />
                <col style={{ width: 140 }} />
                {statusTab !== "pending" && <col style={{ width: 150 }} />}
              </colgroup>
              <thead>
                <tr style={{ borderBottom: "2px solid #E7E5E4", background: "#FAFAF9" }}>
                  {statusTab === "pending" && (
                    <th style={{ padding: "10px 8px", textAlign: "center" }}>
                      <input type="checkbox" checked={allInTabSelected} onChange={toggleSelectAll} style={{ accentColor: "#1E3A5F", cursor: "pointer" }} />
                    </th>
                  )}
                  <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#78716C", letterSpacing: 1 }}>操作</th>
                  {["#","熟語","読み","対応関係","意味","例文","申請日時"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#78716C", letterSpacing: 1, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                  {statusTab !== "pending" && <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#78716C", letterSpacing: 1 }}>取り消し</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((req, i) => {
                  const rel = RMAP[req.relation];
                  return (
                    <tr key={req.id} style={{ borderBottom: "1px solid #F5F4F0" }}>
                      {statusTab === "pending" && (
                        <td style={{ padding: "11px 8px", textAlign: "center" }}>
                          <input type="checkbox" checked={selected.has(req.id)} onChange={() => toggleSelect(req.id)} style={{ accentColor: "#1E3A5F", cursor: "pointer" }} />
                        </td>
                      )}
                      <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                        {statusTab === "pending" ? (
                          <>
                            <button onClick={() => approve([req.id])} disabled={processing} style={{ background: "none", color: "#065F46", border: "1px solid #6EE7B7", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer", marginRight: 6, fontWeight: 600 }}>承認</button>
                            <button onClick={() => reject([req.id])} disabled={processing} style={{ background: "none", color: "#991B1B", border: "1px solid #FCA5A5", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>却下</button>
                          </>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 700, color: statusTab === "approved" ? "#065F46" : "#991B1B" }}>
                            {statusTab === "approved" ? "✅ 承認済" : "🚫 却下済"}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "11px 14px", color: "#C8C4BD", fontSize: 11 }}>{(curPage - 1) * pageSize + i + 1}</td>
                      <td style={{ padding: "11px 14px", fontWeight: 700, fontSize: 18, letterSpacing: 2, color: "#1C1917", whiteSpace: "nowrap" }}>{req.jukugo}</td>
                      <td style={{ padding: "11px 14px", color: "#78716C", fontSize: 12, whiteSpace: "nowrap" }}>{req.yomi}</td>
                      <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                        <span style={{ background: rel?.bg, color: rel?.color, border: `1px solid ${rel?.border}`, borderRadius: 4, padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>{req.relation}</span>
                      </td>
                      <td style={{ padding: "11px 14px", color: "#292524", fontSize: 13, lineHeight: 1.5 }}>{req.meaning || <span style={{ color: "#D6D3D1" }}>—</span>}</td>
                      <td style={{ padding: "11px 14px", color: "#78716C", fontSize: 12 }}>{req.example || <span style={{ color: "#D6D3D1" }}>—</span>}</td>
                      <td style={{ padding: "11px 14px", color: "#A8A29E", fontSize: 11, whiteSpace: "nowrap" }}>{fmtDate(req.created_at)}</td>
                      {statusTab !== "pending" && (
                        <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                          <button onClick={() => revertToPending(req)} disabled={processing} style={{ background: "none", color: "#1E3A5F", border: "1px solid #C8D8E8", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer", marginRight: 6, fontWeight: 600 }}>未処理に戻す</button>
                          {statusTab === "rejected" && (
                            <button onClick={() => hardDelete(req.id)} disabled={processing} style={{ background: "none", color: "#991B1B", border: "1px solid #FCA5A5", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>完全削除</button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 4, padding: "12px", borderTop: "1px solid #F0EFEE" }}>
            <button onClick={() => setPage(1)} disabled={curPage === 1} style={{ background: "#F5F4F0", color: curPage === 1 ? "#D6D3D1" : "#57534E", border: "none", borderRadius: 5, width: 32, height: 30, fontSize: 14, cursor: curPage === 1 ? "default" : "pointer" }}>«</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={curPage === 1} style={{ background: "#F5F4F0", color: curPage === 1 ? "#D6D3D1" : "#57534E", border: "none", borderRadius: 5, width: 32, height: 30, fontSize: 14, cursor: curPage === 1 ? "default" : "pointer" }}>‹</button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, idx) => {
              const start = Math.max(1, Math.min(curPage - 3, totalPages - 6));
              return start + idx;
            }).filter(n => n >= 1 && n <= totalPages).map(n => (
              <button key={n} onClick={() => setPage(n)} style={{ background: n === curPage ? "#1E3A5F" : "#F5F4F0", color: n === curPage ? "#fff" : "#57534E", border: "none", borderRadius: 5, width: 32, height: 30, fontSize: 13, cursor: "pointer", fontWeight: n === curPage ? 700 : 400 }}>{n}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={curPage === totalPages} style={{ background: "#F5F4F0", color: curPage === totalPages ? "#D6D3D1" : "#57534E", border: "none", borderRadius: 5, width: 32, height: 30, fontSize: 14, cursor: curPage === totalPages ? "default" : "pointer" }}>›</button>
            <button onClick={() => setPage(totalPages)} disabled={curPage === totalPages} style={{ background: "#F5F4F0", color: curPage === totalPages ? "#D6D3D1" : "#57534E", border: "none", borderRadius: 5, width: 32, height: 30, fontSize: 14, cursor: curPage === totalPages ? "default" : "pointer" }}>»</button>
          </div>
        )}
      </div>

      {/* 確認ダイアログ */}
      {confirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, maxWidth: 360, width: "100%" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1C1917", marginBottom: 8 }}>確認</div>
            <div style={{ fontSize: 13, color: "#57534E", marginBottom: 20, lineHeight: 1.6 }}>{confirm.label}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirm(null)} style={{ background: "#F5F4F0", color: "#57534E", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>キャンセル</button>
              <button onClick={runConfirmed} style={{ background: confirm.action === "approve" ? "#065F46" : "#991B1B", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>
                {confirm.action === "approve" ? "承認する" : "却下する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── メインアプリ ──────────────────────────────────────────
export default function App() {
  const [words,       setWords]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [form,        setForm]        = useState(EMPTY);
  const [editId,      setEditId]      = useState(null);
  const [showForm,    setShowForm]    = useState(false);
  const [formError,   setFormError]   = useState("");
  const [confirmDel,  setConfirmDel]  = useState(null);
  const [search,      setSearch]      = useState("");
  const [targets,     setTargets]     = useState({ jukugo: true, yomi: true, meaning: false });
  const [filterRel,   setFilterRel]   = useState("all");
  const [sortBy,      setSortBy]      = useState("登録順");
  const [sortDir,     setSortDir]     = useState("asc");
  const [pageSize,    setPageSize]    = useState(20);
  const [page,        setPage]        = useState(1);
  const [activeTab,   setActiveTab]   = useState("list");
  const [dupWarning,  setDupWarning]  = useState(false);
  const [requestSent, setRequestSent] = useState(false); // 申請完了メッセージ
  const [cooldown,    setCooldown]    = useState(false);  // 連打防止

  // ── 認証関連 ──
  const isAdminUrl = typeof window !== "undefined" && window.location.pathname.startsWith("/adminmoushiwaonly");
  const [session,     setSession]     = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginEmail,  setLoginEmail]  = useState("");
  const [loginPass,   setLoginPass]   = useState("");
  const [loginError,  setLoginError]  = useState("");
  const [loggingIn,   setLoggingIn]   = useState(false);
  const isAdmin = !!session; // ログイン済み = 管理者

  // ログイン状態の監視
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    setLoginError("");
    setLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail.trim(), password: loginPass });
    setLoggingIn(false);
    if (error) { setLoginError("メールアドレスまたはパスワードが正しくありません"); return; }
    setLoginEmail(""); setLoginPass("");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setActiveTab("list");
  };

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("words").select("*").order("id", { ascending: true });
      if (data) setWords(data);
      setLoading(false);
    };
    load();
  }, []);

  // 管理者：直接登録/更新
  const handleSubmit = async () => {
    const { jukugo, yomi, meaning } = form;
    const jukugoT = jukugo.trim(), yomiT = yomi.trim();
    if (!jukugoT || !yomiT || !meaning.trim()) { setFormError("熟語・読み仮名・意味は必須です"); return; }
    if (jukugoT.length < 2) { setFormError("熟語は2文字以上で入力してください"); return; }
    if (!/^[ぁ-ん]+$/.test(yomiT)) { setFormError("読み仮名はひらがなのみで入力してください"); return; }
    setFormError("");
    setSaving(true);
    if (editId !== null) {
      const { data } = await supabase.from("words").update({ jukugo: form.jukugo, yomi: form.yomi, relation: form.relation, meaning: form.meaning, example: form.example }).eq("id", editId).select();
      if (data) setWords(words.map(w => w.id === editId ? data[0] : w));
    } else {
      const { data } = await supabase.from("words").insert([{ jukugo: form.jukugo, yomi: form.yomi, relation: form.relation, meaning: form.meaning, example: form.example }]).select();
      if (data) setWords([...words, data[0]]);
    }
    setSaving(false);
    setForm(EMPTY); setEditId(null); setShowForm(false);
  };

  // 一般ユーザー：登録リクエスト送信
  const handleRequest = async () => {
    const { jukugo, yomi, relation } = form;
    const jukugoT = jukugo.trim(), yomiT = yomi.trim();
    if (!jukugoT || !yomiT || !relation.trim()) { setFormError("熟語・読み仮名・対応関係は必須です"); return; }
    if (jukugoT.length < 2) { setFormError("熟語は2文字以上で入力してください"); return; }
    if (!/^[ぁ-ん]+$/.test(yomiT)) { setFormError("読み仮名はひらがなのみで入力してください"); return; }
    setFormError("");
    setSaving(true);
    const { error } = await supabase.from("word_requests").insert([{
      jukugo: form.jukugo.trim(), yomi: form.yomi.trim(), relation: form.relation,
      meaning: form.meaning.trim(), example: form.example.trim(), status: "pending",
    }]);
    setSaving(false);
    if (error) { setFormError("送信に失敗しました。時間をおいて再度お試しください"); return; }
    setForm(EMPTY); setShowForm(false); setDupWarning(false);
    setRequestSent(true);
    // 連打防止：5秒間クールダウン
    setCooldown(true);
    setTimeout(() => setCooldown(false), 5000);
  };

  const startEdit = (w) => {
    setForm({ jukugo: w.jukugo, yomi: w.yomi, relation: w.relation, meaning: w.meaning, example: w.example || "" });
    setEditId(w.id); setShowForm(true); setFormError(""); setConfirmDel(null); setDupWarning(false);
  };

  const handleDelete = async (id) => {
    await supabase.from("words").delete().eq("id", id);
    setWords(words.filter(w => w.id !== id));
    setConfirmDel(null);
  };

  const cancelForm = () => { setForm(EMPTY); setEditId(null); setShowForm(false); setFormError(""); setDupWarning(false); };

  const filtered = words
    .filter(w => {
      if (filterRel !== "all" && w.relation !== filterRel) return false;
      if (search.trim()) {
        const q = search.trim();
        return (targets.jukugo && w.jukugo.includes(q)) || (targets.yomi && w.yomi.includes(q)) || (targets.meaning && w.meaning.includes(q));
      }
      return true;
    })
    .sort((a, b) => {
      let c = 0;
      if      (sortBy === "登録順")  c = a.id - b.id;
      else if (sortBy === "読み仮名") c = a.yomi.localeCompare(b.yomi, "ja");
      else if (sortBy === "関係種類") c = RELATION_TYPES.findIndex(r => r.value === a.relation) - RELATION_TYPES.findIndex(r => r.value === b.relation);
      return sortDir === "asc" ? c : -c;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const curPage    = Math.min(page, totalPages);
  const rows       = filtered.slice((curPage - 1) * pageSize, curPage * pageSize);
  const ff = { fontFamily: "'Hiragino Kaku Gothic ProN','Hiragino Sans','Meiryo',sans-serif" };

  if (loading || !authChecked) return (
    <div style={{ ...ff, display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#F5F4F0", color: "#78716C" }}>読み込み中…</div>
  );

  // 管理者URLにアクセスしたが未ログイン → ログイン画面
  if (isAdminUrl && !isAdmin) return (
    <div style={{ ...ff, background: "#F5F4F0", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 360, width: "100%", border: "1px solid #E7E5E4" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔐</div>
          <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "#1C1917" }}>管理者ログイン</h2>
          <p style={{ margin: 0, fontSize: 12, color: "#A8A29E" }}>SPI熟語学習アプリ</p>
        </div>
        {loginError && (
          <div style={{ background: "#FEE2E2", color: "#991B1B", borderRadius: 6, padding: "8px 12px", fontSize: 12, marginBottom: 14 }}>
            {loginError}
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#78716C", marginBottom: 5 }}>メールアドレス</div>
          <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="you@example.com" style={inp} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#78716C", marginBottom: 5 }}>パスワード</div>
          <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="••••••••" style={inp} />
        </div>
        <button onClick={handleLogin} disabled={loggingIn} style={{
          background: loggingIn ? "#94A3B8" : "#1E3A5F", color: "#fff", border: "none",
          borderRadius: 8, padding: "12px 0", fontSize: 14, fontWeight: 700,
          cursor: loggingIn ? "default" : "pointer", width: "100%",
        }}>
          {loggingIn ? "ログイン中…" : "ログイン"}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ ...ff, background: "#F5F4F0", minHeight: "100vh" }}>
      <style>{`
        .form-row-top { display:grid; grid-template-columns:110px 180px 1fr; gap:12px; margin-bottom:12px; }
        .form-row-bottom { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; }
        .search-row-1 { display:grid; grid-template-columns:1fr 175px; gap:12px; align-items:end; margin-bottom:12px; }
        .search-row-2 { display:grid; grid-template-columns:145px 120px; gap:12px; align-items:end; }
        @media (max-width:600px) {
          .form-row-top { grid-template-columns:1fr 1fr; }
          .form-row-top > :nth-child(3) { grid-column:1 / -1; }
          .form-row-bottom { grid-template-columns:1fr; }
          .search-row-1 { grid-template-columns:1fr; }
          .search-row-2 { grid-template-columns:1fr 1fr; }
        }
      `}</style>

      {/* ── ヘッダー ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E7E5E4", padding: "16px 24px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 4, color: "#C85250", fontWeight: 700, marginBottom: 2 }}>SPI 対策ノート</div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1C1917", letterSpacing: 1 }}>二字熟語 対応関係</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 12, color: "#A8A29E" }}>全 <span style={{ fontWeight: 700, color: "#1C1917" }}>{words.length}</span> 語</div>
            {isAdmin && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ background: "#1E3A5F", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "3px 8px", letterSpacing: 0.5 }}>管理者</span>
                <button onClick={handleLogout} style={{
                  background: "#F5F4F0", color: "#78716C", border: "1px solid #E7E5E4",
                  borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600,
                }}>ログアウト</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── タブ ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E7E5E4" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex" }}>
          {[["list", "📋 一覧"], ["quiz", "🧠 クイズ"], ...(isAdmin ? [["requests", "📥 リクエスト"], ["settings", "⚙️ 設定"]] : [])].map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: "none", border: "none", padding: "10px 24px",
              fontSize: 14, fontWeight: activeTab === tab ? 700 : 400,
              color: activeTab === tab ? "#1E3A5F" : "#78716C",
              borderBottom: activeTab === tab ? "2px solid #1E3A5F" : "2px solid transparent",
              cursor: "pointer", marginBottom: -1,
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── クイズタブ ── */}
      {activeTab === "quiz" && <QuizMode words={words} />}

      {/* ── リクエストタブ ── */}
      {activeTab === "requests" && isAdmin && <RequestsMode words={words} setWords={setWords} />}

      {/* ── 設定タブ ── */}
      {activeTab === "settings" && isAdmin && <SettingsMode words={words} setWords={setWords} />}

      {/* ── 一覧タブ ── */}
      {activeTab === "list" && (
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "20px 16px" }}>

          {/* 申請完了メッセージ（一般ユーザー）*/}
          {!isAdmin && requestSent && (
            <div style={{ background: "#D1FAE5", border: "1px solid #6EE7B7", borderRadius: 10, padding: "14px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#065F46", fontWeight: 700 }}>
                ✅ 申請を受け付けました。管理者の承認後に反映されます。
              </span>
              <button onClick={() => setRequestSent(false)} style={{ background: "none", border: "none", fontSize: 18, color: "#065F46", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
          )}

          {/* 登録/リクエストボタン */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button onClick={() => showForm ? cancelForm() : setShowForm(true)} style={{
              background: showForm ? "#E7E5E4" : "#1E3A5F", color: showForm ? "#78716C" : "#fff",
              border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>{showForm ? "✕ キャンセル" : isAdmin ? "＋ 新規登録" : "＋ 登録リクエスト"}</button>
          </div>

          {/* 登録/リクエストフォーム */}
          {showForm && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 20, border: "2px solid rgba(30,58,95,0.12)", boxShadow: "0 4px 20px rgba(30,58,95,0.07)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1E3A5F", marginBottom: 4 }}>
                {editId !== null ? "✏️ 熟語を編集" : isAdmin ? "📝 新しい熟語を登録" : "📝 新しい熟語の登録をリクエスト"}
              </div>
              <div style={{ fontSize: 11, color: "#A8A29E", marginBottom: 14 }}>＊ がついている項目の入力は必須です</div>
              {formError && <div style={{ background: "#FEE2E2", color: "#991B1B", borderRadius: 6, padding: "8px 12px", fontSize: 12, marginBottom: 12 }}>{formError}</div>}
              <div className="form-row-top">
                <Field label="熟語 ＊">
                  <input value={form.jukugo} onChange={e => {
                    const val = e.target.value;
                    setForm({ ...form, jukugo: val });
                    setDupWarning(val.trim() !== "" && words.some(w => w.jukugo === val.trim() && w.id !== editId));
                  }} placeholder="例：温暖" style={inp} />
                  {dupWarning && (
                    <div style={{ fontSize: 11, color: "#92400E", background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 4, padding: "4px 8px", marginTop: 4 }}>
                      ⚠️ 「{form.jukugo}」は既に登録されています
                    </div>
                  )}
                </Field>
                <Field label="読み仮名 ＊"><input value={form.yomi} onChange={e => setForm({ ...form, yomi: e.target.value })} placeholder="例：おんだん" style={inp} /></Field>
                <Field label="対応関係 ＊">
                  <select value={form.relation} onChange={e => setForm({ ...form, relation: e.target.value })} style={{ ...inp, background: "#fff" }}>
                    {RELATION_TYPES.map(r => {
                      const desc = r.quizParts?.map(p => p.text).join("") ?? "";
                      const general = (desc && desc !== r.value) ? `${r.value}　(${desc})` : r.value;
                      return <option key={r.value} value={r.value}>{isAdmin ? r.label : general}</option>;
                    })}
                  </select>
                </Field>
              </div>
              <div className="form-row-bottom">
                <Field label={isAdmin ? "意味 ＊" : "意味"}><input value={form.meaning} onChange={e => setForm({ ...form, meaning: e.target.value })} placeholder="例：あたたかいこと" style={inp} /></Field>
                <Field label="例文"><input value={form.example} onChange={e => setForm({ ...form, example: e.target.value })} placeholder="例：今年の冬は温暖だった" style={inp} /></Field>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {isAdmin ? (
                  <button onClick={handleSubmit} disabled={saving} style={{ background: saving ? "#94A3B8" : "#1E3A5F", color: "#fff", border: "none", borderRadius: 7, padding: "9px 22px", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer" }}>
                    {saving ? "保存中…" : editId !== null ? "更新する" : "登録する"}
                  </button>
                ) : (
                  <button onClick={handleRequest} disabled={saving || cooldown} style={{ background: (saving || cooldown) ? "#94A3B8" : "#1E3A5F", color: "#fff", border: "none", borderRadius: 7, padding: "9px 22px", fontSize: 13, fontWeight: 700, cursor: (saving || cooldown) ? "default" : "pointer" }}>
                    {saving ? "送信中…" : cooldown ? "送信しました" : "リクエストする"}
                  </button>
                )}
                <button onClick={cancelForm} style={{ background: "#F5F4F0", color: "#78716C", border: "none", borderRadius: 7, padding: "9px 16px", fontSize: 13, cursor: "pointer" }}>キャンセル</button>
              </div>
            </div>
          )}

          {/* 検索・フィルター */}
          <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", marginBottom: 12, border: "1px solid #E7E5E4" }}>
            <div className="search-row-1">
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#78716C", marginBottom: 6, letterSpacing: 1 }}>KEYWORD</div>
                <input value={search} placeholder="検索ワードを入力…" onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ ...inp, marginBottom: 6 }} />
                <div style={{ display: "flex", gap: 14 }}>
                  {[["jukugo","熟語"],["yomi","読み"],["meaning","意味"]].map(([k, l]) => (
                    <label key={k} style={{ fontSize: 12, color: "#57534E", display: "flex", alignItems: "center", gap: 4, cursor: "pointer", userSelect: "none" }}>
                      <input type="checkbox" checked={targets[k]} onChange={e => setTargets({ ...targets, [k]: e.target.checked })} style={{ accentColor: "#1E3A5F", cursor: "pointer" }} />{l}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#78716C", marginBottom: 6, letterSpacing: 1 }}>対応関係</div>
                <select value={filterRel} onChange={e => { setFilterRel(e.target.value); setPage(1); }} style={{ ...inp, background: "#fff" }}>
                  <option value="all">すべて</option>
                  {RELATION_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div className="search-row-2">
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#78716C", marginBottom: 6, letterSpacing: 1 }}>ソート</div>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...inp, background: "#fff" }}>
                  {["登録順","読み仮名","関係種類"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#78716C", marginBottom: 6, letterSpacing: 1 }}>順序</div>
                <select value={sortDir} onChange={e => setSortDir(e.target.value)} style={{ ...inp, background: "#fff" }}>
                  <option value="asc">昇順 ↑</option>
                  <option value="desc">降順 ↓</option>
                </select>
              </div>
            </div>
          </div>

          {/* テーブル */}
          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #E7E5E4", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid #F0EFEE", background: "#FAFAF9" }}>
              <div style={{ fontSize: 12, color: "#78716C" }}>
                <span style={{ fontWeight: 700, color: "#1C1917" }}>{filtered.length}</span> 件
                {filtered.length !== words.length && <span style={{ marginLeft: 4 }}>（全 {words.length} 件中）</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#A8A29E", marginRight: 2 }}>表示件数</span>
                {[20, 50, 100].map(n => (
                  <button key={n} onClick={() => { setPageSize(n); setPage(1); }} style={{ background: pageSize === n ? "#1E3A5F" : "#F5F4F0", color: pageSize === n ? "#fff" : "#78716C", border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 12, cursor: "pointer", fontWeight: pageSize === n ? 700 : 400 }}>{n}</button>
                ))}
              </div>
            </div>

            {rows.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#A8A29E", fontSize: 14, lineHeight: 1.8 }}>
                {words.length === 0 ? <>まだ熟語が登録されていません。<br />「＋ 新規登録」から追加してください。</> : "検索条件に一致する熟語がありません。"}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: 36 }} /><col style={{ width: 68 }} /><col style={{ width: 100 }} />
                    <col style={{ width: 112 }} /><col style={{ width: 240 }} /><col style={{ width: 240 }} />{isAdmin && <col style={{ width: 136 }} />}
                  </colgroup>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #E7E5E4", background: "#FAFAF9" }}>
                      {["#","熟語","読み仮名","対応関係","意味","例文", ...(isAdmin ? ["操作"] : [])].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#78716C", letterSpacing: 1, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((w, i) => {
                      const rel = RMAP[w.relation];
                      const isConfirm = confirmDel === w.id;
                      return (
                        <tr key={w.id} style={{ borderBottom: "1px solid #F5F4F0", background: isConfirm ? "#FFF5F5" : undefined }}
                          onMouseEnter={e => { if (!isConfirm) e.currentTarget.style.background = "#FAFAF9"; }}
                          onMouseLeave={e => { if (!isConfirm) e.currentTarget.style.background = ""; }}>
                          <td style={{ padding: "11px 14px", color: "#C8C4BD", fontSize: 11 }}>{(curPage - 1) * pageSize + i + 1}</td>
                          <td style={{ padding: "11px 14px", fontWeight: 700, fontSize: 20, letterSpacing: 3, color: "#1C1917", whiteSpace: "nowrap" }}>{w.jukugo}</td>
                          <td style={{ padding: "11px 14px", color: "#78716C", fontSize: 12, whiteSpace: "nowrap" }}>{w.yomi}</td>
                          <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                            <span style={{ background: rel?.bg, color: rel?.color, border: `1px solid ${rel?.border}`, borderRadius: 4, padding: "3px 9px", fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>{w.relation}</span>
                          </td>
                          <td style={{ padding: "11px 14px", color: "#292524", lineHeight: 1.6 }}>{w.meaning}</td>
                          <td style={{ padding: "11px 14px", color: "#78716C", fontSize: 13 }}>{w.example || <span style={{ color: "#D6D3D1" }}>—</span>}</td>
                          {isAdmin && (
                          <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                            {isConfirm ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 12, color: "#991B1B", marginRight: 4 }}>削除しますか？</span>
                                <button onClick={() => handleDelete(w.id)} style={{ background: "#991B1B", color: "#fff", border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>はい</button>
                                <button onClick={() => setConfirmDel(null)} style={{ background: "#F5F4F0", color: "#57534E", border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>いいえ</button>
                              </div>
                            ) : (
                              <>
                                <button onClick={() => startEdit(w)} style={{ background: "none", color: "#1E3A5F", border: "1px solid #C8D8E8", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer", marginRight: 6, fontWeight: 600 }}>編集</button>
                                <button onClick={() => setConfirmDel(w.id)} style={{ background: "none", color: "#C85250", border: "1px solid #FCA5A5", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>削除</button>
                              </>
                            )}
                          </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 4, padding: "12px", borderTop: "1px solid #F0EFEE" }}>
                <PageBtn onClick={() => setPage(1)} disabled={curPage === 1}>«</PageBtn>
                <PageBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={curPage === 1}>‹</PageBtn>
                {Array.from({ length: Math.min(7, totalPages) }, (_, idx) => {
                  const start = Math.max(1, Math.min(curPage - 3, totalPages - 6));
                  return start + idx;
                }).filter(n => n >= 1 && n <= totalPages).map(n => (
                  <button key={n} onClick={() => setPage(n)} style={{ background: n === curPage ? "#1E3A5F" : "#F5F4F0", color: n === curPage ? "#fff" : "#57534E", border: "none", borderRadius: 5, width: 32, height: 30, fontSize: 13, cursor: "pointer", fontWeight: n === curPage ? 700 : 400 }}>{n}</button>
                ))}
                <PageBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={curPage === totalPages}>›</PageBtn>
                <PageBtn onClick={() => setPage(totalPages)} disabled={curPage === totalPages}>»</PageBtn>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
