import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
    CircleIcon,
    DownloadIcon,
    EraserIcon,
    MinusIcon,
    MousePointer2Icon,
    PencilIcon,
    RedoIcon,
    SquareIcon,
    Trash2Icon,
    UndoIcon,
    ImageIcon,
    HighlighterIcon, // New Icon
    MousePointerClickIcon,
    TypeIcon,
} from "lucide-react";

/**
 * Enhanced Whiteboard with Object Manipulation and Copy/Paste Support
 */

const ElementType = {
    Selection: "selection",
    Rectangle: "rectangle",
    Circle: "circle",
    Line: "line",
    Text: "text",
    Pencil: "pencil",
    Highlighter: "highlighter", // New Tool
    Eraser: "eraser",
    Image: "image",
};

const cursorForPosition = (position) => {
    switch (position) {
        case "tl":
        case "br":
        case "start":
        case "end":
            return "nwse-resize";
        case "tr":
        case "bl":
            return "nesw-resize";
        default:
            return "move";
    }
};

const resizedCoordinates = (clientX, clientY, position, coordinates) => {
    const { x1, y1, x2, y2 } = coordinates;
    switch (position) {
        case "tl":
        case "start":
            return { x1: clientX, y1: clientY, x2, y2 };
        case "tr":
            return { x1, y1: clientY, x2: clientX, y2 };
        case "bl":
            return { x1: clientX, y1, x2, y2: clientY };
        case "br":
        case "end":
            return { x1, y1, x2: clientX, y2: clientY };
        default:
            return null;
    }
};

const distance = (a, b) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

const nearPoint = (x, y, x1, y1, name) => {
    return Math.abs(x - x1) < 10 && Math.abs(y - y1) < 10 ? name : null;
};


const positionWithinElement = (x, y, element) => {
    const { type, x1, y1, x2, y2 } = element;
    if (type === ElementType.Rectangle) {
        const topLeft = nearPoint(x, y, x1, y1, "tl");
        const topRight = nearPoint(x, y, x2, y1, "tr");
        const bottomLeft = nearPoint(x, y, x1, y2, "bl");
        const bottomRight = nearPoint(x, y, x2, y2, "br");
        const inside =
            x >= Math.min(x1, x2) &&
                x <= Math.max(x1, x2) &&
                y >= Math.min(y1, y2) &&
                y <= Math.max(y1, y2)
                ? "inside"
                : null;
        return topLeft || topRight || bottomLeft || bottomRight || inside;
    } else if (type === ElementType.Circle) {
        // Simplified bounding box check for circle
        const topLeft = nearPoint(x, y, x1, y1, "tl");
        const topRight = nearPoint(x, y, x2, y1, "tr");
        const bottomLeft = nearPoint(x, y, x1, y2, "bl");
        const bottomRight = nearPoint(x, y, x2, y2, "br");
        const inside =
            x >= Math.min(x1, x2) &&
                x <= Math.max(x1, x2) &&
                y >= Math.min(y1, y2) &&
                y <= Math.max(y1, y2)
                ? "inside"
                : null;
        return topLeft || topRight || bottomLeft || bottomRight || inside;
    } else if (type === ElementType.Line) {
        const a = { x: x1, y: y1 };
        const b = { x: x2, y: y2 };
        const c = { x, y };
        const offset = distance(a, b) - (distance(a, c) + distance(b, c));
        const start = nearPoint(x, y, x1, y1, "start");
        const end = nearPoint(x, y, x2, y2, "end");
        const inside = Math.abs(offset) < 1 ? "inside" : null;
        return start || end || inside;
    } else if (type === ElementType.Pencil || type === ElementType.Eraser || type === ElementType.Highlighter) {
        const minX = Math.min(...element.points.map((p) => p.x));
        const maxX = Math.max(...element.points.map((p) => p.x));
        const minY = Math.min(...element.points.map((p) => p.y));
        const maxY = Math.max(...element.points.map((p) => p.y));
        return x >= minX && x <= maxX && y >= minY && y <= maxY ? "inside" : null;
    }
    return null;
};

