
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
    
    // Ref to hold the latest animation data to prevent state dependency loops
    const animationRef = useRef<AnimationProject | null>(null);
    useEffect(() => {
        animationRef.current = animation;
    }, [animation]);

    const drawFrameOnCanvas = useCallback((frameIndex: number) => {
        const anim = animationRef.current;
        const canvas = canvasRef.current;
        const context = contextRef.current;

        if (!context || !canvas) return;
        
        // Always clear canvas first
        context.clearRect(0, 0, canvas.width, canvas.height);

        const frameDataUrl = anim?.frames[frameIndex];
        if (!anim || !frameDataUrl) {
            return; // Leave canvas blank if no frame data
        }

        const image = new Image();
        image.src = frameDataUrl;
        image.onload = () => {
            // Check context still exists in case of rapid component unmount
            if (contextRef.current) {
                contextRef.current.drawImage(image, 0, 0);
            }
        };
        image.onerror = () => {
             console.error("Failed to load frame image for drawing.");
        };
    }, []);

    // --- EFFECT HOOKS RE-ARCHITECTED ---

    // 1. Effect for fetching initial data
    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }

        setIsLoading(true);
        getAnimationDetails(animationId).then(data => {
            if (data && data.collaborators.includes(user.uid)) {
                // If there are no frames, create an initial blank one.
                if (data.frames.length === 0) {
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = data.width;
                    tempCanvas.height = data.height;
                    const blankFrame = tempCanvas.toDataURL();
                    data.frames = [blankFrame];
                }
                setAnimation(data);
            } else if (data) {
                toast({ title: "Unauthorized", description: "You do not have access to this animation.", variant: "destructive" });
                router.push('/animation');
            } else {
                notFound();
            }
        }).finally(() => setIsLoading(false));
    }, [animationId, user, authLoading, router, toast]);

    // 2. Effect for setting up canvas, runs ONLY ONCE when animation data is first loaded.
    useEffect(() => {
        const canvas = canvasRef.current;
        // Only setup if we have animation data and the canvas ref exists.
        if (animation && canvas && !contextRef.current) {
            canvas.width = animation.width;
            canvas.height = animation.height;

            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (context) {
                context.lineCap = 'round';
                context.lineJoin = 'round';
                contextRef.current = context;

                // Draw the very first frame after setup is complete.
                drawFrameOnCanvas(0);
            }
        }
    }, [animation, drawFrameOnCanvas]);


    // 3. Effect for drawing a new frame, runs ONLY when the frame index changes.
    useEffect(() => {
        // Only draw if the canvas has been set up.
        if (contextRef.current) {
            drawFrameOnCanvas(currentFrameIndex);
        }
    }, [currentFrameIndex, drawFrameOnCanvas]);

    // --- END OF EFFECT HOOKS RE-ARCHITECTURE ---

    // Function to commit the current visual state of the canvas to the animation state
    const commitCurrentCanvasToState = useCallback(() => {
        const canvas = canvasRef.current;
        const anim = animationRef.current;
        if (!canvas || !anim) return;

        const currentCanvasImage = canvas.toDataURL();
        // Avoid unnecessary state updates if nothing changed
        if (anim.frames[currentFrameIndex] !== currentCanvasImage) {
            const newFrames = [...anim.frames];
            newFrames[currentFrameIndex] = currentCanvasImage;
            setAnimation(prev => prev ? { ...prev, frames: newFrames } : null);
        }
    }, [currentFrameIndex]);

    const handleSave = useCallback(async (dataToSave: AnimationProject) => {
        if (!dataToSave || !user) return;
        
        // Before saving, ensure the latest drawing is in the state object
        const canvas = canvasRef.current;
        if (!canvas) return;

        const currentCanvasImage = canvas.toDataURL();
        const frames = [...dataToSave.frames];
        frames[currentFrameIndex] = currentCanvasImage;

        const thumbnail = frames[0] || null;
        
        await updateAnimationData(dataToSave.id, { frames, fps: dataToSave.fps, thumbnail });
    }, [user, currentFrameIndex]);
    
    const { isSaving, forceSave } = useAutosave(animation, handleSave, 10000);

    const handleManualSave = async () => {
        await forceSave();
        toast({ title: "Project Saved", description: "Your changes have been saved." });
    };
    
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
    }, []);

    const draw = useCallback(({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawingRef.current || !contextRef.current) return;
        const { offsetX, offsetY } = nativeEvent;
        contextRef.current.lineTo(offsetX, offsetY);
        contextRef.current.stroke();
    }, []);

    const addFrame = () => {
        if (isPlaying) return;
        commitCurrentCanvasToState(); // Save current work before adding a new frame

        const anim = animationRef.current;
        if (!anim) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = anim.width;
        canvas.height = anim.height;
        const blankFrame = canvas.toDataURL();
        
        const newFrames = [...anim.frames];
        const newFrameIndex = currentFrameIndex + 1;
        newFrames.splice(newFrameIndex, 0, blankFrame);
        
        setAnimation({ ...anim, frames: newFrames });
        setCurrentFrameIndex(newFrameIndex);
    };

    const duplicateFrame = (index: number) => {
        if (isPlaying) return;
        commitCurrentCanvasToState(); // Save current work first

        const anim = animationRef.current;
        if (!anim) return;
        const frameToCopy = anim.frames[index];
        const newFrames = [...anim.frames];
        const newFrameIndex = index + 1;
        newFrames.splice(newFrameIndex, 0, frameToCopy);

        setAnimation({ ...anim, frames: newFrames });
        setCurrentFrameIndex(newFrameIndex);
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
        // Adjust currentFrameIndex safely
        setCurrentFrameIndex(prev => Math.max(0, Math.min(prev, newFrames.length - 1)));
    };

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
            // After stopping, revert canvas to the currently selected frame in the timeline
            drawFrameOnCanvas(currentFrameIndex); 
        } else {
            commitCurrentCanvasToState(); // Save any uncommitted drawing before playing
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
        if (isPlaying || index === currentFrameIndex) return;
        
        // Save any work on the current frame before switching
        commitCurrentCanvasToState();
        
        // Then, switch to the new frame. The useEffect will handle drawing it.
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
                                    key={`${index}-${frame.slice(-10)}`}
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

    