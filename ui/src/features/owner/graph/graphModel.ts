// The owner's graph: Owner -> centers -> teachers -> students -> the student's tabs -> that tab's
// data. Nodes load as they are opened; this file only holds the tree and where each node is drawn.
export type GraphKind = 'root' | 'center' | 'teacher' | 'student' | 'tab' | 'item' | 'more';

export type GraphNode = {
  id: string;
  kind: GraphKind;
  label: string;
  sub?: string;
  /** Click opens (loads) the children; items and "more" notes are leaves. */
  expandable: boolean;
  /** The records the node stands for, for loading its children. */
  ref?: { centerId?: number; teacherId?: number; studentId?: number; classId?: number | null; tab?: StudentTabId };
};

/** The tabs of a student's page, in the order the page shows them. */
export const STUDENT_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'groups', label: 'Groups' },
  { id: 'videos', label: 'Videos' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'payments', label: 'Payments' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'individual-tasks', label: 'Individual Tasks' },
  { id: 'grades', label: 'Grades' },
  { id: 'coins', label: 'Coins' },
] as const;
export type StudentTabId = (typeof STUDENT_TABS)[number]['id'];

export const ROOT_ID = 'root';
export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 56;
const COLUMN_GAP = 270;
export const ROW_GAP = 76;

export type PlacedNode = GraphNode & { x: number; y: number; depth: number; open: boolean };
export type PlacedEdge = { id: string; source: string; target: string };

/**
 * A tidy tree, left to right: each opened node's children sit one column right, and a parent is
 * centred beside its children. `children` maps a node id to its loaded children; only opened nodes
 * show them.
 */
export const layoutGraph = (root: GraphNode, children: Record<string, GraphNode[]>, open: ReadonlySet<string>) => {
  const nodes: PlacedNode[] = [];
  const edges: PlacedEdge[] = [];
  let nextRow = 0;

  const place = (node: GraphNode, depth: number): number => {
    const isOpen = open.has(node.id) && (children[node.id]?.length ?? 0) > 0;
    let y: number;
    if (isOpen) {
      const rows = children[node.id].map((child) => {
        edges.push({ id: `${node.id}->${child.id}`, source: node.id, target: child.id });
        return place(child, depth + 1);
      });
      y = (rows[0] + rows[rows.length - 1]) / 2;
    } else {
      y = nextRow * ROW_GAP;
      nextRow += 1;
    }
    nodes.push({ ...node, x: depth * COLUMN_GAP, y, depth, open: isOpen });
    return y;
  };
  place(root, 0);
  return { nodes, edges };
};

/** Closing a node also closes everything opened below it. */
export const collapse = (id: string, open: ReadonlySet<string>, children: Record<string, GraphNode[]>) => {
  const next = new Set(open);
  const drop = (nodeId: string) => {
    next.delete(nodeId);
    (children[nodeId] || []).forEach((child) => drop(child.id));
  };
  drop(id);
  return next;
};

/** The nodes to bring into view after opening one: the node and its new children. */
export const focusIds = (id: string, children: Record<string, GraphNode[]>) => [id, ...(children[id] || []).map((child) => child.id)];

export const MAX_CHILDREN = 100;
