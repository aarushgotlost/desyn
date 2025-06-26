
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
import { Loader2, ArrowLeft, Paintbrush, Eraser, Play, Pause, PlusSquare, Trash2, Copy, Save, Palette, PenTool, Feather, Minus, Pencil as PencilIcon, SprayCan, Highlighter, Baseline, Edit3, Paintbrush2, Brush, Video } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from '@/hooks/use-toast';
import { useAutosave } from '@/hooks/useAutosave';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

type Tool = 'brush' | 'eraser';
type BrushTexture = 'solid' | 'pencil' | 'sketchy' | 'spray' | 'ink' | 'charcoal' | 'marker' | 'calligraphy' | 'watercolor' | 'oil';

const brushTextures = [
  { name: 'solid' as BrushTexture, icon: Minus, label: 'Solid' },
  { name: 'pencil' as BrushTexture, icon: PencilIcon, label: 'Pencil' },
  { name: 'sketchy' as BrushTexture, icon: Edit3, label: 'Sketchy' },
  { name: 'spray' as BrushTexture, icon: SprayCan, label: 'Spray' },
  { name: 'ink' as BrushTexture, icon: PenTool, label: 'Ink' },
  { name: 'charcoal' as BrushTexture, icon: Feather, label: 'Charcoal' },
  { name: 'marker' as BrushTexture, icon: Highlighter, label: 'Marker' },
  { name: 'calligraphy' as BrushTexture, icon: Baseline, label: 'Calligraphy' },
  { name: 'watercolor' as BrushTexture, icon: Paintbrush2, label: 'Watercolor' },
  { name: 'oil' as BrushTexture, icon: Brush, label: 'Oil Paint' },
];

