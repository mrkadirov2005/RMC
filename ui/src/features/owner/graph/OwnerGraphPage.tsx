// The owner's graph page: one main node, opened step by step down to a student's tab data.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Background, Controls, ReactFlow, ReactFlowProvider, useReactFlow, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Network } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getErrorMessage } from '@/utils/errorMessage';
import { GraphNodeCard } from './GraphNodeCard';
import { loadCenters, loadStudents, loadTabData, loadTeachers, studentTabNodes } from './graphApi';
import { ROOT_ID, collapse, focusIds, layoutGraph, type GraphNode } from './graphModel';

const ROOT: GraphNode = { id: ROOT_ID, kind: 'root', label: 'Owner', sub: 'All centers', expandable: true };
const nodeTypes = { card: GraphNodeCard };

const loadChildren = (node: GraphNode): Promise<GraphNode[]> => {
  const ref = node.ref || {};
  if (node.kind === 'root') return loadCenters();
  if (node.kind === 'center') return loadTeachers(ref.centerId as number);
  if (node.kind === 'teacher') return loadStudents(ref.centerId as number, ref.teacherId as number);
  if (node.kind === 'student') return Promise.resolve(studentTabNodes(node));
  if (node.kind === 'tab') return loadTabData(node);
  return Promise.resolve([]);
};

const Graph = () => {
  const { fitView } = useReactFlow();
  const [children, setChildren] = useState<Record<string, GraphNode[]>>({});
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const [loading, setLoading] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState('');
  const pendingFocus = useRef<string | null>(null);
  const byId = useRef(new Map<string, GraphNode>([[ROOT_ID, ROOT]]));

  const toggle = useCallback(async (id: string) => {
    const node = byId.current.get(id);
    if (!node || !node.expandable || loading.has(id)) return;
    if (open.has(id)) {
      setOpen((current) => collapse(id, current, children));
      return;
    }
    let loaded = children[id];
    if (!loaded) {
      setLoading((current) => new Set(current).add(id));
      setError('');
      try {
        loaded = await loadChildren(node);
      } catch (requestError) {
        setError(getErrorMessage(requestError) || 'Could not load this part of the graph.');
        return;
      } finally {
        setLoading((current) => { const next = new Set(current); next.delete(id); return next; });
      }
      loaded.forEach((child) => byId.current.set(child.id, child));
      setChildren((current) => ({ ...current, [id]: loaded }));
    }
    pendingFocus.current = id;
    setOpen((current) => new Set(current).add(id));
  }, [children, loading, open]);

  useEffect(() => { void toggle(ROOT_ID); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const layout = useMemo(() => layoutGraph(ROOT, children, open), [children, open]);
  const nodes: Node[] = useMemo(() => layout.nodes.map((node) => ({
    id: node.id, type: 'card', position: { x: node.x, y: node.y }, draggable: false,
    data: { kind: node.kind, label: node.label, sub: node.sub, expandable: node.expandable, open: node.open, loading: loading.has(node.id) },
  })), [layout, loading]);
  const edges: Edge[] = useMemo(() => layout.edges.map((edge) => ({ ...edge, type: 'smoothstep' })), [layout]);

  // After a node opens, bring it and its new children into view.
  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    const wanted = new Set(focusIds(id, children));
    window.requestAnimationFrame(() => { void fitView({ nodes: nodes.filter((node) => wanted.has(node.id)), duration: 400, padding: 0.3, maxZoom: 1.1 }); });
  }, [nodes, children, fitView]);

  return (
    <div className="space-y-3">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="h-[calc(100vh-14rem)] min-h-[420px] overflow-hidden rounded-lg border bg-card" data-testid="owner-graph">
        <ReactFlow
          nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView minZoom={0.15} maxZoom={1.5}
          nodesConnectable={false} elementsSelectable={false} proOptions={{ hideAttribution: true }}
          onNodeClick={(_, node) => { void toggle(node.id); }}
        >
          <Background gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
};

const OwnerGraphPage = () => (
  <div className="space-y-4">
    <PageHeader
      title="Graph"
      description="Click a node to open it: centers, their teachers, each teacher's students, a student's tabs, and what is in each tab. Click again to close it."
      icon={Network}
    />
    <ReactFlowProvider>
      <Graph />
    </ReactFlowProvider>
  </div>
);

export default OwnerGraphPage;
