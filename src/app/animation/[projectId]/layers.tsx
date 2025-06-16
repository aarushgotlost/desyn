
"use client";

import { useAnimation } from '@/context/AnimationContext';
import { Button } from '@/components/ui/button';
import { Layers as LayersIcon, PlusCircle, Trash2, Eye, EyeOff } from 'lucide-react'; // Example icons

export default function Layers() {
  const { layers, setLayers } = useAnimation(); // Assuming layers state is part of context

  const addLayer = () => {
    const newLayer = { id: `layer-${layers.length}`, name: `Layer ${layers.length + 1}`, visible: true, data: [] }; // Basic layer structure
    setLayers([...layers, newLayer]);
  };

  const toggleVisibility = (index: number) => {
    const newLayers = layers.map((layer, i) => 
      i === index ? { ...layer, visible: !layer.visible } : layer
    );
    setLayers(newLayers);
  };
  
  const deleteLayer = (index: number) => {
    if (layers.length <= 1) {
        alert("Cannot delete the last layer."); // Or handle more gracefully
        return;
    }
    const newLayers = layers.filter((_, i) => i !== index);
    setLayers(newLayers);
  };


  return (
    <div className="w-64 bg-card border-r p-3 flex flex-col space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center">
          <LayersIcon className="mr-2 h-4 w-4 text-primary" />
          Layers
        </h3>
        <Button onClick={addLayer} size="sm" variant="outline">
          <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {layers.map((layer, index) => (
          <div 
            key={layer.id || index} 
            className="group flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors"
          >
            <span className="text-xs truncate flex-1">{layer.name || `Layer ${index + 1}`}</span>
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleVisibility(index)} title={layer.visible ? "Hide layer" : "Show layer"}>
                {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
              </Button>
              {layers.length > 1 && (
                 <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteLayer(index)} title="Delete layer">
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
        {layers.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No layers yet. Click "Add" to create one.</p>
        )}
      </div>
    </div>
  );
}
