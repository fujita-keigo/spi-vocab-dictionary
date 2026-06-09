import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const RELATION_TYPES = [
  { value: "類義", label: "類義関係",    bg: "#FEF3C7", color: "#92400E", border: "#FCD34D" },
  { value: "対義", label: "対義関係",    bg: "#FEE2E2", color: "#991B1B", border: "#FCA5A5" },
  { value: "修飾", label: "修飾関係",    bg: "#DBEAFE", color: "#1E40AF", border: "#93C5FD" },
  { value: "動作", label: "動作・目的語", bg: "#D1FAE5", color: "#065F46", border: "#6EE7B7" },
  { value: "主述", label: "主語・述語",  bg: "#EDE9FE", color: "#5B21B6", border: "#C4B5FD" },
  { value: "その他", label: "その他",    bg: "#F5F4F0", color: "#57534E", border: "#D6D3D1" },
];
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
      <div style={{ fontSize: 11, fontWeight: 700, color: "#78716C", marginBottom: 5, letterSpacing: 0.5 }}>
        {label}
      </div>
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
    }}>
      {children}
    </button>
  );
}

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

  // Supabaseから読み込み
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("words")
        .select("*")
        .order("id", { ascending: true });
      if (data) setWords(data);
      setLoading(false);
    };
    load();
  }, []);

  // 登録・更新
  const handleSubmit = async () => {
    const { jukugo, yomi, meaning } = form;
    if (!jukugo.trim() || !yomi.trim() || !meaning.trim()) {
      setFormError("熟語・読み仮名・意味は必須です");
      return;
    }
    setFormError("");
    setSaving(true);

    if (editId !== null) {
      // 更新
      const { data } = await supabase
        .from("words")
        .update({ jukugo: form.jukugo, yomi: form.yomi, relation: form.relation, meaning: form.meaning, example: form.example })
        .eq("id", editId)
        .select();
      if (data) setWords(words.map(w => w.id === editId ? data[0] : w));
    } else {
      // 新規登録
      const { data } = await supabase
        .from("words")
        .insert([{ jukugo: form.jukugo, yomi: form.yomi, relation: form.relation, meaning: form.meaning, example: form.example }])
        .select();
      if (data) setWords([...words, data[0]]);
    }

    setSaving(false);
    setForm(EMPTY); setEditId(null); setShowForm(false);
  };

  // 編集開始
  const startEdit = (w) => {
    setForm({ jukugo: w.jukugo, yomi: w.yomi, relation: w.relation, meaning: w.meaning, example: w.example || "" });
    setEditId(w.id); setShowForm(true); setFormError(""); setConfirmDel(null);
  };

  // 削除確定
  const handleDelete = async (id) => {
    await supabase.from("words").delete().eq("id", id);
    setWords(words.filter(w => w.id !== id));
    setConfirmDel(null);
  };

  const cancelForm = () => {
    setForm(EMPTY); setEditId(null); setShowForm(false); setFormError("");
  };

  // フィルター・ソート・ページング
  const filtered = words
    .filter(w => {
      if (filterRel !== "all" && w.relation !== filterRel) return false;
      if (search.trim()) {
        const q = search.trim();
        return (targets.jukugo  && w.jukugo.includes(q)) ||
               (targets.yomi    && w.yomi.includes(q))   ||
               (targets.meaning && w.meaning.includes(q));
      }
      return true;
    })
    .sort((a, b) => {
      let c = 0;
      if      (sortBy === "登録順")  c = a.id - b.id;
      else if (sortBy === "読み仮名") c = a.yomi.localeCompare(b.yomi, "ja");
      else if (sortBy === "関係種類") c = RELATION_TYPES.findIndex(r => r.value === a.relation)
                                       - RELATION_TYPES.findIndex(r => r.value === b.relation);
      return sortDir === "asc" ? c : -c;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const curPage    = Math.min(page, totalPages);
  const rows       = filtered.slice((curPage - 1) * pageSize, curPage * pageSize);

  const ff = { fontFamily: "'Hiragino Kaku Gothic ProN','Hiragino Sans','Meiryo',sans-serif" };

  if (loading) return (
    <div style={{ ...ff, display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#F5F4F0", color: "#78716C" }}>
      読み込み中…
    </div>
  );

  return (
    <div style={{ ...ff, background: "#F5F4F0", minHeight: "100vh", padding: "24px 16px" }}>
      <style>{`
        .form-row-top {
          display: grid;
          grid-template-columns: 110px 180px 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }
        .form-row-bottom {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }
        .search-row-1 {
          display: grid;
          grid-template-columns: 1fr 175px;
          gap: 12px;
          align-items: end;
          margin-bottom: 12px;
        }
        .search-row-2 {
          display: grid;
          grid-template-columns: 145px 120px;
          gap: 12px;
          align-items: end;
        }
        @media (max-width: 600px) {
          .form-row-top {
            grid-template-columns: 1fr 1fr;
          }
          .form-row-top > :nth-child(3) {
            grid-column: 1 / -1;
          }
          .form-row-bottom {
            grid-template-columns: 1fr;
          }
          .search-row-1 {
            grid-template-columns: 1fr;
          }
          .search-row-2 {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>

        {/* ── ヘッダー ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 4, color: "#C85250", fontWeight: 700, marginBottom: 4 }}>SPI 対策ノート</div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1C1917", letterSpacing: 1 }}>二字熟語 対応関係</h1>
            <div style={{ marginTop: 4, fontSize: 12, color: "#A8A29E" }}>全 {words.length} 語登録済み</div>
          </div>
          <button
            onClick={() => showForm ? cancelForm() : setShowForm(true)}
            style={{
              background: showForm ? "#E7E5E4" : "#1E3A5F",
              color: showForm ? "#78716C" : "#fff",
              border: "none", borderRadius: 8, padding: "10px 20px",
              fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: 0.5,
            }}
          >
            {showForm ? "✕ キャンセル" : "＋ 新規登録"}
          </button>
        </div>

        {/* ── 登録フォーム ── */}
        {showForm && (
          <div style={{
            background: "#fff", borderRadius: 12, padding: 20, marginBottom: 20,
            border: "2px solid rgba(30,58,95,0.12)", boxShadow: "0 4px 20px rgba(30,58,95,0.07)",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1E3A5F", marginBottom: 14 }}>
              {editId !== null ? "✏️ 熟語を編集" : "📝 新しい熟語を登録"}
            </div>
            {formError && (
              <div style={{ background: "#FEE2E2", color: "#991B1B", borderRadius: 6, padding: "8px 12px", fontSize: 12, marginBottom: 12 }}>
                {formError}
              </div>
            )}
            <div className="form-row-top">
              <Field label="熟語 ＊">
                <input value={form.jukugo} onChange={e => setForm({ ...form, jukugo: e.target.value })}
                  placeholder="例：温暖" style={inp} />
              </Field>
              <Field label="読み仮名 ＊">
                <input value={form.yomi} onChange={e => setForm({ ...form, yomi: e.target.value })}
                  placeholder="例：おんだん" style={inp} />
              </Field>
              <Field label="対応関係 ＊">
                <select value={form.relation} onChange={e => setForm({ ...form, relation: e.target.value })}
                  style={{ ...inp, background: "#fff" }}>
                  {RELATION_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </Field>
            </div>
            <div className="form-row-bottom">
              <Field label="意味 ＊">
                <input value={form.meaning} onChange={e => setForm({ ...form, meaning: e.target.value })}
                  placeholder="例：あたたかいこと" style={inp} />
              </Field>
              <Field label="例文">
                <input value={form.example} onChange={e => setForm({ ...form, example: e.target.value })}
                  placeholder="例：今年の冬は温暖だった" style={inp} />
              </Field>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleSubmit} disabled={saving} style={{
                background: saving ? "#94A3B8" : "#1E3A5F", color: "#fff", border: "none",
                borderRadius: 7, padding: "9px 22px", fontSize: 13, fontWeight: 700,
                cursor: saving ? "default" : "pointer",
              }}>
                {saving ? "保存中…" : editId !== null ? "更新する" : "登録する"}
              </button>
              <button onClick={cancelForm} disabled={saving} style={{
                background: "#F5F4F0", color: "#78716C", border: "none",
                borderRadius: 7, padding: "9px 16px", fontSize: 13, cursor: "pointer",
              }}>
                キャンセル
              </button>
            </div>
          </div>
        )}

        {/* ── 検索・フィルター・ソート ── */}
        <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", marginBottom: 12, border: "1px solid #E7E5E4" }}>
          <div className="search-row-1">
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#78716C", marginBottom: 6, letterSpacing: 1 }}>KEYWORD</div>
              <input value={search} placeholder="検索ワードを入力…"
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ ...inp, marginBottom: 6 }} />
              <div style={{ display: "flex", gap: 14 }}>
                {[["jukugo","熟語"],["yomi","読み"],["meaning","意味"]].map(([k, l]) => (
                  <label key={k} style={{ fontSize: 12, color: "#57534E", display: "flex", alignItems: "center", gap: 4, cursor: "pointer", userSelect: "none" }}>
                    <input type="checkbox" checked={targets[k]}
                      onChange={e => setTargets({ ...targets, [k]: e.target.checked })}
                      style={{ accentColor: "#1E3A5F", cursor: "pointer" }} />
                    {l}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#78716C", marginBottom: 6, letterSpacing: 1 }}>対応関係</div>
              <select value={filterRel} onChange={e => { setFilterRel(e.target.value); setPage(1); }}
                style={{ ...inp, background: "#fff" }}>
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

        {/* ── テーブル ── */}
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #E7E5E4", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid #F0EFEE", background: "#FAFAF9" }}>
            <div style={{ fontSize: 12, color: "#78716C" }}>
              <span style={{ fontWeight: 700, color: "#1C1917" }}>{filtered.length}</span> 件
              {filtered.length !== words.length && <span style={{ marginLeft: 4 }}>（全 {words.length} 件中）</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#A8A29E", marginRight: 2 }}>表示件数</span>
              {[20, 50, 100].map(n => (
                <button key={n} onClick={() => { setPageSize(n); setPage(1); }} style={{
                  background: pageSize === n ? "#1E3A5F" : "#F5F4F0",
                  color: pageSize === n ? "#fff" : "#78716C",
                  border: "none", borderRadius: 5, padding: "4px 10px",
                  fontSize: 12, cursor: "pointer", fontWeight: pageSize === n ? 700 : 400,
                }}>{n}</button>
              ))}
            </div>
          </div>

          {rows.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#A8A29E", fontSize: 14, lineHeight: 1.8 }}>
              {words.length === 0
                ? <>まだ熟語が登録されていません。<br />「＋ 新規登録」から追加してください。</>
                : "検索条件に一致する熟語がありません。"}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: 36 }} />
                  <col style={{ width: 68 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 112 }} />
                  <col style={{ width: 240 }} />
                  <col style={{ width: 240 }} />
                  <col style={{ width: 136 }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: "2px solid #E7E5E4", background: "#FAFAF9" }}>
                    {["#","熟語","読み仮名","対応関係","意味","例文","操作"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#78716C", letterSpacing: 1, whiteSpace: "nowrap" }}>
                        {h}
                      </th>
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
                        <td style={{ padding: "11px 14px", color: "#C8C4BD", fontSize: 11 }}>
                          {(curPage - 1) * pageSize + i + 1}
                        </td>
                        <td style={{ padding: "11px 14px", fontWeight: 700, fontSize: 20, letterSpacing: 3, color: "#1C1917", whiteSpace: "nowrap" }}>
                          {w.jukugo}
                        </td>
                        <td style={{ padding: "11px 14px", color: "#78716C", fontSize: 12, whiteSpace: "nowrap" }}>
                          {w.yomi}
                        </td>
                        <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                          <span style={{
                            background: rel?.bg, color: rel?.color, border: `1px solid ${rel?.border}`,
                            borderRadius: 4, padding: "3px 9px", fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
                          }}>
                            {w.relation}
                          </span>
                        </td>
                        <td style={{ padding: "11px 14px", color: "#292524", lineHeight: 1.6 }}>
                          {w.meaning}
                        </td>
                        <td style={{ padding: "11px 14px", color: "#78716C", fontSize: 13 }}>
                          {w.example || <span style={{ color: "#D6D3D1" }}>—</span>}
                        </td>
                        <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                          {isConfirm ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 12, color: "#991B1B", marginRight: 4 }}>削除しますか？</span>
                              <button onClick={() => handleDelete(w.id)} style={{
                                background: "#991B1B", color: "#fff", border: "none",
                                borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 700,
                              }}>はい</button>
                              <button onClick={() => setConfirmDel(null)} style={{
                                background: "#F5F4F0", color: "#57534E", border: "none",
                                borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer",
                              }}>いいえ</button>
                            </div>
                          ) : (
                            <>
                              <button onClick={() => startEdit(w)} style={{
                                background: "none", color: "#1E3A5F", border: "1px solid #C8D8E8",
                                borderRadius: 5, padding: "4px 10px", fontSize: 11,
                                cursor: "pointer", marginRight: 6, fontWeight: 600,
                              }}>編集</button>
                              <button onClick={() => setConfirmDel(w.id)} style={{
                                background: "none", color: "#C85250", border: "1px solid #FCA5A5",
                                borderRadius: 5, padding: "4px 10px", fontSize: 11,
                                cursor: "pointer", fontWeight: 600,
                              }}>削除</button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 4, padding: "12px", borderTop: "1px solid #F0EFEE" }}>
              <PageBtn onClick={() => setPage(1)}                                disabled={curPage === 1}>«</PageBtn>
              <PageBtn onClick={() => setPage(p => Math.max(1, p - 1))}         disabled={curPage === 1}>‹</PageBtn>
              {Array.from({ length: Math.min(7, totalPages) }, (_, idx) => {
                const start = Math.max(1, Math.min(curPage - 3, totalPages - 6));
                return start + idx;
              }).filter(n => n >= 1 && n <= totalPages).map(n => (
                <button key={n} onClick={() => setPage(n)} style={{
                  background: n === curPage ? "#1E3A5F" : "#F5F4F0",
                  color: n === curPage ? "#fff" : "#57534E",
                  border: "none", borderRadius: 5, width: 32, height: 30,
                  fontSize: 13, cursor: "pointer", fontWeight: n === curPage ? 700 : 400,
                }}>{n}</button>
              ))}
              <PageBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={curPage === totalPages}>›</PageBtn>
              <PageBtn onClick={() => setPage(totalPages)}                        disabled={curPage === totalPages}>»</PageBtn>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
