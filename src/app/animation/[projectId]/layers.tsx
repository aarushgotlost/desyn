
"use client";

import { useAnimation } from '@/context/AnimationContext';
import { Button } from '@/components/ui/button';
import { Layers as LayersIcon, PlusCircle, Trash2, Eye, EyeOff } from 'lucide-react'; 

export default function Layers() {
  const { layers, setLayers, activeFrameIndex, frames } = useAnimation(); 

  // Note: 'layers' from context now refers to the active frame's layers.
  // 'setLayers' will update the active frame's layers.

  const addLayer = () => {
    const newLayer = { 
      id: `layer-${activeFrameIndex}-${layers.length}-${Date.now()}`, 
      name: `Layer ${layers.length + 1}`, 
      visible: true, 
      data: [] 
    };
    setLayers(prevLayers => [...prevLayers, newLayer]);
  };

  const toggleVisibility = (layerIdToToggle: string) => {
    setLayers(prevLayers => 
      prevLayers.map(layer => 
        layer.id === layerIdToToggle ? { ...layer, visible: !layer.visible } : layer
      )
    );
  };
  
  const deleteLayer = (layerIdToDelete: string) => {
    if (layers.length <= 1) {
        alert("Cannot delete the last layer.");
        return;
    }
    setLayers(prevLayers => prevLayers.filter(layer => layer.id !== layerIdToDelete));
  };


  return (
    <div className="w-64 bg-card border-r p-3 flex flex-col space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center">
          <LayersIcon className="mr-2 h-4 w-4 text-primary" />
          Layers (Frame {activeFrameIndex + 1})
        </h3>
        <Button onClick={addLayer} size="sm" variant="outline" disabled={frames.length === 0}>
          <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {frames.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No active frame to show layers for.</p>
        ) : layers.length === 0 && frames.length > 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No layers yet for this frame. Click "Add" to create one.</p>
        ) : (
          layers.map((layer) => ( // Iterate over layers from context (active frame's layers)
            <div 
              key={layer.id} 
              className="group flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors"
            >
              <span className="text-xs truncate flex-1">{layer.name}</span>
              <div className="flex items-center space-x-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleVisibility(layer.id)} title={layer.visible ? "Hide layer" : "Show layer"}>
                  {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                </Button>
                {layers.length > 1 && (
                   <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteLayer(layer.id)} title="Delete layer">
                      <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

