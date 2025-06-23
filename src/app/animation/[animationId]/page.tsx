
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
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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

    // Fetch initial data
    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }

        getAnimationDetails(animationId).then(data => {
            if (data && data.collaborators.includes(user.uid)) {
                // If there are no frames, create an initial blank frame
                if (data.frames.length === 0) {
                    const canvas = document.createElement('canvas');
                    canvas.width = data.width;
                    canvas.height = data.height;
                    const blankFrame = canvas.toDataURL();
                    data.frames = [blankFrame];
                }
                setAnimation(data);
            } else if (data) {
                // Not the owner/collaborator
                toast({ title: "Unauthorized", description: "You do not have access to this animation.", variant: "destructive" });
                router.push('/animation');
            } else {
                notFound();
            }
            setIsLoading(false);
        });
    }, [animationId, user, authLoading, router, toast]);

    // Setup canvas context
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
    }, [animation]);

    // Function to draw a frame onto the canvas
    const drawFrame = useCallback((frameIndex: number) => {
        if (!animation || !contextRef.current || !canvasRef.current || !animation.frames[frameIndex]) return;
        const frameDataUrl = animation.frames[frameIndex];

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
        }
    }, [animation]);
    
    // Effect to redraw canvas when frame changes
    useEffect(() => {
        drawFrame(currentFrameIndex);
    }, [currentFrameIndex, animation, drawFrame]);

    // Autosave logic
    const handleSave = useCallback(async (data: AnimationProject) => {
        if (!data || !user) return;
        // Also update thumbnail with the current frame
        const thumbnail = data.frames[currentFrameIndex] || null;
        await updateAnimationData(data.id, { frames: data.frames, fps: data.fps, thumbnail });
    }, [user, currentFrameIndex]);
    
    const { isSaving, forceSave } = useAutosave(animation, handleSave, 10000); // Autosave every 10 seconds

    const handleManualSave = async () => {
        if (!animation) return;
        await forceSave();
        toast({ title: "Project Saved", description: "Your changes have been saved." });
    };

    // Drawing handlers
    const startDrawing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
        const { offsetX, offsetY } = nativeEvent;
        if (contextRef.current) {
            contextRef.current.beginPath();
            contextRef.current.moveTo(offsetX, offsetY);
            isDrawingRef.current = true;
        }
    };

    const finishDrawing = () => {
        if (contextRef.current) {
            contextRef.current.closePath();
            isDrawingRef.current = false;
            // Update the frame data in state
            const canvas = canvasRef.current;
            if (canvas && animation) {
                const newFrames = [...animation.frames];
                newFrames[currentFrameIndex] = canvas.toDataURL();
                setAnimation({ ...animation, frames: newFrames });
            }
        }
    };

    const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawingRef.current || !contextRef.current) return;
        const { offsetX, offsetY } = nativeEvent;
        contextRef.current.globalCompositeOperation = selectedTool === 'eraser' ? 'destination-out' : 'source-over';
        if (selectedTool === 'brush') {
            contextRef.current.strokeStyle = brushColor;
        }
        contextRef.current.lineWidth = brushSize;
        contextRef.current.lineTo(offsetX, offsetY);
        contextRef.current.stroke();
    };

    // Timeline actions
    const addFrame = () => {
        if (!animation) return;
        const canvas = document.createElement('canvas');
        canvas.width = animation.width;
        canvas.height = animation.height;
        const blankFrame = canvas.toDataURL();
        const newFrames = [...animation.frames];
        newFrames.splice(currentFrameIndex + 1, 0, blankFrame);
        setAnimation({ ...animation, frames: newFrames });
        setCurrentFrameIndex(currentFrameIndex + 1);
    };

    const duplicateFrame = (index: number) => {
        if (!animation) return;
        const frameToCopy = animation.frames[index];
        const newFrames = [...animation.frames];
        newFrames.splice(index + 1, 0, frameToCopy);
        setAnimation({ ...animation, frames: newFrames });
        setCurrentFrameIndex(index + 1);
    };

    const deleteFrame = (index: number) => {
        if (!animation || animation.frames.length <= 1) {
            toast({ title: "Cannot Delete", description: "You must have at least one frame.", variant: "destructive" });
            return;
        }
        const newFrames = animation.frames.filter((_, i) => i !== index);
        setAnimation({ ...animation, frames: newFrames });
        setCurrentFrameIndex(Math.max(0, Math.min(index, newFrames.length - 1)));
    };

    // Playback logic
    useEffect(() => {
        let animationFrameId: number;
        if (isPlaying && animation && animation.frames.length > 0) {
            const fpsInterval = 1000 / animation.fps;
            let then = Date.now();
            
            const animate = () => {
                animationFrameId = requestAnimationFrame(animate);
                const now = Date.now();
                const elapsed = now - then;

                if (elapsed > fpsInterval) {
                    then = now - (elapsed % fpsInterval);
                    playbackFrameRef.current = (playbackFrameRef.current + 1) % animation.frames.length;
                    drawFrame(playbackFrameRef.current);
                }
            };
            animate();
        } else {
            drawFrame(currentFrameIndex);
        }
        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [isPlaying, animation, drawFrame, currentFrameIndex]);

    const togglePlay = () => {
        if (isPlaying) {
            setIsPlaying(false);
            drawFrame(currentFrameIndex); // Sync back to the editor's current frame
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


    if (isLoading || authLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    if (!animation) return null;

    return (
        <TooltipProvider>
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
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant={selectedTool === 'brush' ? 'default' : 'outline'} onClick={() => setSelectedTool('brush')} size="icon"><Brush /></Button>
                            </TooltipTrigger>
                            <TooltipContent>Brush</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant={selectedTool === 'eraser' ? 'default' : 'outline'} onClick={() => setSelectedTool('eraser')} size="icon"><Eraser /></Button>
                            </TooltipTrigger>
                            <TooltipContent>Eraser</TooltipContent>
                        </Tooltip>
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
                        width={animation.width}
                        height={animation.height}
                        onMouseDown={startDrawing}
                        onMouseUp={finishDrawing}
                        onMouseLeave={finishDrawing}
                        onMouseMove={draw}
                        className="bg-white shadow-lg cursor-crosshair max-w-full max-h-full"
                    />
                </div>
            </div>

            <Card className="flex-shrink-0">
                <CardContent className="p-2 md:p-4">
                    <div className="flex items-center gap-2 md:gap-4">
                         <div className="flex items-center gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={togglePlay}>{isPlaying ? <Pause /> : <Play />}</Button></TooltipTrigger>
                                <TooltipContent>{isPlaying ? "Pause" : "Play"} Animation</TooltipContent>
                            </Tooltip>
                        </div>
                        <div className="flex-grow flex items-center gap-2 overflow-x-auto p-2 bg-muted rounded-lg border">
                            {animation.frames.map((frame, index) => (
                                <div
                                    key={index}
                                    onClick={() => setCurrentFrameIndex(index)}
                                    className={cn(
                                        "relative group flex-shrink-0 p-1 rounded-md border-2 cursor-pointer bg-white hover:border-primary/50",
                                        currentFrameIndex === index ? "border-primary" : "border-transparent"
                                    )}
                                >
                                    <img src={frame} alt={`Frame ${index + 1}`} width={80} height={45} className="w-20 h-[45px] object-contain pointer-events-none" data-ai-hint="animation frame" />
                                    <span className="absolute bottom-1 right-1 text-xs bg-black/60 text-white rounded-sm px-1 pointer-events-none">{index + 1}</span>
                                    <div className="absolute -top-1 -right-1 flex opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="default" size="icon" className="h-5 w-5 rounded-full" onClick={(e) => { e.stopPropagation(); duplicateFrame(index); }}><Copy className="h-3 w-3" /></Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Duplicate</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="destructive" size="icon" className="h-5 w-5 rounded-full ml-0.5" onClick={(e) => { e.stopPropagation(); deleteFrame(index); }}><Trash2 className="h-3 w-3" /></Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Delete</TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Tooltip>
                            <TooltipTrigger asChild><Button variant="outline" onClick={addFrame}><PlusSquare className="mr-2 h-4 w-4" /> Add</Button></TooltipTrigger>
                            <TooltipContent>Add a new blank frame</TooltipContent>
                        </Tooltip>
                    </div>
                </CardContent>
            </Card>
        </div>
        </TooltipProvider>
    );
}
