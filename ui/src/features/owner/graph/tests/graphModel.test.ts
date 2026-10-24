import { describe, expect, it } from 'vitest';
import { collapse, layoutGraph, ROOT_ID, ROW_GAP, type GraphNode } from '../graphModel';

const node = (id: string, kind: GraphNode['kind'] = 'center'): GraphNode => ({ id, kind, label: id, expandable: true });
const root = node(ROOT_ID, 'root');

describe('layoutGraph', () => {
  it('shows only the root until it is opened', () => {
    const { nodes, edges } = layoutGraph(root, { [ROOT_ID]: [node('a'), node('b')] }, new Set());
    expect(nodes.map((n) => n.id)).toEqual([ROOT_ID]);
    expect(edges).toEqual([]);
  });

  it('puts children one column right and centres the parent beside them', () => {
    const children = { [ROOT_ID]: [node('a'), node('b'), node('c')] };
    const { nodes, edges } = layoutGraph(root, children, new Set([ROOT_ID]));
    const at = (id: string) => nodes.find((n) => n.id === id)!;
    expect(at('a').depth).toBe(1);
    expect(at('a').x).toBeGreaterThan(at(ROOT_ID).x);
    expect(at(ROOT_ID).y).toBe(at('b').y);
    expect(edges.map((e) => e.target)).toEqual(['a', 'b', 'c']);
    expect(at('c').y - at('a').y).toBe(2 * ROW_GAP);
  });

  it('keeps an opened child clear of its siblings', () => {
    const children = { [ROOT_ID]: [node('a'), node('b')], a: [node('a1', 'teacher'), node('a2', 'teacher'), node('a3', 'teacher')] };
    const { nodes } = layoutGraph(root, children, new Set([ROOT_ID, 'a']));
    const ys = nodes.filter((n) => n.depth >= 1).map((n) => `${n.depth}:${n.y}`);
    expect(new Set(ys).size).toBe(ys.length);
    const at = (id: string) => nodes.find((n) => n.id === id)!;
    expect(at('b').y).toBeGreaterThan(at('a3').y);
  });
});

describe('collapse', () => {
  it('closes a node and everything opened below it', () => {
    const children = { [ROOT_ID]: [node('a')], a: [node('a1')], a1: [node('x')] };
    const next = collapse('a', new Set([ROOT_ID, 'a', 'a1']), children);
    expect([...next]).toEqual([ROOT_ID]);
  });
});