export default function AnimationEditor({ animationId }: { animationId: string }) {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [animation, setAnimation] = useState<AnimationProject | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Editor state
    const [selectedTool, setSelectedTool] = useState<Tool>('brush');
    const [brushTexture, setBrushTexture] = useState<BrushTexture>('solid');
    const [brushColor, setBrushColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(5);
    const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [texturePopoverOpen, setTexturePopoverOpen] = useState(false);
    
    // Refs for canvases and drawing
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const isDrawingRef = useRef(false);
    const playbackFrameRef = useRef<number>(0);
    const lastPointRef = useRef<{ x: number, y: number } | null>(null);
    const ffmpegRef = useRef(new FFmpeg());
    
    // Ref to hold the latest animation data to prevent state dependency loops
    const animationRef = useRef<AnimationProject | null>(null);
    useEffect(() => {
        animationRef.current = animation;
    }, [animation]);

    const drawFrameOnCanvas = useCallback((frameIndex: number) => {
        const anim = animationRef.current;
        const canvas = canvasRef.current;

        if (!canvas || !anim) return;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return;
        
        context.clearRect(0, 0, canvas.width, canvas.height);

        const frameDataUrl = anim.frames[frameIndex];
        if (!frameDataUrl) {
            return;
        }

        const image = new Image();
        image.src = frameDataUrl;
        image.onload = () => {
            const currentContext = canvas.getContext('2d');
            if (currentContext) {
                 currentContext.drawImage(image, 0, 0);
            }
        };
        image.onerror = () => {
             console.error("Failed to load frame image for drawing.");
        };
    }, []);

    // --- EFFECT HOOKS ---

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

    // 2. Effect for setting up canvas and context
    useEffect(() => {
        const canvas = canvasRef.current;
        if (animation && canvas) {
            canvas.width = animation.width;
            canvas.height = animation.height;

            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (context) {
                contextRef.current = context;
                drawFrameOnCanvas(currentFrameIndex);
            }
        }
    }, [animation, drawFrameOnCanvas, currentFrameIndex]);

    // 3. Effect for re-drawing frame on canvas
    useEffect(() => {
        if (contextRef.current && animation) {
            drawFrameOnCanvas(currentFrameIndex);
        }
    }, [currentFrameIndex, drawFrameOnCanvas, animation]);


    // --- STATE COMMIT AND SAVE LOGIC ---

    const commitCurrentCanvasToState = useCallback(() => {
        const canvas = canvasRef.current;
        const anim = animationRef.current;
        if (!canvas || !anim) return;

        const currentCanvasImage = canvas.toDataURL();
        if (anim.frames[currentFrameIndex] !== currentCanvasImage) {
            const newFrames = [...anim.frames];
            newFrames[currentFrameIndex] = currentCanvasImage;
            setAnimation(prev => prev ? { ...prev, frames: newFrames } : null);
        }
    }, [currentFrameIndex]);

    const handleSave = useCallback(async (dataToSave: AnimationProject) => {
        if (!dataToSave || !user) return;
        
        const thumbnail = dataToSave.frames[0] || null;
        await updateAnimationData(dataToSave.id, { 
            frames: dataToSave.frames, 
            fps: dataToSave.fps, 
            thumbnail 
        });
    }, [user]);
    
    const { isSaving, forceSave } = useAutosave(animation, handleSave, 10000);

    const handleManualSave = async () => {
        commitCurrentCanvasToState();
        await forceSave();
        toast({ title: "Project Saved", description: "Your changes have been saved." });
    };
    
    // --- DRAWING HANDLERS ---

    const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const context = contextRef.current;
        if (!context || isPlaying) return;

        isDrawingRef.current = true;
        const rect = e.currentTarget.getBoundingClientRect();
        const scaleX = e.currentTarget.width / rect.width;
        const scaleY = e.currentTarget.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        lastPointRef.current = { x, y };
        
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.globalCompositeOperation = selectedTool === 'eraser' ? 'destination-out' : 'source-over';
    }, [selectedTool, isPlaying]);

    const finishDrawing = useCallback(() => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        lastPointRef.current = null;
        commitCurrentCanvasToState();
    }, [commitCurrentCanvasToState]);

    const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawingRef.current || !contextRef.current || !lastPointRef.current) return;
        
        const context = contextRef.current;
        const rect = e.currentTarget.getBoundingClientRect();
        const scaleX = e.currentTarget.width / rect.width;
        const scaleY = e.currentTarget.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        const currentDrawMode = selectedTool === 'eraser' ? 'solid' : brushTexture;

        context.globalAlpha = 1.0;
        context.lineCap = 'round';
        context.lineJoin = 'round';

        switch(currentDrawMode) {
            case 'spray':
                context.fillStyle = brushColor;
                const sprayDensity = Math.round(brushSize) + 20;
                for (let i = 0; i < sprayDensity; i++) {
                    const sprayRadius = brushSize * 0.75;
                    const offsetX = (Math.random() - 0.5) * sprayRadius * 2;
                    const offsetY = (Math.random() - 0.5) * sprayRadius * 2;
                    if (Math.sqrt(offsetX * offsetX + offsetY * offsetY) < sprayRadius) {
                         context.fillRect(x + offsetX, y + offsetY, 1, 1);
                    }
                }
                break;
            case 'pencil':
                context.beginPath();
                context.moveTo(lastPointRef.current.x, lastPointRef.current.y);
                context.lineTo(x, y);
                context.strokeStyle = brushColor;
                context.lineWidth = brushSize * (Math.random() * 0.3 + 0.8);
                context.globalAlpha = Math.random() * 0.3 + 0.7;
                context.stroke();
                break;
            case 'sketchy':
                context.lineCap = 'round';
                context.lineJoin = 'round';
                context.strokeStyle = brushColor;
                context.globalAlpha = 0.3; // low alpha for buildup
                const sketchyLines = 3;
                for (let i = 0; i < sketchyLines; i++) {
                    context.beginPath();
                    const offsetX1 = (Math.random() - 0.5) * brushSize * 0.5;
                    const offsetY1 = (Math.random() - 0.5) * brushSize * 0.5;
                    if (lastPointRef.current) {
                        context.moveTo(lastPointRef.current.x + offsetX1, lastPointRef.current.y + offsetY1);
                    }

                    const offsetX2 = (Math.random() - 0.5) * brushSize * 0.5;
                    const offsetY2 = (Math.random() - 0.5) * brushSize * 0.5;
                    context.lineTo(x + offsetX2, y + offsetY2);
                    
                    context.lineWidth = brushSize * (Math.random() * 0.5 + 0.5);
                    context.stroke();
                }
                context.globalAlpha = 1.0; // reset alpha
                break;
            case 'ink':
                context.beginPath();
                context.moveTo(lastPointRef.current.x, lastPointRef.current.y);
                context.lineTo(x, y);
                context.strokeStyle = brushColor;
                context.lineWidth = brushSize * (Math.random() * 0.1 + 0.95);
                context.stroke();
                break;
            case 'charcoal':
                context.lineCap = 'butt';
                context.lineJoin = 'miter';
                context.strokeStyle = brushColor;
                context.globalAlpha = 0.08;
                const charcoalDensity = brushSize * 1.5;
                for (let i = 0; i < charcoalDensity; i++) {
                    context.beginPath();
                    const moveOffsetX = (Math.random() - 0.5) * brushSize * 1.2;
                    const moveOffsetY = (Math.random() - 0.5) * brushSize * 1.2;
                    context.moveTo(lastPointRef.current.x + moveOffsetX, lastPointRef.current.y + moveOffsetY);

                    const lineOffsetX = (Math.random() - 0.5) * brushSize * 1.2;
                    const lineOffsetY = (Math.random() - 0.5) * brushSize * 1.2;
                    context.lineTo(x + lineOffsetX, y + lineOffsetY);
                    
                    context.lineWidth = Math.random() * (brushSize * 0.8);
                    context.stroke();
                }
                break;
            case 'marker':
                context.globalAlpha = 0.6; // Semi-transparent
                context.beginPath();
                context.moveTo(lastPointRef.current.x, lastPointRef.current.y);
                context.lineTo(x, y);
                context.strokeStyle = brushColor;
                context.lineWidth = brushSize;
                context.stroke();
                context.globalAlpha = 1.0; // Reset alpha
                break;
            case 'calligraphy':
                const dx = x - lastPointRef.current.x;
                const dy = y - lastPointRef.current.y;
                const angle = Math.atan2(dy, dx);
                // Vary width based on angle to simulate a broad-nib pen
                const width = Math.abs(Math.sin(angle * 2)) * brushSize + (brushSize * 0.2); 

                context.beginPath();
                context.moveTo(lastPointRef.current.x, lastPointRef.current.y);
                context.lineTo(x, y);
                context.strokeStyle = brushColor;
                context.lineWidth = width;
                context.stroke();
                break;
            case 'watercolor':
                context.globalAlpha = 0.15; // Low alpha for blending
                context.beginPath();
                context.moveTo(lastPointRef.current.x, lastPointRef.current.y);
                context.lineTo(x, y);
                context.strokeStyle = brushColor;
                context.lineWidth = brushSize;
                context.stroke();
                context.globalAlpha = 1.0; // Reset alpha
                break;
            case 'oil':
                context.lineCap = 'round';
                context.lineJoin = 'round';
                const oilSegments = 5;
                for (let i = 0; i < oilSegments; i++) {
                    context.beginPath();
                    const moveOffsetX = (Math.random() - 0.5) * brushSize * 0.4;
                    const moveOffsetY = (Math.random() - 0.5) * brushSize * 0.4;
                    context.moveTo(lastPointRef.current.x + moveOffsetX, lastPointRef.current.y + moveOffsetY);

                    const lineOffsetX = (Math.random() - 0.5) * brushSize * 0.4;
                    const lineOffsetY = (Math.random() - 0.5) * brushSize * 0.4;
                    context.lineTo(x + lineOffsetX, y + lineOffsetY);
                    
                    context.strokeStyle = brushColor;
                    context.lineWidth = brushSize * (Math.random() * 0.6 + 0.4);
                    context.globalAlpha = Math.random() * 0.5 + 0.5; // vary alpha for texture
                    context.stroke();
                }
                context.globalAlpha = 1.0; // reset alpha
                break;
            case 'solid':
            default:
                context.beginPath();
                context.moveTo(lastPointRef.current.x, lastPointRef.current.y);
                context.lineTo(x, y);
                context.strokeStyle = brushColor;
                context.lineWidth = brushSize;
                context.stroke();
                break;
        }

        lastPointRef.current = { x, y };
    }, [brushColor, brushSize, selectedTool, brushTexture]);


    // --- FRAME MANIPULATION ---

    const addFrame = () => {
        if (isPlaying) return;
        commitCurrentCanvasToState();

        const anim = animationRef.current;
        if (!anim) return;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = anim.width;
        tempCanvas.height = anim.height;
        const blankFrame = tempCanvas.toDataURL();
        
        const newFrames = [...anim.frames];
        const newFrameIndex = currentFrameIndex + 1;
        newFrames.splice(newFrameIndex, 0, blankFrame);
        
        setAnimation({ ...anim, frames: newFrames });
        setCurrentFrameIndex(newFrameIndex);
    };

    const duplicateFrame = (index: number) => {
        if (isPlaying) return;
        commitCurrentCanvasToState();

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
        setCurrentFrameIndex(prev => Math.max(0, Math.min(prev, newFrames.length - 1)));
    };

    const handleSelectFrame = (index: number) => {
        if (isPlaying || index === currentFrameIndex) return;
        commitCurrentCanvasToState();
        setCurrentFrameIndex(index);
    }

    // --- PLAYBACK ---

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
            drawFrameOnCanvas(currentFrameIndex); 
        } else {
            commitCurrentCanvasToState();
            playbackFrameRef.current = currentFrameIndex;
            setIsPlaying(true);
        }
    };
    
    const handleFpsChange = (value: number[]) => {
        if (animation) {
            setAnimation({ ...animation, fps: value[0] });
        }
    };

    const handleExport = async () => {
        if (!animation || isExporting) return;

        toast({ title: "Starting Export...", description: "This may take a moment. Please stay on the page." });
        setIsExporting(true);

        try {
            const ffmpeg = ffmpegRef.current;
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

            // Load the single-threaded version of FFmpeg core
            if (!ffmpeg.loaded) {
                await ffmpeg.load({
                    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
                });
            }
            
            // Write each frame to the virtual file system
            for (let i = 0; i < animation.frames.length; i++) {
                const frameDataUrl = animation.frames[i];
                const fileName = `frame-${String(i).padStart(4, '0')}.png`;
                await ffmpeg.writeFile(fileName, await fetchFile(frameDataUrl));
            }

            // Run the FFmpeg command
            await ffmpeg.exec([
                '-framerate', String(animation.fps),
                '-i', 'frame-%04d.png',
                '-c:v', 'libx264',
                '-pix_fmt', 'yuv420p',
                'output.mp4'
            ]);

            // Read the result and trigger download
            const data = await ffmpeg.readFile('output.mp4');
            const url = URL.createObjectURL(new Blob([data], { type: 'video/mp4' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${animation.name}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            toast({ title: "Export Successful!", description: "Your video has been downloaded." });

        } catch (error) {
            console.error("Export failed:", error);
            toast({ title: "Export Failed", description: "Could not export the video. Check console for details.", variant: "destructive" });
        } finally {
            setIsExporting(false);
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
    
    const currentBrushTexture = brushTextures.find((t) => t.name === brushTexture);

    return (
        <div className="flex flex-col h-full gap-2 md:gap-4 pb-48 md:pb-0">
            {/* Header */}
            <header className="flex items-center justify-between gap-4 flex-shrink-0 p-2 border-b">
                <Button variant="outline" size="sm" asChild>
                    <Link href="/animation">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Back</span>
                    </Link>
                </Button>
                <h1 className="text-lg sm:text-xl font-bold truncate text-center">{animation.name}</h1>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                        <span className="hidden sm:inline">{isSaving ? "Saving..." : "Changes saved"}</span>
                    </div>
                    <Button onClick={handleManualSave} disabled={isSaving} size="sm">
                        <Save className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Save</span>
                    </Button>
                     <Button onClick={handleExport} disabled={isExporting} size="sm">
                        {isExporting ? <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" /> : <Video className="h-4 w-4 sm:mr-2" />}
                        <span className="hidden sm:inline">{isExporting ? "Exporting..." : "Export Video"}</span>
                    </Button>
                </div>
            </header>

            <div className="flex-grow flex flex-col md:flex-row gap-2 md:gap-4 min-h-0">
                {/* Desktop Sidebar */}
                <Card className="w-full md:w-64 flex-shrink-0 hidden md:flex flex-col p-4">
                     <h2 className="text-lg font-semibold border-b pb-2 mb-4">Tools</h2>
                     <div className="flex flex-col gap-4 h-full">
                        <div className="grid grid-cols-2 gap-2">
                            <Button title="Paintbrush" variant={selectedTool === 'brush' ? 'secondary' : 'outline'} onClick={() => setSelectedTool('brush')} size="icon"><Paintbrush /></Button>
                            <Button title="Eraser" variant={selectedTool === 'eraser' ? 'secondary' : 'outline'} onClick={() => setSelectedTool('eraser')} size="icon"><Eraser /></Button>
                        </div>

                        {selectedTool === 'brush' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Color</Label>
                                    <Input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="p-1 h-10 w-full" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Texture</Label>
                                    <Popover open={texturePopoverOpen} onOpenChange={setTexturePopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start capitalize">
                                                {currentBrushTexture ? <currentBrushTexture.icon className="h-4 w-4 mr-2" /> : <Palette className="h-4 w-4 mr-2" />}
                                                <span>{currentBrushTexture ? currentBrushTexture.label : 'Select Texture'}</span>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-56 p-0">
                                            <div className="grid grid-cols-2 gap-1 p-1">
                                                {brushTextures.map((texture) => (
                                                    <Button
                                                        key={texture.name}
                                                        title={texture.label}
                                                        variant={brushTexture === texture.name ? 'secondary' : 'ghost'}
                                                        onClick={() => { setBrushTexture(texture.name); setTexturePopoverOpen(false); }}
                                                        className="flex items-center justify-start gap-2 capitalize"
                                                        size="sm"
                                                    >
                                                        <texture.icon className="h-4 w-4" />
                                                        <span>{texture.label}</span>
                                                    </Button>
                                                ))}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Size: {brushSize}</Label>
                            <Slider value={[brushSize]} onValueChange={(value) => setBrushSize(value[0])} min={1} max={50} step={1} />
                        </div>
                        <div className="space-y-2">
                            <Label>FPS: {animation.fps}</Label>
                            <Slider value={[animation.fps]} onValueChange={handleFpsChange} min={1} max={60} step={1} />
                        </div>
                    </div>
                </Card>

                {/* Main Content Area */}
                <div className="flex-grow flex flex-col gap-2 min-h-0">
                    <div className="flex-grow grid place-items-center bg-muted rounded-lg border p-2 relative overflow-auto">
                        <canvas
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseUp={finishDrawing}
                            onMouseLeave={finishDrawing}
                            onMouseMove={draw}
                            className="bg-white shadow-lg cursor-crosshair"
                            style={{ 
                                aspectRatio: `${animation.width}/${animation.height}`,
                                maxHeight: '100%',
                                maxWidth: '100%'
                            }}
                        />
                    </div>
                    {/* Frame Timeline */}
                    <Card className="flex-shrink-0">
                        <CardContent className="p-2 md:p-3">
                            <div className="flex items-center gap-2">
                                <div className="hidden md:flex items-center">
                                    <Button variant="outline" size="icon" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <Pause /> : <Play />}</Button>
                                </div>
                                <div className="flex-grow flex items-center gap-2 overflow-x-auto p-2 bg-muted rounded-lg border">
                                    {animation.frames.map((frame, index) => (
                                        <div
                                            key={`${index}-${frame.slice(-10)}`}
                                            onClick={() => handleSelectFrame(index)}
                                            className={cn(
                                                "relative group flex-shrink-0 p-1 rounded-lg border-2 cursor-pointer bg-white hover:border-primary/50 transition-colors",
                                                currentFrameIndex === index ? "border-primary shadow-md" : "border-transparent"
                                            )}
                                        >
                                            <img src={frame} alt={`Frame ${index + 1}`} width={80} height={45} className="w-20 h-[45px] object-contain pointer-events-none rounded-md" data-ai-hint="animation frame" />
                                            <span className="absolute bottom-1 right-1 text-xs bg-black/70 text-white rounded-sm px-1.5 py-0.5 pointer-events-none">{index + 1}</span>
                                            <div className="absolute -top-2 -right-2 flex md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                <Button variant="default" size="icon" className="h-6 w-6 rounded-full shadow-md" title="Duplicate" onClick={(e) => { e.stopPropagation(); duplicateFrame(index); }}><Copy className="h-3 w-3" /></Button>
                                                <Button variant="destructive" size="icon" className="h-6 w-6 rounded-full ml-1 shadow-md" title="Delete" onClick={(e) => { e.stopPropagation(); deleteFrame(index); }}><Trash2 className="h-3 w-3" /></Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="hidden md:flex">
                                    <Button variant="outline" onClick={addFrame} title="Add new blank frame">
                                        <PlusSquare className="h-4 w-4 md:mr-2" />
                                        <span className="hidden md:inline">Add</span>
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Mobile Bottom Toolbar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t z-20 p-2 space-y-3">
                {/* Sliders Row */}
                <div className="flex gap-4 px-2">
                    <div className="flex-1 space-y-1">
                        <Label htmlFor="mobile-brush-size" className="text-xs">Size: {brushSize}</Label>
                        <Slider id="mobile-brush-size" value={[brushSize]} onValueChange={(v) => setBrushSize(v[0])} min={1} max={50} step={1} />
                    </div>
                    <div className="flex-1 space-y-1">
                        <Label htmlFor="mobile-fps" className="text-xs">FPS: {animation.fps}</Label>
                        <Slider id="mobile-fps" value={[animation.fps]} onValueChange={handleFpsChange} min={1} max={60} step={1} />
                    </div>
                </div>
                 
                 {/* Buttons Row */}
                <div className="grid grid-cols-5 gap-1">
                    <Button title="Paintbrush" variant={selectedTool === 'brush' ? 'secondary' : 'ghost'} onClick={() => setSelectedTool('brush')} size="icon"><Paintbrush /></Button>
                    <Button title="Eraser" variant={selectedTool === 'eraser' ? 'secondary' : 'ghost'} onClick={() => setSelectedTool('eraser')} size="icon"><Eraser /></Button>
                    
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button title="Brush Properties" variant="ghost" size="icon" disabled={selectedTool === 'eraser'}>
                                <Palette />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto" side="top">
                             <div className="space-y-4 p-2">
                                <div className="space-y-2">
                                    <Label>Color</Label>
                                    <Input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="p-1 h-10 w-full" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Texture</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {brushTextures.map((texture) => (
                                            <Button
                                                key={texture.name}
                                                size="sm"
                                                className="h-8 capitalize flex-shrink-0"
                                                variant={brushTexture === texture.name ? 'secondary' : 'ghost'}
                                                onClick={() => setBrushTexture(texture.name)}
                                                title={texture.label}
                                            >
                                                <texture.icon className="h-4 w-4 mr-1.5" />
                                                {texture.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Button variant="ghost" size="icon" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <Pause /> : <Play />}</Button>
                    <Button variant="ghost" onClick={addFrame} size="icon" title="Add Frame"><PlusSquare /></Button>
                </div>
            </div>
        </div>
    );
}
