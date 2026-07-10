import { useMemo, useState } from 'react';
import { ChevronRight, Database, GitBranch, KeyRound, Network, Search, Table2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { schemaDomains, schemaTables } from '../engineeringSchema';
import type { SchemaColumn, SchemaReference, SchemaTable } from '../engineeringSchema';

const roleClass: Record<NonNullable<SchemaColumn['role']>, string> = {
  pk: 'bg-slate-950 text-white',
  fk: 'bg-blue-600 text-white',
  enum: 'bg-amber-500 text-white',
  unique: 'bg-fuchsia-600 text-white',
  json: 'bg-emerald-600 text-white',
};

const domainTone: Record<string, string> = {
  'Tenant Core': 'border-sky-300 bg-sky-50 text-sky-950',
  People: 'border-emerald-300 bg-emerald-50 text-emerald-950',
  Academic: 'border-blue-300 bg-blue-50 text-blue-950',
  Finance: 'border-amber-300 bg-amber-50 text-amber-950',
  Testing: 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-950',
  Resources: 'border-lime-300 bg-lime-50 text-lime-950',
  System: 'border-slate-300 bg-slate-50 text-slate-950',
};

const normalize = (value: string) => value.trim().toLowerCase();

const relationLabel = (ref: SchemaReference) =>
  `${ref.column} -> ${ref.targetTable}.${ref.targetColumn}${ref.onDelete ? ` / ${ref.onDelete}` : ''}`;

const ColumnRow = ({ column }: { column: SchemaColumn }) => (
  <div className="grid grid-cols-[minmax(0,1fr)_110px_56px] items-center gap-2 border-b px-3 py-2 text-xs last:border-b-0">
    <span className="truncate font-semibold text-slate-950 dark:text-foreground">{column.name}</span>
    <span className="truncate text-muted-foreground">{column.type}</span>
    {column.role ? (
      <span className={`rounded-full px-2 py-0.5 text-center text-[10px] font-bold uppercase ${roleClass[column.role]}`}>
        {column.role}
      </span>
    ) : (
      <span className="text-center text-muted-foreground">-</span>
    )}
  </div>
);

const RelationshipCard = ({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center gap-2 text-sm">
        <GitBranch className="h-4 w-4 text-primary" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2 text-xs">
      {children || <p className="text-muted-foreground">{empty}</p>}
    </CardContent>
  </Card>
);

const EngineeringDatabaseTab = () => {
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('All');
  const [selectedTableName, setSelectedTableName] = useState('students');

  const filteredTables = useMemo(() => {
    const text = normalize(query);
    return schemaTables.filter((table) => {
      const matchesDomain = domain === 'All' || table.domain === domain;
      const haystack = [
        table.table,
        table.domain,
        table.purpose,
        ...table.columns.map((column) => `${column.name} ${column.type} ${column.role || ''}`),
        ...(table.references || []).map(relationLabel),
      ].join(' ').toLowerCase();
      return matchesDomain && (!text || haystack.includes(text));
    });
  }, [domain, query]);

  const selectedTable = schemaTables.find((table) => table.table === selectedTableName) || schemaTables[0];
  const outbound = selectedTable.references || [];
  const inbound = schemaTables.flatMap((table) =>
    (table.references || [])
      .filter((ref) => ref.targetTable === selectedTable.table)
      .map((ref) => ({ fromTable: table.table, ref }))
  );

  const groupedFilteredTables = useMemo(() => {
    const groups = new Map<string, SchemaTable[]>();
    filteredTables.forEach((table) => {
      const list = groups.get(table.domain) || [];
      list.push(table);
      groups.set(table.domain, list);
    });
    return Array.from(groups.entries());
  }, [filteredTables]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Card className="bg-slate-950 text-white">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-white/60">Tables</p>
            <p className="mt-1 text-3xl font-bold">{schemaTables.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Domains</p>
            <p className="mt-1 text-3xl font-bold">{schemaDomains.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Selected</p>
            <p className="mt-1 truncate text-lg font-bold">{selectedTable.table}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Relations</p>
            <p className="mt-1 text-3xl font-bold">{inbound.length + outbound.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/40 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-primary" />
              Schema State Tree
            </CardTitle>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tables, fields, refs..."
                className="h-9 pl-9"
              />
            </div>
            <div className="mt-2 flex gap-1 overflow-x-auto">
              {['All', ...schemaDomains].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setDomain(item)}
                  className={`h-7 shrink-0 rounded-md px-2 text-xs font-semibold ${
                    domain === item ? 'bg-slate-950 text-white dark:bg-primary' : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="max-h-[720px] overflow-y-auto p-2">
            {groupedFilteredTables.map(([group, tables]) => (
              <div key={group} className="mb-3 last:mb-0">
                <div className="px-2 py-1 text-[11px] font-bold uppercase text-muted-foreground">{group}</div>
                <div className="space-y-1">
                  {tables.map((table) => {
                    const active = table.table === selectedTable.table;
                    return (
                      <button
                        key={table.table}
                        type="button"
                        onClick={() => setSelectedTableName(table.table)}
                        className={`w-full rounded-md border px-2 py-2 text-left transition ${
                          active ? 'border-slate-950 bg-slate-950 text-white shadow-sm dark:border-primary dark:bg-primary' : 'bg-card hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <ChevronRight className={`h-3.5 w-3.5 ${active ? 'text-white' : 'text-muted-foreground'}`} />
                          <span className="truncate text-sm font-bold">{table.table}</span>
                          <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
                            {table.columns.length}
                          </span>
                        </div>
                        <p className={`mt-1 truncate text-xs ${active ? 'text-white/75' : 'text-muted-foreground'}`}>
                          {table.purpose}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className={`border-2 ${domainTone[selectedTable.domain] || 'border-slate-300 bg-slate-50'}`}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">{selectedTable.domain}</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-950">{selectedTable.table}</h2>
                  <p className="mt-1 max-w-2xl text-sm text-slate-700">{selectedTable.purpose}</p>
                </div>
                <div className="flex gap-2">
                  <span className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm">
                    {selectedTable.columns.length} columns
                  </span>
                  <span className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm">
                    {(selectedTable.references || []).length} outbound refs
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Table2 className="h-4 w-4 text-primary" />
                  Columns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-lg border">
                  <div className="grid grid-cols-[minmax(0,1fr)_110px_56px] bg-muted px-3 py-2 text-xs font-bold uppercase text-muted-foreground">
                    <span>Name</span>
                    <span>Type</span>
                    <span className="text-center">Role</span>
                  </div>
                  {selectedTable.columns.map((column) => (
                    <ColumnRow key={column.name} column={column} />
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <RelationshipCard title="Outbound References" empty="No outgoing foreign keys.">
                {outbound.map((ref) => (
                  <div key={`${ref.column}-${ref.targetTable}`} className="rounded-lg border bg-card p-2">
                    <p className="font-bold">{ref.column}</p>
                    <p className="mt-1 text-muted-foreground">to {ref.targetTable}.{ref.targetColumn}</p>
                    {ref.onDelete && <p className="mt-1 text-[11px] font-semibold text-amber-600">on delete {ref.onDelete}</p>}
                  </div>
                ))}
              </RelationshipCard>

              <RelationshipCard title="Inbound Dependents" empty="No tables point here.">
                {inbound.map(({ fromTable, ref }) => (
                  <div key={`${fromTable}-${ref.column}`} className="rounded-lg border bg-card p-2">
                    <p className="font-bold">{fromTable}</p>
                    <p className="mt-1 text-muted-foreground">{ref.column} uses this table</p>
                  </div>
                ))}
              </RelationshipCard>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Network className="h-4 w-4 text-primary" />
                Relationship Inspector
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 lg:grid-cols-[1fr_220px_1fr]">
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Inbound</p>
                  {inbound.length ? inbound.map(({ fromTable }) => (
                    <div key={fromTable} className="rounded-lg border bg-muted/50 px-3 py-2 text-sm font-semibold">
                      {fromTable}
                    </div>
                  )) : <div className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">No inbound tables</div>}
                </div>
                <div className="flex items-center justify-center rounded-xl border-2 border-slate-950 bg-slate-950 p-4 text-center text-sm font-bold text-white">
                  <KeyRound className="mr-2 h-4 w-4" />
                  {selectedTable.table}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Outbound</p>
                  {outbound.length ? outbound.map((ref) => (
                    <div key={`${ref.column}-${ref.targetTable}`} className="rounded-lg border bg-muted/50 px-3 py-2 text-sm font-semibold">
                      {ref.targetTable}
                    </div>
                  )) : <div className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">No outbound tables</div>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EngineeringDatabaseTab;
