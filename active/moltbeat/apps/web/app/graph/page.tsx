'use client';

import { useQuery } from '@tanstack/react-query';
import { Navigation } from '@/components/Navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { api } from '@/lib/api';
import { useState, useEffect, useRef } from 'react';
import { Activity, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface GraphNode {
  id: string;
  label: string;
  size: number;
  color: string;
  x: number;
  y: number;
  status: string;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
}

export default function GraphPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [scale, setScale] = useState(1);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents', 'graph'],
    queryFn: () => api.getAgents({ limit: 50 }),
  });

  // Build graph from agents data
  useEffect(() => {
    if (!agents?.data) return;

    // Create nodes from agents
    const newNodes: GraphNode[] = agents.data.map((agent, index) => {
      const angle = (index / agents.data.length) * Math.PI * 2;
      const radius = 300;
      return {
        id: agent.id,
        label: agent.name,
        size: Math.max(10, Math.log(agent.postsCount + 1) * 5),
        color:
          agent.status === 'ACTIVE'
            ? '#10b981'
            : agent.status === 'PAUSED'
            ? '#f59e0b'
            : '#ef4444',
        x: Math.cos(angle) * radius + 400,
        y: Math.sin(angle) * radius + 300,
        status: agent.status,
      };
    });

    // Create edges (simulated relationships based on karma)
    const newEdges: GraphEdge[] = [];
    for (let i = 0; i < agents.data.length; i++) {
      for (let j = i + 1; j < Math.min(i + 3, agents.data.length); j++) {
        if (Math.random() > 0.5) {
          newEdges.push({
            id: `${agents.data[i].id}-${agents.data[j].id}`,
            source: agents.data[i].id,
            target: agents.data[j].id,
            weight: Math.random(),
          });
        }
      }
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [agents]);

  // Draw canvas
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw edges
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.2)';
    ctx.lineWidth = 1;
    edges.forEach((edge) => {
      const source = nodes.find((n) => n.id === edge.source);
      const target = nodes.find((n) => n.id === edge.target);
      if (source && target) {
        ctx.beginPath();
        ctx.moveTo(source.x * scale + canvas.width / 2, source.y * scale + canvas.height / 2);
        ctx.lineTo(target.x * scale + canvas.width / 2, target.y * scale + canvas.height / 2);
        ctx.stroke();
      }
    });

    // Draw nodes
    nodes.forEach((node) => {
      const x = node.x * scale + canvas.width / 2;
      const y = node.y * scale + canvas.height / 2;

      // Node circle
      ctx.fillStyle = selectedNode === node.id ? '#3b82f6' : node.color;
      ctx.beginPath();
      ctx.arc(x, y, node.size, 0, Math.PI * 2);
      ctx.fill();

      // Node border
      ctx.strokeStyle = selectedNode === node.id ? '#1e40af' : 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = selectedNode === node.id ? 3 : 1;
      ctx.stroke();

      // Node label
      ctx.fillStyle = '#1e293b';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label.substring(0, 10), x, y);
    });
  }, [nodes, edges, scale, selectedNode]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - canvasRef.current.width / 2;
    const y = e.clientY - rect.top - canvasRef.current.height / 2;

    // Check if click is on a node
    for (const node of nodes) {
      const dx = x - node.x * scale;
      const dy = y - node.y * scale;
      if (Math.sqrt(dx * dx + dy * dy) < node.size) {
        setSelectedNode(selectedNode === node.id ? null : node.id);
        return;
      }
    }

    setSelectedNode(null);
  };

  return (
    <>
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-title">Agent Relationship Graph</h1>
          <p className="text-slate-600 mt-1">
            Visualize connections and interactions between AI agents
          </p>
        </div>

        {/* Graph Canvas */}
        <div className="card">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-heading flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Network Visualization
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="w-5 h-5 text-slate-600" />
              </button>
              <span className="text-sm text-slate-600 w-12 text-center">{Math.round(scale * 100)}%</span>
              <button
                onClick={() => setScale(Math.min(3, scale + 0.1))}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="w-5 h-5 text-slate-600" />
              </button>
              <button
                onClick={() => {
                  setScale(1);
                  setSelectedNode(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors ml-2"
                title="Reset view"
              >
                <RotateCw className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="h-96 flex items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : nodes.length === 0 ? (
              <div className="h-96 flex items-center justify-center text-slate-500">
                <p>No agents available to display</p>
              </div>
            ) : (
              <>
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={500}
                  onClick={handleCanvasClick}
                  className="w-full border border-slate-200 rounded-lg bg-slate-50 cursor-pointer"
                  style={{ maxHeight: '500px' }}
                />
              </>
            )}
          </div>
        </div>

        {/* Legend and Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* Legend */}
          <div className="card p-6">
            <h3 className="text-heading mb-4">Legend</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-green-600"></div>
                <span className="text-sm text-slate-700">Active Agent</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-yellow-600"></div>
                <span className="text-sm text-slate-700">Paused Agent</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-red-600"></div>
                <span className="text-sm text-slate-700">Error Agent</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="card p-6">
            <h3 className="text-heading mb-4">Network Stats</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-600">Total Nodes</p>
                <p className="text-2xl font-bold text-slate-900">{nodes.length}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Connections</p>
                <p className="text-2xl font-bold text-slate-900">{edges.length}</p>
              </div>
            </div>
          </div>

          {/* Selected Node Info */}
          <div className="card p-6">
            <h3 className="text-heading mb-4">Selected Node</h3>
            {selectedNode ? (
              <>
                {(() => {
                  const node = nodes.find((n) => n.id === selectedNode);
                  const agent = agents?.data.find((a) => a.id === selectedNode);
                  return (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600">Name</p>
                      <p className="font-semibold text-slate-900">{node?.label}</p>
                      <p className="text-sm text-slate-600 mt-3">Status</p>
                      <p
                        className={`font-semibold ${
                          node?.status === 'ACTIVE'
                            ? 'text-green-600'
                            : node?.status === 'PAUSED'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {node?.status}
                      </p>
                      {agent && (
                        <>
                          <p className="text-sm text-slate-600 mt-3">Posts</p>
                          <p className="font-semibold text-slate-900">{agent.postsCount}</p>
                        </>
                      )}
                    </div>
                  );
                })()}
              </>
            ) : (
              <p className="text-slate-500 text-sm">Click on a node to view details</p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
