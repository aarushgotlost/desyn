
"use client";

import { useState, useEffect, useRef, useCallback, use } from 'react';
import { getAnimationDetails, updateAnimationData } from "@/actions/animationActions";
import type { AnimationProject } from "@/types/data";
import { useAuth } from '@/contexts/AuthContext';
import { notFound, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from '@/components/ui/card';
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Brush, Eraser, Play, Pause, PlusSquare, Trash2, Copy, Save } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAutosave } from '@/hooks/useAutosave';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type Tool = 'brush' | 'eraser';

export default function AnimationEditorPage({ params }: { params: { animationId: string } }) {
    const resolvedParams = use(params);
    const { animationId } = resolvedParams;
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [animation, setAnimation] = useState<AnimationProject | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Editor state
    const [selectedTool, setSelectedTool] = useState<Tool>('brush');
    const [brushColor, setBrushColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(5);
    const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    // Refs for canvases and drawing
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const isDrawingRef = useRef(false);
    const playbackFrameRef = useRef<number>(0);
    
    // Use a ref to hold the latest animation data to prevent dependency loops in drawing functions
    const animationRef = useRef<AnimationProject | null>(animation);
    useEffect(() => {
        animationRef.current = animation;
    }, [animation]);


    const drawFrameOnCanvas = useCallback((frameIndex: number) => {
        const anim = animationRef.current;
        if (!anim || !contextRef.current || !canvasRef.current || !anim.frames[frameIndex]) return;
        
        const frameDataUrl = anim.frames[frameIndex];
        const image = new Image();
        image.src = frameDataUrl;
        image.onload = () => {
            if (contextRef.current && canvasRef.current) {
                contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                contextRef.current.drawImage(image, 0, 0);
            }
        };
        image.onerror = () => {
             if (contextRef.current && canvasRef.current) {
                contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
             }
        };
    }, []); // This callback is stable because it uses refs and has no dependencies.

    // Fetch initial data and set canvas dimensions ONCE.
    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }

        getAnimationDetails(animationId).then(data => {
            if (data && data.collaborators.includes(user.uid)) {
                if (data.frames.length === 0) {
                    const canvas = document.createElement('canvas');
                    canvas.width = data.width;
                    canvas.height = data.height;
                    const blankFrame = canvas.toDataURL();
                    data.frames = [blankFrame];
                }

                const canvas = canvasRef.current;
                if (canvas) {
                    canvas.width = data.width;
                    canvas.height = data.height;
                }

                setAnimation(data);
                // Perform the initial draw right after setting the animation data
                drawFrameOnCanvas(0);
            } else if (data) {
                toast({ title: "Unauthorized", description: "You do not have access to this animation.", variant: "destructive" });
                router.push('/animation');
            } else {
                notFound();
            }
            setIsLoading(false);
        });
    }, [animationId, user, authLoading, router, toast, drawFrameOnCanvas]);

    // Setup canvas context - Runs once on mount
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (context) {
                context.lineCap = 'round';
                context.lineJoin = 'round';
                contextRef.current = context;
            }
        }
    }, []);

    // Effect to load a frame onto the canvas ONLY when the frame index changes.
    // This no longer depends on `animation`, breaking the re-render loop.
    useEffect(() => {
        if (animation) { // Guard to ensure data is loaded
          drawFrameOnCanvas(currentFrameIndex);
        }
    }, [currentFrameIndex, drawFrameOnCanvas, animation]); // Keep animation here to handle the very first load

    // Handle autosave
    const handleSave = useCallback(async (dataToSave: AnimationProject) => {
        if (!dataToSave || !user) return;
        
        // Before saving, capture the current state of the canvas
        const canvas = canvasRef.current;
        if (!canvas) return;

        const currentCanvasImage = canvas.toDataURL();
        const frames = [...dataToSave.frames];
        frames[currentFrameIndex] = currentCanvasImage;

        const thumbnail = frames[currentFrameIndex] || null;
        
        await updateAnimationData(dataToSave.id, { frames, fps: dataToSave.fps, thumbnail });
    }, [user, currentFrameIndex]);
    
    const { isSaving, forceSave } = useAutosave(animation, handleSave, 10000);

    const handleManualSave = async () => {
        if (!animation) return;
        await forceSave();
        toast({ title: "Project Saved", description: "Your changes have been saved." });
    };

    // Drawing functions
    const startDrawing = useCallback(({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
        if (!contextRef.current || isPlaying) return;
        const { offsetX, offsetY } = nativeEvent;

        isDrawingRef.current = true;
        contextRef.current.globalCompositeOperation = selectedTool === 'eraser' ? 'destination-out' : 'source-over';
        contextRef.current.strokeStyle = brushColor;
        contextRef.current.lineWidth = brushSize;
        contextRef.current.beginPath();
        contextRef.current.moveTo(offsetX, offsetY);
    }, [brushColor, brushSize, selectedTool, isPlaying]);

    const finishDrawing = useCallback(() => {
        if (!isDrawingRef.current || !contextRef.current) return;
        isDrawingRef.current = false;
        contextRef.current.closePath();
        
        // IMPORTANT: Instead of updating state here, we just leave the drawing on the canvas.
        // The autosave/manual save will pick up the changes from the canvas directly.
        // This stops the re-render loop.
    }, []);

    const draw = useCallback(({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawingRef.current || !contextRef.current) return;
        const { offsetX, offsetY } = nativeEvent;
        contextRef.current.lineTo(offsetX, offsetY);
        contextRef.current.stroke();
    }, []);

    // Frame management functions
    const addFrame = () => {
        if (isPlaying) return;
        const anim = animationRef.current;
        if (!anim) return;
        const canvas = document.createElement('canvas');
        canvas.width = anim.width;
        canvas.height = anim.height;
        const blankFrame = canvas.toDataURL();
        const newFrames = [...anim.frames];
        newFrames.splice(currentFrameIndex + 1, 0, blankFrame);
        setAnimation({ ...anim, frames: newFrames });
        setCurrentFrameIndex(currentFrameIndex + 1);
    };

    const duplicateFrame = (index: number) => {
        if (isPlaying) return;
        const anim = animationRef.current;
        if (!anim) return;
        const frameToCopy = anim.frames[index];
        const newFrames = [...anim.frames];
        newFrames.splice(index + 1, 0, frameToCopy);
        setAnimation({ ...anim, frames: newFrames });
        setCurrentFrameIndex(index + 1);
    };

    const deleteFrame = (index: number) => {
        if (isPlaying) return;
        const anim = animationRef.current;
        if (!anim || anim.frames.length <= 1) {
            toast({ title: "Cannot Delete", description: "You must have at least one frame.", variant: "destructive" });
            return;
        }
        const newFrames = anim.frames.filter((_, i) => i !== index);
        setAnimation({ ...anim, frames: newFrames });
        setCurrentFrameIndex(Math.max(0, Math.min(index, newFrames.length - 1)));
    };

    // Playback effect
    useEffect(() => {
        let animationFrameId: number;
        if (isPlaying) {
            const anim = animationRef.current;
            if (anim && anim.frames.length > 0) {
                const fpsInterval = 1000 / anim.fps;
                let then = Date.now();
                
                const animate = () => {
                    animationFrameId = requestAnimationFrame(animate);
                    const now = Date.now();
                    const elapsed = now - then;

                    if (elapsed > fpsInterval) {
                        then = now - (elapsed % fpsInterval);
                        playbackFrameRef.current = (playbackFrameRef.current + 1) % anim.frames.length;
                        drawFrameOnCanvas(playbackFrameRef.current);
                    }
                };
                animate();
            }
        }
        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [isPlaying, drawFrameOnCanvas]);

    const togglePlay = () => {
        if (isPlaying) {
            setIsPlaying(false);
            drawFrameOnCanvas(currentFrameIndex); // Revert to the selected frame
        } else {
            playbackFrameRef.current = currentFrameIndex;
            setIsPlaying(true);
        }
    };
    
    const handleFpsChange = (value: number[]) => {
        if (animation) {
            setAnimation({ ...animation, fps: value[0] });
        }
    };

    const handleSelectFrame = (index: number) => {
        if (isPlaying) return;
        
        // Before switching, save the current canvas state to the frames array in React state
        const canvas = canvasRef.current;
        const anim = animationRef.current;
        if(canvas && anim) {
            const currentCanvasImage = canvas.toDataURL();
            const newFrames = [...anim.frames];
            if (newFrames[currentFrameIndex] !== currentCanvasImage) {
                 newFrames[currentFrameIndex] = currentCanvasImage;
                 setAnimation({ ...anim, frames: newFrames });
            }
        }

        setCurrentFrameIndex(index);
    }


    if (isLoading || authLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    if (!animation) return null;

    return (
        <div className="flex flex-col h-full gap-4">
            <header className="flex flex-col sm:flex-row items-center justify-between gap-4 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/animation">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Link>
                    </Button>
                    <h1 className="text-xl font-bold truncate">{animation.name}</h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                        <span>{isSaving ? "Saving..." : "Changes saved"}</span>
                    </div>
                     <Button onClick={handleManualSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save All
                    </Button>
                </div>
            </header>

            <div className="flex-grow flex flex-col md:flex-row gap-4 min-h-0">
                <Card className="w-full md:w-64 flex-shrink-0 p-4 flex flex-col gap-6 overflow-y-auto h-auto md:h-full">
                    <h2 className="text-lg font-semibold border-b pb-2">Tools</h2>
                    <div className="grid grid-cols-2 gap-2">
                        <Button title="Brush" variant={selectedTool === 'brush' ? 'default' : 'outline'} onClick={() => setSelectedTool('brush')} size="icon"><Brush /></Button>
                        <Button title="Eraser" variant={selectedTool === 'eraser' ? 'default' : 'outline'} onClick={() => setSelectedTool('eraser')} size="icon"><Eraser /></Button>
                    </div>
                    <div className="space-y-2">
                        <Label>Color</Label>
                        <Input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="p-1" disabled={selectedTool === 'eraser'}/>
                    </div>
                    <div className="space-y-2">
                        <Label>Brush Size: {brushSize}</Label>
                        <Slider value={[brushSize]} onValueChange={(value) => setBrushSize(value[0])} min={1} max={50} step={1} />
                    </div>
                    <div className="space-y-2">
                        <Label>FPS: {animation.fps}</Label>
                        <Slider value={[animation.fps]} onValueChange={handleFpsChange} min={1} max={60} step={1} />
                    </div>
                </Card>

                <div className="flex-grow grid place-items-center bg-muted rounded-lg border p-2 relative min-h-[300px] md:min-h-0">
                    <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseUp={finishDrawing}
                        onMouseLeave={finishDrawing}
                        onMouseMove={draw}
                        className="block bg-white shadow-lg cursor-crosshair max-w-full max-h-full"
                    />
                </div>
            </div>

            <Card className="flex-shrink-0">
                <CardContent className="p-2 md:p-4">
                    <div className="flex items-center gap-2 md:gap-4">
                         <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <Pause /> : <Play />}</Button>
                        </div>
                        <div className="flex-grow flex items-center gap-2 overflow-x-auto p-2 bg-muted rounded-lg border">
                            {animation.frames.map((frame, index) => (
                                <div
                                    key={`${index}-${frame.slice(-10)}`} // Add part of dataURL to key to force re-render on change
                                    onClick={() => handleSelectFrame(index)}
                                    className={cn(
                                        "relative group flex-shrink-0 p-1 rounded-md border-2 cursor-pointer bg-white hover:border-primary/50",
                                        currentFrameIndex === index ? "border-primary" : "border-transparent"
                                    )}
                                >
                                    <img src={frame} alt={`Frame ${index + 1}`} width={80} height={45} className="w-20 h-[45px] object-contain pointer-events-none" data-ai-hint="animation frame" />
                                    <span className="absolute bottom-1 right-1 text-xs bg-black/60 text-white rounded-sm px-1 pointer-events-none">{index + 1}</span>
                                    <div className="absolute -top-1 -right-1 flex opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="default" size="icon" className="h-5 w-5 rounded-full" title="Duplicate" onClick={(e) => { e.stopPropagation(); duplicateFrame(index); }}><Copy className="h-3 w-3" /></Button>
                                        <Button variant="destructive" size="icon" className="h-5 w-5 rounded-full ml-0.5" title="Delete" onClick={(e) => { e.stopPropagation(); deleteFrame(index); }}><Trash2 className="h-3 w-3" /></Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button variant="outline" onClick={addFrame} title="Add new blank frame"><PlusSquare className="mr-2 h-4 w-4" /> Add</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

    