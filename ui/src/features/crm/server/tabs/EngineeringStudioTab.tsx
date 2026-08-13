import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Database, Loader2, Pencil, Plus, RefreshCw, Search, ShieldCheck, Table2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { systemAPI } from '../api';
import { parseStudioValue, studioInputValue, studioPrimaryKey, type StudioColumn } from '../studioModel';

type TableInfo = { table_name: string; estimated_rows: number; column_count: number };
type RowsPayload = { table: string; columns: StudioColumn[]; rows: Record<string, unknown>[]; total: number; limit: number; offset: number; primary_key: string[]; editable_columns: string[]; editable: boolean };

const renderValue = (value: unknown) => {
  if (value === null || value === undefined) return <span className="text-muted-foreground">NULL</span>;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const EngineeringStudioTab = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selected, setSelected] = useState('');
  const [tableQuery, setTableQuery] = useState('');
  const [rowQuery, setRowQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [page, setPage] = useState(0);
  const [payload, setPayload] = useState<RowsPayload | null>(null);
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState<{ mode: 'create' | 'edit'; row?: Record<string, unknown> } | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const pageSize = 25;

  const loadTables = useCallback(async () => {
    setLoadingTables(true); setError('');
    try {
      const response = await systemAPI.getDatabaseTables();
      const rows = Array.isArray(response.data) ? response.data : [];
      setTables(rows);
      setSelected((current) => current || rows[0]?.table_name || '');
    } catch (err: any) { setError(err?.response?.data?.error || 'Could not load database tables. Owner access is required.'); }
    finally { setLoadingTables(false); }
  }, []);

  const loadRows = useCallback(async () => {
    if (!selected) return;
    setLoadingRows(true); setError('');
    try {
      const response = await systemAPI.getDatabaseTableRows(selected, { limit: pageSize, offset: page * pageSize, q: appliedQuery || undefined });
      setPayload(response.data);
    } catch (err: any) { setError(err?.response?.data?.error || 'Could not load table rows.'); }
    finally { setLoadingRows(false); }
  }, [appliedQuery, page, selected]);

  useEffect(() => { loadTables(); }, [loadTables]);
  useEffect(() => { loadRows(); }, [loadRows]);
  const filteredTables = useMemo(() => tables.filter((table) => table.table_name.toLowerCase().includes(tableQuery.toLowerCase())), [tableQuery, tables]);
  const totalPages = Math.max(1, Math.ceil(Number(payload?.total || 0) / pageSize));
  const openEditor = (mode: 'create' | 'edit', row?: Record<string, unknown>) => {
    setEditor({ mode, row }); setError('');
    setDraft(Object.fromEntries((payload?.columns || []).map(column => [column.column_name, studioInputValue(row?.[column.column_name])] )));
  };
  const saveRow = async () => {
    if (!payload || !editor) return;
    setSaving(true); setError('');
    try {
      const allowed = payload.editable_columns.filter(column => editor.mode === 'create' || !payload.primary_key.includes(column));
      const values = Object.fromEntries(allowed.filter(column => editor.mode === 'edit' || draft[column] !== '').map(column => {
        const metadata = payload.columns.find(item => item.column_name === column)!;
        return [column, parseStudioValue(draft[column] || '', metadata)];
      }));
      if (editor.mode === 'create') await systemAPI.createDatabaseTableRow(selected, values);
      else await systemAPI.updateDatabaseTableRow(selected, studioPrimaryKey(editor.row || {}, payload.primary_key), values);
      setEditor(null); await Promise.all([loadRows(), loadTables()]);
    } catch (err: any) { setError(err?.response?.data?.error || err?.message || 'Could not save row.'); }
    finally { setSaving(false); }
  };
  const deleteRow = async (row: Record<string, unknown>) => {
    if (!payload?.editable || !window.confirm(`Permanently delete this row from ${selected}? This cannot be undone.`)) return;
    setError('');
    try { await systemAPI.deleteDatabaseTableRow(selected, studioPrimaryKey(row, payload.primary_key)); await Promise.all([loadRows(), loadTables()]); }
    catch (err: any) { setError(err?.response?.data?.error || 'Could not delete row. It may still be referenced by other data.'); }
  };

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-emerald-50 px-4 py-3 text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200">
      <span className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4" />Live database browser · read-only · sensitive values redacted</span>
      <Button variant="outline" size="sm" onClick={() => { loadTables(); loadRows(); }}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
    </div>
    {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="overflow-hidden"><CardHeader className="border-b pb-3"><CardTitle className="flex items-center gap-2 text-base"><Database className="h-4 w-4" />Tables</CardTitle><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={tableQuery} onChange={(e) => setTableQuery(e.target.value)} placeholder="Find table..." className="h-9 pl-9" /></div></CardHeader>
        <CardContent className="max-h-[680px] overflow-y-auto p-2">{loadingTables ? <Loader2 className="mx-auto my-8 h-5 w-5 animate-spin" /> : filteredTables.map((table) => <button key={table.table_name} onClick={() => { setSelected(table.table_name); setPage(0); setAppliedQuery(''); setRowQuery(''); }} className={`mb-1 w-full rounded-md border p-2 text-left ${selected === table.table_name ? 'border-indigo-600 bg-indigo-600 text-white' : 'hover:bg-muted'}`}><div className="flex items-center justify-between gap-2"><b className="truncate text-sm">{table.table_name}</b><span className="text-[10px] opacity-70">~{Number(table.estimated_rows || 0).toLocaleString()}</span></div><p className="text-[10px] opacity-70">{table.column_count} columns</p></button>)}</CardContent>
      </Card>
      <Card className="min-w-0 overflow-hidden"><CardHeader className="border-b pb-3"><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle className="flex items-center gap-2 text-base"><Table2 className="h-4 w-4" />{selected || 'Select a table'}</CardTitle><div className="flex gap-2"><form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setPage(0); setAppliedQuery(rowQuery); }}><Input value={rowQuery} onChange={(e) => setRowQuery(e.target.value)} placeholder="Search rows..." className="h-9 w-56" /><Button size="sm">Search</Button></form><Button size="sm" onClick={() => openEditor('create')} disabled={!payload}><Plus className="mr-1 h-4 w-4" />Add row</Button></div></div></CardHeader>
        <CardContent className="p-0">{loadingRows ? <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : payload ? <><div className="max-h-[610px] overflow-auto"><table className="w-max min-w-full border-collapse text-xs"><thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900"><tr>{payload.editable && <th className="border-b border-r px-3 py-2">Actions</th>}{payload.columns.map((column) => <th key={column.column_name} className="whitespace-nowrap border-b border-r px-3 py-2 text-left"><div>{column.column_name}</div><div className="text-[9px] font-normal text-muted-foreground">{column.data_type}</div></th>)}</tr></thead><tbody>{payload.rows.map((row, index) => <tr key={index} className="hover:bg-muted/50">{payload.editable && <td className="whitespace-nowrap border-b border-r px-2"><Button variant="ghost" size="icon" aria-label="Edit row" onClick={() => openEditor('edit', row)}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" aria-label="Delete row" className="text-rose-600" onClick={() => deleteRow(row)}><Trash2 className="h-3.5 w-3.5" /></Button></td>}{payload.columns.map((column) => <td key={column.column_name} className="max-w-72 truncate whitespace-nowrap border-b border-r px-3 py-2 font-mono" title={String(row[column.column_name] ?? '')}>{renderValue(row[column.column_name])}</td>)}</tr>)}</tbody></table>{payload.rows.length === 0 && <div className="p-12 text-center text-sm text-muted-foreground">No rows found.</div>}</div><div className="flex items-center justify-between border-t px-4 py-3 text-sm"><span>{payload.total.toLocaleString()} rows</span><div className="flex items-center gap-2"><Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button><span>{page + 1} / {totalPages}</span><Button variant="outline" size="icon" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button></div></div></> : null}</CardContent>
      </Card>
    </div>
    <Dialog open={Boolean(editor)} onOpenChange={(open) => !open && setEditor(null)}><DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{editor?.mode === 'create' ? `Add row to ${selected}` : `Edit ${selected} row`}</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-2">{payload?.columns.filter(column => payload.editable_columns.includes(column.column_name) && (editor?.mode === 'create' || !payload.primary_key.includes(column.column_name))).map(column => <div key={column.column_name} className="space-y-1"><Label htmlFor={`studio-${column.column_name}`}>{column.column_name} <span className="text-muted-foreground">· {column.data_type}</span></Label><Input id={`studio-${column.column_name}`} value={draft[column.column_name] || ''} onChange={event => setDraft(current => ({ ...current, [column.column_name]: event.target.value }))} placeholder={column.column_default ? `Default: ${column.column_default}` : column.is_nullable === 'YES' ? 'NULL' : 'Required'} /></div>)}</div><DialogFooter><Button variant="outline" onClick={() => setEditor(null)}>Cancel</Button><Button onClick={saveRow} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save row</Button></DialogFooter></DialogContent></Dialog>
  </div>;
};

export default EngineeringStudioTab;