const adjustElementCoordinates = (element) => {
    const { type, x1, y1, x2, y2 } = element;
    if (type === ElementType.Rectangle || type === ElementType.Circle || type === ElementType.Image) {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        return { x1: minX, y1: minY, x2: maxX, y2: maxY };
    } else {
        if (x1 < x2 || (x1 === x2 && y1 < y2)) {
            return { x1, y1, x2, y2 };
        } else {
            return { x1: x2, y1: y2, x2: x1, y2: y1 };
        }
    }
};

const getElementAtPosition = (x, y, elements) => {
    return [...elements]
        .map((element) => ({ ...element, position: positionWithinElement(x, y, element) }))
        .find((element) => element.position !== null);
};

// --- Main Component ---
const DrawingBoard = ({ channel, isHost = false }) => {
    const [elements, setElements] = useState([]);
    const [action, setAction] = useState("none"); // none, drawing, moving, resizing, writing, panning
    const [tool, setTool] = useState(ElementType.Pencil); // default to pen
    const [selectedElement, setSelectedElement] = useState(null);
    const [lineWidth, setLineWidth] = useState(2);
    const [color, setColor] = useState("#000000");
    const [highlighterColor, setHighlighterColor] = useState("#fde047"); // Default yellow
    const [history, setHistory] = useState([]);
    const [historyStep, setHistoryStep] = useState(-1);
    // Redesigned Text Input State: Screen coordinates + explicit open flag
    const [textInput, setTextInput] = useState({
        isOpen: false,
        x: 0, // clientX
        y: 0, // clientY
        text: "",
        color: "#000000"
    });
    const [camera, setCamera] = useState({ x: 0, y: 0, z: 1 });
    const [isSpacePressed, setIsSpacePressed] = useState(false);

    const canvasRef = useRef(null);
    const textAreaRef = useRef(null);
    const containerRef = useRef(null);

    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Coordinate conversion helpers
    const screenToWorld = (screenX, screenY) => {
        // Need bounding rect to get canvas relative coordinates first
        const rect = containerRef.current.getBoundingClientRect();
        const x = screenX - rect.left;
        const y = screenY - rect.top;
        return {
            x: (x - camera.x) / camera.z,
            y: (y - camera.y) / camera.z
        };
    };

    const worldToScreen = (worldX, worldY) => {
        return {
            x: (worldX * camera.z) + camera.x,
            y: (worldY * camera.z) + camera.y
        };
    };

    // Handle Resize
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                // Only update if dimensions stick changed to avoid loops
                setDimensions((prev) => {
                    if (prev.width !== width || prev.height !== height) {
                        return { width, height };
                    }
                    return prev;
                });
            }
        };

        updateDimensions();
        window.addEventListener("resize", updateDimensions);
        const observer = new ResizeObserver(updateDimensions);
        if (containerRef.current) observer.observe(containerRef.current);

        return () => {
            window.removeEventListener("resize", updateDimensions);
            observer.disconnect();
        };
    }, []);

    // Load images cache to avoid reloading on every render
    const imageCache = useRef(new Map());

    // --- Real-time Sync via Stream Channel ---
    // Use refs to track sync state without triggering re-renders
    const isRemoteActionRef = useRef(false);

    // Function to broadcast a single element action (add/update)
    const broadcastElement = (element, actionType = 'add') => {
        if (!channel || isRemoteActionRef.current) return;

        // Skip images - too large for 2KB limit
        if (element.type === ElementType.Image) return;

        // Limit pencil/eraser points to prevent exceeding 2KB
        // 2KB ~= 2000 chars, each point is roughly {x:123.45,y:678.90} = ~25 chars
        // So max ~80 points per message, but we need room for other fields
        let syncElement = element;
        const maxPoints = 60;

        if ((element.type === ElementType.Pencil || element.type === ElementType.Eraser || element.type === ElementType.Highlighter) && element.points?.length > maxPoints) {
            // Use Ramer-Douglas-Peucker-like simplification: keep every Nth point + important corners
            const points = element.points;
            const step = Math.ceil(points.length / maxPoints);
            const simplified = [];

            for (let i = 0; i < points.length; i++) {
                // Always keep first, last, and every Nth point
                if (i === 0 || i === points.length - 1 || i % step === 0) {
                    // Round coordinates to reduce JSON size
                    simplified.push({
                        x: Math.round(points[i].x * 10) / 10,
                        y: Math.round(points[i].y * 10) / 10
                    });
                }
            }

            syncElement = { ...element, points: simplified };
        } else if (element.points) {
            // Round coordinates for all points
            syncElement = {
                ...element,
                points: element.points.map(p => ({
                    x: Math.round(p.x * 10) / 10,
                    y: Math.round(p.y * 10) / 10
                }))
            };
        }

        channel.sendEvent({
            type: 'wb_element',
            action: actionType,
            element: syncElement,
        }).catch(err => console.error('Failed to sync element:', err));
    };

    // Broadcast clear action
    const broadcastClear = () => {
        if (!channel) return;
        channel.sendEvent({ type: 'wb_clear' }).catch(console.error);
    };

    // Listen for incoming whiteboard updates
    useEffect(() => {
        if (!channel) return;

        const handleEvent = (event) => {
            if (event.type === 'wb_element') {
                isRemoteActionRef.current = true;
                const { action, element } = event;

                if (action === 'add') {
                    setElements(prev => {
                        // Check if element already exists
                        const exists = prev.some(el => el.id === element.id);
                        if (exists) {
                            // Update existing element
                            return prev.map(el => el.id === element.id ? element : el);
                        }
                        return [...prev, element];
                    });
                } else if (action === 'update') {
                    setElements(prev => prev.map(el => el.id === element.id ? element : el));
                }

                setTimeout(() => { isRemoteActionRef.current = false; }, 100);
            } else if (event.type === 'wb_clear') {
                isRemoteActionRef.current = true;
                setElements([]);
                setHistory([]);
                setHistoryStep(-1);
                setTimeout(() => { isRemoteActionRef.current = false; }, 100);
            }
        };

        channel.on(handleEvent);

        return () => {
            channel.off(handleEvent);
        };
    }, [channel]);

    // --- History Management ---
    const saveHistory = (newElements) => {
        const currentHistory = history.slice(0, historyStep + 1);
        const nextHistory = [...currentHistory, newElements];
        setHistory(nextHistory);
        setHistoryStep(nextHistory.length - 1);
    };

    const undo = () => {
        if (historyStep > 0) {
            const prevStep = historyStep - 1;
            setHistoryStep(prevStep);
            setElements(history[prevStep]);
        } else if (historyStep === 0) {
            setHistoryStep(-1);
            setElements([]);
        }
    };

    const redo = () => {
        if (historyStep < history.length - 1) {
            const nextStep = historyStep + 1;
            setHistoryStep(nextStep);
            setElements(history[nextStep]);
        }
    };


    // --- Rendering ---
    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        // Clear Screen
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Save context for transform
        ctx.save();
        // Apply Camera Transform
        ctx.translate(camera.x, camera.y);
        ctx.scale(camera.z, camera.z);

        // Draw Elements
        // console.log("Rendering Elements Count:", elements.length);
        elements.forEach((element) => {
            // If we are editing this existing text, don't draw it on canvas so we don't see double
            // if (textInput.isOpen && textInput.id === element.id) return; 
            drawElement(ctx, element);
        });

        // Draw Selection Box
        if (selectedElement) {
            // Don't draw selection box if we are currently writing OR currently drawing
            if (!textInput.isOpen && action !== "drawing") {
                drawSelectionBox(ctx, selectedElement);
            }
        }

        ctx.restore();

    }, [elements, action, selectedElement, historyStep, dimensions, textInput, camera]);

    // Handle Wheel Zoom and Spacebar
    useEffect(() => {
        const handleWheel = (e) => {
            e.preventDefault();
            if (e.ctrlKey || e.metaKey) {
                const zoom = e.deltaY > 0 ? 0.9 : 1.1;
                setCamera(prev => {
                    // Zoom towards pointer
                    const rect = containerRef.current.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left;
                    const mouseY = e.clientY - rect.top;

                    // World coordinates before zoom
                    const worldX = (mouseX - prev.x) / prev.z;
                    const worldY = (mouseY - prev.y) / prev.z;

                    const newZ = Math.min(Math.max(0.1, prev.z * zoom), 5); // Limit zoom 0.1x to 5x

                    // Calculate new offsets to keep mouse at same world position
                    const newX = mouseX - worldX * newZ;
                    const newY = mouseY - worldY * newZ;

                    return { ...prev, z: newZ, x: newX, y: newY };
                });
            } else {
                // Pan with wheel (if no ctrl)
                setCamera(prev => ({
                    ...prev,
                    x: prev.x - e.deltaX,
                    y: prev.y - e.deltaY
                }));
            }
        };

        const handleKeyDown = (e) => {
            if (e.code === "Space") {
                setIsSpacePressed(true);
            }
        };

        const handleKeyUp = (e) => {
            if (e.code === "Space") {
                setIsSpacePressed(false);
            }
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener("wheel", handleWheel, { passive: false });
        }
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            if (container) {
                container.removeEventListener("wheel", handleWheel);
            }
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    const drawElement = (ctx, element) => {
        const { x1, y1, x2, y2, type, color, lineWidth, points } = element;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (type === ElementType.Rectangle) {
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        } else if (type === ElementType.Circle) {
            ctx.beginPath();
            // Ellipse logic
            const rx = Math.abs(x2 - x1) / 2;
            const ry = Math.abs(y2 - y1) / 2;
            const cx = Math.min(x1, x2) + rx;
            const cy = Math.min(y1, y2) + ry;
            ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
            ctx.stroke();
        } else if (type === ElementType.Line) {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        } else if (type === ElementType.Pencil) {
            if (points && points.length > 0) {
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                points.forEach((p) => ctx.lineTo(p.x, p.y));
                ctx.stroke();
            }
        } else if (type === ElementType.Highlighter) {
            if (points && points.length > 0) {
                ctx.save();
                ctx.globalAlpha = 0.4;
                ctx.strokeStyle = color;
                ctx.lineWidth = lineWidth * 4; // Thicker than pen
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                points.forEach((p) => ctx.lineTo(p.x, p.y));
                ctx.stroke();
                ctx.restore();
            }
        } else if (type === ElementType.Eraser) {
            if (points && points.length > 0) {
                ctx.save();
                ctx.strokeStyle = "#f8fafc"; // Eraser matches bg-slate-50
                ctx.lineWidth = lineWidth * 5; // Eraser is thicker
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                points.forEach((p) => ctx.lineTo(p.x, p.y));
                ctx.stroke();
                ctx.restore();
            }
        } else if (type === ElementType.Text) {
            ctx.textBaseline = "top";
            ctx.font = "24px sans-serif";
            ctx.fillStyle = element.color || "#000000";

            const lines = element.text.split("\n");
            lines.forEach((line, i) => {
                ctx.fillText(line, x1, y1 + (i * 28));
            });
        } else if (type === ElementType.Image) {
            const img = imageCache.current.get(element.imgData);
            if (img) {
                ctx.drawImage(img, x1, y1, x2 - x1, y2 - y1);
            } else {
                // Load and cache
                const newImg = new Image();
                newImg.src = element.imgData;
                newImg.onload = () => {
                    imageCache.current.set(element.imgData, newImg);
                    setElements(prev => [...prev]);
                };
            }
        }
    };

    const drawSelectionBox = (ctx, element) => {
        const { x1, y1, x2, y2, type } = element;

        // Calculate Bounds
        let minX, minY, maxX, maxY;

        if (type === ElementType.Pencil || type === ElementType.Eraser || type === ElementType.Highlighter) {
            minX = Math.min(...element.points.map(p => p.x));
            maxX = Math.max(...element.points.map(p => p.x));
            minY = Math.min(...element.points.map(p => p.y));
            maxY = Math.max(...element.points.map(p => p.y));
        } else {
            minX = Math.min(x1, x2);
            maxX = Math.max(x1, x2);
            minY = Math.min(y1, y2);
            maxY = Math.max(y1, y2);
        }

        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        const padding = 4;
        ctx.strokeRect(minX - padding, minY - padding, (maxX - minX) + 2 * padding, (maxY - minY) + 2 * padding);
        ctx.setLineDash([]);

        // Handles
        ctx.fillStyle = "white";
        ctx.strokeStyle = "#3b82f6";
        const handleSize = 8;

        const drawHandle = (x, y) => {
            ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
            ctx.strokeRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
        };

        if (type === ElementType.Line) {
            drawHandle(x1, y1);
            drawHandle(x2, y2);
        } else {
            drawHandle(minX - padding, minY - padding); // tl
            drawHandle(maxX + padding, minY - padding); // tr
            drawHandle(maxX + padding, maxY + padding); // br
            drawHandle(minX - padding, maxY + padding); // bl
        }
    };


    // --- Input Handlers ---
    const handleMouseDown = (event) => {
        // If clicking on textarea, ignore canvas events
        if (event.target.tagName === 'TEXTAREA') return;

        // If already writing, commit text first
        if (action === "writing" && textInput.isOpen) {
            console.log("handleMouseDown: Committing text via click");
            handleTextInputCommit();
            return;
        }

        // Check for Panning (Middle Mouse or Spacebar + Left Mouse)
        if (event.button === 1 || (isSpacePressed && event.button === 0)) {
            setAction("panning");
            return;
        }

        const { clientX, clientY } = event;
        const { x, y } = screenToWorld(clientX, clientY);

        if (tool === ElementType.Selection) {
            const element = getElementAtPosition(x, y, elements);
            if (element) {
                if (element.type === ElementType.Pencil || element.type === ElementType.Eraser || element.type === ElementType.Highlighter) {
                    const xOffsets = element.points.map((p) => p.x - x);
                    const yOffsets = element.points.map((p) => p.y - y);
                    setSelectedElement({ ...element, xOffsets, yOffsets });
                } else {
                    const offsetX = x - element.x1;
                    const offsetY = y - element.y1;
                    setSelectedElement({ ...element, offsetX, offsetY });
                }
                setElements((prev) => prev); // Force update to bring to front if handling layers in draw order

                if (element.position === "inside") {
                    setAction("moving");
                } else {
                    setAction("resizing");
                }
            } else {
                setSelectedElement(null);
            }
        } else if (tool === ElementType.Text) {
            // New Screen-Space Logic
            if (textInput.isOpen) {
                return;
            }

            setTextInput({
                isOpen: true,
                x: clientX,
                y: clientY,
                text: "",
                color: color
            });
            setAction("writing");
        } else {
            const id = Date.now();
            let newElement;

            if (tool === ElementType.Pencil || tool === ElementType.Eraser || tool === ElementType.Highlighter) {
                newElement = {
                    id, type: tool,
                    points: [{ x, y }],
                    color: tool === ElementType.Highlighter ? highlighterColor : color,
                    lineWidth: tool === ElementType.Highlighter ? 10 : lineWidth, // Defaults
                };
            } else {
                newElement = {
                    id, type: tool,
                    x1: x, y1: y, x2: x, y2: y,
                    color, lineWidth
                };
            }

            setElements([...elements, newElement]);
            setSelectedElement(newElement);
            setAction("drawing");
        }
    };

    const handleMouseMove = (event) => {
        const { clientX, clientY } = event;

        // Panning Logic
        if (action === "panning") {
            setCamera(prev => ({
                ...prev,
                x: prev.x + event.movementX,
                y: prev.y + event.movementY
            }));
            return;
        }

        const { x, y } = screenToWorld(clientX, clientY);

        if (tool === ElementType.Selection) {
            const element = getElementAtPosition(x, y, elements);
            event.target.style.cursor = isSpacePressed ? "grab" : (element ? cursorForPosition(element.position) : "default");
        }

        if (action === "drawing") {
            const index = elements.length - 1;
            // Guard check - element might not exist
            if (index < 0 || !elements[index]) return;

            const { x1, y1 } = elements[index];

            if (tool === ElementType.Pencil || tool === ElementType.Eraser || tool === ElementType.Highlighter) {
                updateElement(index, { points: [...elements[index].points, { x, y }] });
            } else {
                updateElement(index, { x1, y1, x2: x, y2: y });
            }

        } else if (action === "moving") {
            if (!selectedElement) return;
            if (selectedElement.type === ElementType.Pencil || selectedElement.type === ElementType.Eraser || selectedElement.type === ElementType.Highlighter) {
                const newPoints = selectedElement.points.map((_, i) => ({
                    x: x + selectedElement.xOffsets[i],
                    y: y + selectedElement.yOffsets[i],
                }));
                const index = elements.findIndex((el) => el.id === selectedElement.id);
                if (index >= 0) updateElement(index, { points: newPoints });
            } else {
                const { id, x1, x2, y1, y2, type, offsetX, offsetY } = selectedElement;
                const width = x2 - x1;
                const height = y2 - y1;
                const newX1 = x - offsetX;
                const newY1 = y - offsetY;

                const index = elements.findIndex((el) => el.id === id);
                if (index >= 0) updateElement(index, { x1: newX1, y1: newY1, x2: newX1 + width, y2: newY1 + height });
            }
        } else if (action === "resizing") {
            if (!selectedElement) return;
            const { id, type, position, ...coordinates } = selectedElement;
            const { x1, y1, x2, y2 } = resizedCoordinates(x, y, position, coordinates);
            const index = elements.findIndex((el) => el.id === id);
            if (index >= 0) updateElement(index, { x1, y1, x2, y2 });
        }
    };

    const handleMouseUp = () => {
        if (action === "drawing" || action === "moving" || action === "resizing") {
            saveHistory(elements);
            // Broadcast the completed element
            if (selectedElement) {
                const finalElement = elements.find(el => el.id === selectedElement.id);
                if (finalElement) {
                    broadcastElement(finalElement, action === "drawing" ? 'add' : 'update');
                }
            }
        }
        if (action !== "writing") {
            setAction("none");
        }
        // Don't clear selectedElement here so resizing handles stay visible
    };

    const updateElement = (index, newItem) => {
        if (index < 0 || index >= elements.length) return;
        const elementsCopy = [...elements];
        elementsCopy[index] = { ...elementsCopy[index], ...newItem };
        setElements(elementsCopy);
    };

    // --- Copy / Paste Support ---
    useEffect(() => {
        const handlePaste = async (e) => {
            e.preventDefault();
            const items = e.clipboardData?.items;
            if (!items) return;

            const rect = canvasRef.current.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            for (const item of items) {
                if (item.type.indexOf("image") !== -1) {
                    const blob = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                            const id = Date.now();
                            // Scale down if too big
                            let w = img.width;
                            let h = img.height;
                            if (w > 500) {
                                const ratio = 500 / w;
                                w = 500;
                                h = h * ratio;
                            }

                            const newEl = {
                                id, type: ElementType.Image,
                                x1: centerX - w / 2, y1: centerY - h / 2,
                                x2: centerX + w / 2, y2: centerY + h / 2,
                                imgData: event.target.result,
                                color: "transparent", lineWidth: 0
                            };
                            const newElements = [...elements, newEl];
                            setElements(newElements);
                            saveHistory(newElements);
                        }
                        img.src = event.target.result;
                    };
                    reader.readAsDataURL(blob);
                } else if (item.type.indexOf("text/plain") !== -1) {
                    item.getAsString((text) => {
                        if (text) {
                            const id = Date.now();
                            const newEl = {
                                id, type: ElementType.Text,
                                x1: centerX, y1: centerY,
                                x2: centerX + 200, y2: centerY + 50,
                                text: text,
                                color: color, lineWidth: 1
                            };
                            const newElements = [...elements, newEl];
                            setElements(newElements);
                            saveHistory(newElements);
                        }
                    });
                }
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, [elements, color, history]); // Deps needed for state updates

    // Text Area Blur
    // --- New Text Input Handler (Commit) ---
    const handleTextInputCommit = () => {
        if (!textInput.text.trim()) {
            setTextInput({ ...textInput, isOpen: false });
            setAction("none");
            return;
        }

        try {
            const coords = screenToWorld(textInput.x, textInput.y);
            if (isNaN(coords.x) || isNaN(coords.y)) {
                console.error("Invalid world coordinates:", coords);
                return;
            }
            const { x, y } = coords;
            console.log("Commit Coords:", { screenX: textInput.x, screenY: textInput.y, worldX: x, worldY: y });

            const id = Date.now();
            const newElement = {
                id,
                type: ElementType.Text,
                x1: x, y1: y, // Point where user clicked
                x2: x + 200, y2: y + 50,
                text: textInput.text,
                color: textInput.color,
                lineWidth: 1
            };

            console.log("Adding new text element:", newElement);

            setElements(prev => {
                const next = [...prev, newElement];
                saveHistory(next);
                return next;
            });

            broadcastElement(newElement, 'add');

            setTextInput({ ...textInput, isOpen: false, text: "" });
            setAction("none");
            setTool(ElementType.Selection);
            setSelectedElement(newElement);
        } catch (err) {
            console.error("Error in handleTextInputCommit:", err);
        }
    };

    const clearCanvas = () => {
        setElements([]);
        saveHistory([]);
        // Broadcast clear event
        broadcastClear();
    };

    const downloadCanvas = () => {
        const canvas = canvasRef.current;
        const link = document.createElement("a");
        link.download = `whiteboard-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    };

    const toggleTool = (t) => {
        setTool(t);
        setSelectedElement(null);
        if (t !== ElementType.Selection) {
            // Deselect when picking new drawing tool
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 relative overflow-hidden" tabIndex={0} style={{ outline: "none" }}>

            {/* Canvas Area */}
            <div className="absolute inset-0 z-0 bg-transparent overflow-hidden" ref={containerRef} style={{ cursor: isSpacePressed ? "grab" : "crosshair" }}>
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full block touch-none"
                    width={dimensions.width}
                    height={dimensions.height}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                />

                {/* New Screen-Space Text Input Overlay */}
                {textInput.isOpen && (
                    <div
                        style={{
                            position: "fixed",
                            top: textInput.y,
                            left: textInput.x,
                            zIndex: 99999,
                            transform: "translate(-10px, -10px)" // Slight offset to align cursor
                        }}
                    >
                        <textarea
                            autoFocus
                            value={textInput.text}
                            placeholder="Type here..."
                            onChange={(e) => {
                                setTextInput({ ...textInput, text: e.target.value });
                            }}
                            onBlur={handleTextInputCommit}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleTextInputCommit();
                                }
                            }}
                            className="textarea textarea-bordered textarea-primary shadow-xl text-lg min-w-[200px] min-h-[60px]"
                            style={{
                                color: textInput.color,
                                border: "2px solid #2563eb",
                                background: "white",
                                pointerEvents: "auto",
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                        />
                    </div>
                )}

                {/* Eraser Cursor */}
                {tool === ElementType.Eraser && !isSpacePressed && (
                    <div
                        className="pointer-events-none fixed border border-gray-500 bg-white/20 z-[100]"
                        style={{
                            width: lineWidth * 5,
                            height: lineWidth * 5,
                            transform: 'translate(-50%, -50%)',
                        }}
                        ref={(el) => {
                            if (el) {
                                const moveCursor = (e) => {
                                    el.style.left = e.clientX + 'px';
                                    el.style.top = e.clientY + 'px';
                                };
                                window.addEventListener('mousemove', moveCursor);
                                return () => window.removeEventListener('mousemove', moveCursor);
                            }
                        }}
                    ></div>
                )}

                {/* Note for users */}
                {elements.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                        <div className="text-center">
                            <p className="text-4xl font-bold mb-2">Infinite Canvas</p>
                            <p>Draw, Type, or Paste Images</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Toolbar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-4">
                <div className="bg-white/90 backdrop-blur-md shadow-lg border border-gray-200/50 rounded-2xl p-2 flex items-center gap-2">
                    <div className="join  p-1 rounded-xl gap-1">
                        <button
                            className={`btn btn-sm btn-ghost btn-square ${tool === ElementType.Selection ? "bg-indigo-100 text-indigo-600" : ""}`}
                            onClick={() => toggleTool(ElementType.Selection)} title="Select (V)"
                        >
                            <MousePointer2Icon className="w-5 h-5" />
                        </button>
                        <button
                            className={`btn btn-sm btn-ghost btn-square ${tool === ElementType.Pencil ? "bg-indigo-100 text-indigo-600" : ""}`}
                            onClick={() => toggleTool(ElementType.Pencil)} title="Pencil (P)"
                        >
                            <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                            className={`btn btn-sm btn-ghost btn-square ${tool === ElementType.Highlighter ? "bg-indigo-100 text-indigo-600" : ""}`}
                            onClick={() => toggleTool(ElementType.Highlighter)} title="Highlighter (H)"
                        >
                            <HighlighterIcon className="w-5 h-5" />
                        </button>
                        <button
                            className={`btn btn-sm btn-ghost btn-square ${tool === ElementType.Eraser ? "bg-indigo-100 text-indigo-600" : ""}`}
                            onClick={() => toggleTool(ElementType.Eraser)} title="Eraser (E)"
                        >
                            <EraserIcon className="w-5 h-5" />
                        </button>
                        <div className="w-px h-6 bg-gray-200 mx-1 self-center"></div>
                        <button
                            className={`btn btn-sm btn-ghost btn-square ${tool === ElementType.Rectangle ? "bg-indigo-100 text-indigo-600" : ""}`}
                            onClick={() => toggleTool(ElementType.Rectangle)} title="Rectangle (R)"
                        >
                            <SquareIcon className="w-5 h-5" />
                        </button>
                        <button
                            className={`btn btn-sm btn-ghost btn-square ${tool === ElementType.Circle ? "bg-indigo-100 text-indigo-600" : ""}`}
                            onClick={() => toggleTool(ElementType.Circle)} title="Circle (C)"
                        >
                            <CircleIcon className="w-5 h-5" />
                        </button>
                        <button
                            className={`btn btn-sm btn-ghost btn-square ${tool === ElementType.Line ? "bg-indigo-100 text-indigo-600" : ""}`}
                            onClick={() => toggleTool(ElementType.Line)} title="Line (L)"
                        >
                            <MinusIcon className="w-5 h-5 transform -rotate-45" />
                        </button>
                        <button
                            className={`btn btn-sm btn-ghost btn-square ${tool === ElementType.Text ? "bg-indigo-100 text-indigo-600" : ""}`}
                            onClick={() => toggleTool(ElementType.Text)} title="Text (T)"
                        >
                            <TypeIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="w-px h-8 bg-gray-200 mx-1"></div>

                    {/* Style Controls */}
                    <div className="flex items-center gap-3 px-2">
                        {tool === ElementType.Highlighter ? (
                            <input
                                type="color"
                                value={highlighterColor}
                                onChange={(e) => setHighlighterColor(e.target.value)}
                                className="w-6 h-6 rounded-full border border-gray-200 cursor-pointer overflow-hidden p-0"
                            />
                        ) : (
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="w-6 h-6 rounded-full border border-gray-200 cursor-pointer overflow-hidden p-0"
                            />
                        )}

                        <input
                            type="range"
                            min="1"
                            max="20"
                            step="1"
                            value={lineWidth}
                            onChange={(e) => setLineWidth(parseInt(e.target.value))}
                            className="range range-xs range-primary w-20"
                            title="Stroke Width"
                        />
                    </div>

                    <div className="w-px h-8 bg-gray-200 mx-1"></div>

                    <div className="flex items-center gap-1">
                        <button className="btn btn-sm btn-ghost btn-circle" onClick={undo} title="Undo (Cmd+Z)">
                            <UndoIcon className="w-4 h-4" />
                        </button>
                        <button className="btn btn-sm btn-ghost btn-circle" onClick={redo} title="Redo (Cmd+Y)">
                            <RedoIcon className="w-4 h-4" />
                        </button>
                        {isHost && (
                            <button className="btn btn-sm btn-ghost btn-circle text-error" onClick={clearCanvas} title="Clear Canvas">
                                <Trash2Icon className="w-4 h-4" />
                            </button>
                        )}
                        <button className="btn btn-sm btn-ghost btn-circle" onClick={downloadCanvas} title="Save Image">
                            <DownloadIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
};
export default DrawingBoard;
